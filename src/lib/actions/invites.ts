"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { randomBytes } from "crypto";
import { z } from "zod";
import {
  hashPassword,
  requireCaptain,
  requireSuperAdmin,
} from "@/lib/auth/session";
import { inviteExpiryDays } from "@/lib/config";
import { db } from "@/lib/db/client";
import { teamMembers, teams, userInvites, users } from "@/lib/db/schema";
import { isValidCpf, onlyDigits } from "@/lib/utils";
import { revalidatePath } from "next/cache";

const captainSchema = z.object({
  name: z.string().min(3).max(160),
  email: z.string().email(),
  cpf: z.string().min(11),
  password: z.string().min(8),
  phone: z.string().optional(),
});

const athleteSchema = z.object({
  name: z.string().min(3).max(160),
  email: z.string().email(),
  cpf: z.string().min(11),
  password: z.string().min(8),
  phone: z.string().optional(),
  teamId: z.string().uuid(),
});

async function assertCaptainTeam(captainId: string, teamId: string) {
  const [team] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.captainId, captainId)))
    .limit(1);
  if (!team || team.status !== "active") {
    throw new Error("Equipe inválida");
  }
  return team;
}

async function addActiveMember(teamId: string, userId: string, maxMembers: number) {
  const [{ memberCount }] = await db
    .select({ memberCount: sql<number>`count(*)`.mapWith(Number) })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.active, true)));

  const [existing] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .limit(1);

  if (existing?.active) return { ok: true as const };
  if (!existing && memberCount >= maxMembers) {
    return { error: "Equipe lotada" };
  }

  if (!existing) {
    await db.insert(teamMembers).values({ teamId, userId, active: true });
  } else {
    await db
      .update(teamMembers)
      .set({ active: true, leftAt: null, joinedAt: new Date() })
      .where(eq(teamMembers.id, existing.id));
  }
  return { ok: true as const };
}

export async function createCaptainAction(formData: FormData) {
  await requireSuperAdmin();

  const parsed = captainSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    cpf: formData.get("cpf"),
    password: formData.get("password"),
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) return { error: "Dados inválidos" };

  const cpf = onlyDigits(parsed.data.cpf);
  if (!isValidCpf(cpf) && cpf !== "00000000000") {
    return { error: "CPF inválido" };
  }

  const email = parsed.data.email.toLowerCase();
  const [existingEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existingEmail) return { error: "E-mail já cadastrado" };

  const [existingCpf] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.cpf, cpf))
    .limit(1);
  if (existingCpf) return { error: "CPF já cadastrado" };

  await db.insert(users).values({
    name: parsed.data.name,
    email,
    cpf,
    passwordHash: await hashPassword(parsed.data.password),
    phone: parsed.data.phone,
    role: "captain",
  });

  revalidatePath("/admin/capitaes");
  return { ok: true as const };
}

export async function listCaptains() {
  await requireSuperAdmin();
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.role, "captain"))
    .orderBy(desc(users.createdAt));
}

/** Capitão cadastra atleta diretamente (já entra na equipe). */
export async function createAthleteByCaptainAction(formData: FormData) {
  const captain = await requireCaptain();

  const parsed = athleteSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    cpf: formData.get("cpf"),
    password: formData.get("password"),
    phone: formData.get("phone") || undefined,
    teamId: formData.get("teamId"),
  });
  if (!parsed.success) return { error: "Dados do atleta inválidos" };

  let team;
  try {
    team = await assertCaptainTeam(captain.id, parsed.data.teamId);
  } catch {
    return { error: "Selecione uma equipe da qual você é capitão" };
  }

  const cpf = onlyDigits(parsed.data.cpf);
  if (!isValidCpf(cpf) && cpf !== "00000000000") {
    return { error: "CPF inválido" };
  }

  const email = parsed.data.email.toLowerCase();
  const [existingEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existingEmail) return { error: "E-mail já cadastrado" };

  const [existingCpf] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.cpf, cpf))
    .limit(1);
  if (existingCpf) return { error: "CPF já cadastrado" };

  const [athlete] = await db
    .insert(users)
    .values({
      name: parsed.data.name,
      email,
      cpf,
      passwordHash: await hashPassword(parsed.data.password),
      phone: parsed.data.phone,
      role: "participant",
    })
    .returning({ id: users.id });

  const joined = await addActiveMember(team.id, athlete.id, team.maxMembers);
  if ("error" in joined && joined.error) {
    await db.delete(users).where(eq(users.id, athlete.id));
    return { error: joined.error };
  }

  revalidatePath("/capitao");
  revalidatePath("/capitao/convites");
  revalidatePath("/capitao/equipe");
  revalidatePath("/capitao/resultados");
  return { ok: true as const };
}

/** Link temporário de uso único para o atleta se cadastrar. */
export async function createParticipantInviteAction(formData: FormData) {
  const captain = await requireCaptain();

  const teamId = String(formData.get("teamId") ?? "").trim();
  const emailRaw = String(formData.get("email") ?? "").trim().toLowerCase();
  const note = String(formData.get("note") ?? "").trim() || null;
  const email = emailRaw || null;

  if (!teamId) return { error: "Selecione a equipe do atleta" };

  let team;
  try {
    team = await assertCaptainTeam(captain.id, teamId);
  } catch {
    return { error: "Equipe inválida" };
  }

  if (email) {
    const emailOk = z.string().email().safeParse(email);
    if (!emailOk.success) return { error: "E-mail inválido" };
  }

  const token = randomBytes(24).toString("hex");
  const days = inviteExpiryDays();
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await db.insert(userInvites).values({
    token,
    email,
    invitedBy: captain.id,
    teamId: team.id,
    role: "participant",
    status: "pending",
    note,
    expiresAt,
  });

  revalidatePath("/capitao");
  revalidatePath("/capitao/convites");
  return { ok: true as const, token };
}

export async function revokeInviteAction(formData: FormData) {
  const captain = await requireCaptain();
  const id = String(formData.get("inviteId") ?? "");
  if (!id) return { error: "Convite inválido" };

  const [invite] = await db
    .select()
    .from(userInvites)
    .where(
      and(eq(userInvites.id, id), eq(userInvites.invitedBy, captain.id)),
    )
    .limit(1);

  if (!invite) return { error: "Convite não encontrado" };
  if (invite.status !== "pending") return { error: "Convite já finalizado" };

  await db
    .update(userInvites)
    .set({ status: "revoked" })
    .where(eq(userInvites.id, id));

  revalidatePath("/capitao/convites");
  return { ok: true as const };
}

export async function listMyInvites() {
  const captain = await requireCaptain();
  return db
    .select()
    .from(userInvites)
    .where(eq(userInvites.invitedBy, captain.id))
    .orderBy(desc(userInvites.createdAt));
}

export async function listCaptainTeams() {
  const captain = await requireCaptain();
  return db
    .select()
    .from(teams)
    .where(and(eq(teams.captainId, captain.id), eq(teams.status, "active")))
    .orderBy(desc(teams.createdAt));
}

export async function getInviteByToken(token: string) {
  if (!token) return null;
  const [invite] = await db
    .select()
    .from(userInvites)
    .where(eq(userInvites.token, token))
    .limit(1);
  return invite ?? null;
}

export async function consumeInvite(token: string, userId: string) {
  const invite = await getInviteByToken(token);
  if (!invite) return { error: "Convite inválido" };
  if (invite.status !== "pending") {
    return { error: "Este link já foi usado e não serve mais" };
  }
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    await db
      .update(userInvites)
      .set({ status: "expired" })
      .where(eq(userInvites.id, invite.id));
    return { error: "Convite expirado. Peça um novo link ao capitão." };
  }

  await db
    .update(userInvites)
    .set({
      status: "accepted",
      usedAt: new Date(),
      usedByUserId: userId,
    })
    .where(eq(userInvites.id, invite.id));

  if (invite.teamId) {
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, invite.teamId))
      .limit(1);
    if (team) {
      await addActiveMember(team.id, userId, team.maxMembers);
    }
  }

  return { ok: true as const, invite };
}
