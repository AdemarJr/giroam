"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isAdminRole } from "@/lib/auth/roles";
import { hashPassword, requireAdmin, requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { isValidCpf, onlyDigits } from "@/lib/utils";
import {
  achievements,
  registrations,
  seasons,
  stages,
  stageResults,
  teams,
  teamMembers,
  tournaments,
  scoringTables,
  users,
} from "@/lib/db/schema";
import {
  computePreliminaryPoints,
  correctHomologatedResult,
  homologateStage,
} from "@/lib/scoring/homologate";
import { DEFAULT_SCORING_POSITIONS } from "@/lib/scoring/engine";

export async function createSeasonAction(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const year = Number(formData.get("year"));
  const startsAt = String(formData.get("startsAt"));
  const endsAt = String(formData.get("endsAt"));
  const regulation = String(formData.get("regulation") ?? "");

  if (!name || !year || !startsAt || !endsAt) {
    return { error: "Preencha todos os campos obrigatórios" };
  }

  await db.insert(seasons).values({
    name,
    year,
    startsAt,
    endsAt,
    regulation,
    status: "active",
  });

  revalidatePath("/admin");
  revalidatePath("/admin/temporadas");
  return { ok: true };
}

export async function closeSeasonAction(seasonId: string) {
  await requireAdmin();
  await db
    .update(seasons)
    .set({ status: "closed", updatedAt: new Date() })
    .where(eq(seasons.id, seasonId));
  revalidatePath("/admin/temporadas");
  return { ok: true };
}

export async function publishChampionsAction(seasonId: string) {
  await requireAdmin();
  await db
    .update(seasons)
    .set({ championsPublished: true, updatedAt: new Date() })
    .where(eq(seasons.id, seasonId));

  const { getIndividualRanking } = await import("@/lib/scoring/rankings");
  const ranking = await getIndividualRanking({ seasonId });
  for (const row of ranking.slice(0, 3)) {
    const [exists] = await db
      .select({ id: achievements.id })
      .from(achievements)
      .where(
        and(
          eq(achievements.userId, row.userId),
          eq(achievements.seasonId, seasonId),
          eq(achievements.code, `season_podium_${row.position}`),
        ),
      )
      .limit(1);
    if (exists) continue;
    await db.insert(achievements).values({
      userId: row.userId,
      seasonId,
      code: `season_podium_${row.position}`,
      title: `${row.position}º lugar da temporada`,
      description: `${row.points} pontos homologados`,
    });
  }

  revalidatePath(`/premiacao`);
  revalidatePath("/admin/temporadas");
  revalidatePath("/me");
  return { ok: true };
}

export async function ensureDefaultScoringTable() {
  const [existing] = await db.select().from(scoringTables).limit(1);
  if (existing) return existing.id;

  const [created] = await db
    .insert(scoringTables)
    .values({
      name: "Padrão GiroAm",
      positions: DEFAULT_SCORING_POSITIONS,
      finisherPoints: 10,
      participationPoints: 0,
      bonuses: {},
    })
    .returning();
  return created.id;
}

export async function createTournamentAction(formData: FormData) {
  await requireAdmin();

  const schema = z.object({
    name: z.string().min(3),
    seasonId: z.string().uuid(),
    description: z.string().optional(),
    regulation: z.string().optional(),
    modality: z.string().default("ciclismo"),
    startsAt: z.string(),
    endsAt: z.string(),
    maxParticipants: z.coerce.number().optional(),
    autoApprove: z.string().optional(),
    allowTeams: z.string().optional(),
  });

  const parsed = schema.safeParse({
    name: formData.get("name"),
    seasonId: formData.get("seasonId"),
    description: formData.get("description") || undefined,
    regulation: formData.get("regulation") || undefined,
    modality: formData.get("modality") || "ciclismo",
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    maxParticipants: formData.get("maxParticipants") || undefined,
    autoApprove: formData.get("autoApprove") || undefined,
    allowTeams: formData.get("allowTeams") || undefined,
  });

  if (!parsed.success) return { error: "Dados do torneio inválidos" };

  const scoringTableId = await ensureDefaultScoringTable();

  await db.insert(tournaments).values({
    name: parsed.data.name,
    seasonId: parsed.data.seasonId,
    scoringTableId,
    description: parsed.data.description,
    regulation: parsed.data.regulation,
    modality: parsed.data.modality,
    startsAt: parsed.data.startsAt,
    endsAt: parsed.data.endsAt,
    maxParticipants: parsed.data.maxParticipants,
    autoApproveRegistrations: parsed.data.autoApprove !== "false",
    allowTeams: parsed.data.allowTeams !== "false",
    status: "registration_open",
    registrationStartsAt: new Date(),
  });

  revalidatePath("/admin/torneios");
  revalidatePath("/torneios");
  return { ok: true };
}

export async function updateTournamentStatusAction(
  tournamentId: string,
  status: (typeof tournaments.$inferSelect)["status"],
) {
  await requireAdmin();
  await db
    .update(tournaments)
    .set({ status, updatedAt: new Date() })
    .where(eq(tournaments.id, tournamentId));
  revalidatePath("/admin/torneios");
  revalidatePath("/torneios");
  return { ok: true };
}

export async function createStageAction(formData: FormData) {
  await requireAdmin();
  const tournamentId = String(formData.get("tournamentId"));
  const name = String(formData.get("name") ?? "").trim();
  const number = Number(formData.get("number"));
  const eventDate = String(formData.get("eventDate"));
  const eventTime = String(formData.get("eventTime") ?? "");
  const location = String(formData.get("location") ?? "");
  const description = String(formData.get("description") ?? "");
  const distanceKm = String(formData.get("distanceKm") ?? "") || null;

  if (!tournamentId || !name || !number || !eventDate) {
    return { error: "Campos obrigatórios da etapa incompletos" };
  }

  await db.insert(stages).values({
    tournamentId,
    name,
    number,
    eventDate,
    eventTime: eventTime || null,
    location: location || null,
    description: description || null,
    distanceKm,
    status: "scheduled",
  });

  revalidatePath("/admin/etapas");
  return { ok: true };
}

export async function createTeamAction(formData: FormData) {
  const user = await requireUser(["admin", "captain", "super_admin"]);
  const tournamentId = String(formData.get("tournamentId"));
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "#1B7A4E");
  const description = String(formData.get("description") ?? "");
  const maxMembers = Number(formData.get("maxMembers") ?? 10);

  if (!tournamentId || !name) return { error: "Nome e torneio são obrigatórios" };

  let captainId: string;

  if (isAdminRole(user.role)) {
    const captainName = String(formData.get("captainName") ?? "").trim();
    const captainEmail = String(formData.get("captainEmail") ?? "")
      .toLowerCase()
      .trim();
    const captainCpf = onlyDigits(String(formData.get("captainCpf") ?? ""));
    const captainPassword = String(formData.get("captainPassword") ?? "");
    const captainPhone = String(formData.get("captainPhone") ?? "").trim() || null;

    if (!captainName || captainName.length < 3) {
      return { error: "Informe o nome do capitão" };
    }
    if (!captainEmail.includes("@")) {
      return { error: "E-mail do capitão inválido" };
    }
    if (!isValidCpf(captainCpf) && captainCpf !== "00000000000") {
      return { error: "CPF do capitão inválido" };
    }
    if (captainPassword.length < 8) {
      return { error: "Senha do capitão deve ter no mínimo 8 caracteres" };
    }

    const [existingEmail] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, captainEmail))
      .limit(1);
    if (existingEmail) return { error: "E-mail do capitão já cadastrado" };

    const [existingCpf] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.cpf, captainCpf))
      .limit(1);
    if (existingCpf) return { error: "CPF do capitão já cadastrado" };

    const [captain] = await db
      .insert(users)
      .values({
        name: captainName,
        email: captainEmail,
        cpf: captainCpf,
        passwordHash: await hashPassword(captainPassword),
        phone: captainPhone,
        role: "captain",
      })
      .returning({ id: users.id });

    captainId = captain.id;
  } else {
    captainId = user.id;
  }

  const [team] = await db
    .insert(teams)
    .values({
      tournamentId,
      name,
      color,
      description: description || null,
      maxMembers,
      captainId,
      status: "active",
    })
    .returning();

  await db.insert(teamMembers).values({
    teamId: team.id,
    userId: captainId,
    active: true,
  });

  revalidatePath("/admin/equipes");
  revalidatePath("/admin/capitaes");
  revalidatePath("/capitao");
  return { ok: true, teamId: team.id };
}

export async function registerForTournamentAction(formData: FormData) {
  const user = await requireUser();
  const tournamentId = String(formData.get("tournamentId"));
  let teamId = String(formData.get("teamId") ?? "").trim() || null;

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament) return { error: "Torneio não encontrado" };
  if (
    tournament.status !== "registration_open" &&
    tournament.status !== "in_progress"
  ) {
    return { error: "Inscrições não estão abertas" };
  }

  const now = new Date();
  if (tournament.registrationStartsAt && now < tournament.registrationStartsAt) {
    return { error: "Inscrições ainda não abriram" };
  }
  if (tournament.registrationEndsAt && now > tournament.registrationEndsAt) {
    return { error: "Prazo de inscrição encerrado" };
  }

  const [dup] = await db
    .select({ id: registrations.id })
    .from(registrations)
    .where(
      and(
        eq(registrations.tournamentId, tournamentId),
        eq(registrations.userId, user.id),
        sql`${registrations.status} in ('pending','approved')`,
      ),
    )
    .limit(1);

  if (dup) return { error: "Você já está inscrito neste torneio" };

  if (tournament.maxParticipants) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(registrations)
      .where(
        and(
          eq(registrations.tournamentId, tournamentId),
          sql`${registrations.status} in ('pending','approved')`,
        ),
      );
    if (count >= tournament.maxParticipants) {
      return { error: "Limite de participantes atingido" };
    }
  }

  if (!user.cpf) return { error: "CPF ausente na conta" };

  if (teamId) {
    if (!tournament.allowTeams) {
      return { error: "Este torneio não permite equipes" };
    }
    const [team] = await db
      .select()
      .from(teams)
      .where(and(eq(teams.id, teamId), eq(teams.tournamentId, tournamentId)))
      .limit(1);
    if (!team || team.status !== "active") {
      return { error: "Equipe inválida para este torneio" };
    }

    const [{ memberCount }] = await db
      .select({ memberCount: sql<number>`count(*)`.mapWith(Number) })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.active, true)));

    const alreadyMember = await db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, user.id),
          eq(teamMembers.active, true),
        ),
      )
      .limit(1);

    if (!alreadyMember.length && memberCount >= team.maxMembers) {
      return { error: "Equipe lotada" };
    }
  } else {
    teamId = null;
  }

  const status = tournament.autoApproveRegistrations ? "approved" : "pending";

  await db.insert(registrations).values({
    tournamentId,
    userId: user.id,
    teamId,
    status,
  });

  if (teamId && status === "approved") {
    const [existingMember] = await db
      .select({ id: teamMembers.id, active: teamMembers.active })
      .from(teamMembers)
      .where(
        and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id)),
      )
      .limit(1);

    if (!existingMember) {
      await db.insert(teamMembers).values({
        teamId,
        userId: user.id,
        active: true,
      });
    } else if (!existingMember.active) {
      await db
        .update(teamMembers)
        .set({ active: true, leftAt: null, joinedAt: new Date() })
        .where(eq(teamMembers.id, existingMember.id));
    }
  }

  revalidatePath(`/torneios/${tournamentId}`);
  revalidatePath("/me");
  revalidatePath("/capitao");
  return { ok: true };
}

export async function cancelRegistrationAction(registrationId: string) {
  const user = await requireUser();
  const [reg] = await db
    .select()
    .from(registrations)
    .where(eq(registrations.id, registrationId))
    .limit(1);

  if (!reg) return { error: "Inscrição não encontrada" };
  if (reg.userId !== user.id && !isAdminRole(user.role)) {
    return { error: "Sem permissão" };
  }

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, reg.tournamentId))
    .limit(1);

  if (
    tournament &&
    tournament.registrationEndsAt &&
    new Date() > tournament.registrationEndsAt &&
    !isAdminRole(user.role)
  ) {
    return { error: "Prazo de cancelamento encerrado" };
  }

  await db
    .update(registrations)
    .set({
      status: "cancelled",
      cancelledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(registrations.id, registrationId));

  revalidatePath("/me");
  return { ok: true };
}

export async function reviewRegistrationAction(
  registrationId: string,
  status: "approved" | "rejected",
) {
  await requireAdmin();
  const [reg] = await db
    .select()
    .from(registrations)
    .where(eq(registrations.id, registrationId))
    .limit(1);
  if (!reg) return { error: "Inscrição não encontrada" };

  await db
    .update(registrations)
    .set({ status, updatedAt: new Date() })
    .where(eq(registrations.id, registrationId));

  if (status === "approved" && reg.teamId) {
    const [existing] = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, reg.teamId),
          eq(teamMembers.userId, reg.userId),
        ),
      )
      .limit(1);
    if (!existing) {
      await db.insert(teamMembers).values({
        teamId: reg.teamId,
        userId: reg.userId,
        active: true,
      });
    } else if (!existing.active) {
      await db
        .update(teamMembers)
        .set({ active: true, leftAt: null, joinedAt: new Date() })
        .where(eq(teamMembers.id, existing.id));
    }
  }

  revalidatePath("/admin/inscricoes");
  revalidatePath("/capitao");
  return { ok: true };
}

export async function saveArrivalBoardAction(input: {
  stageId: string;
  entries: Array<{
    registrationId: string;
    userId: string;
    teamId: string | null;
    place: number | null;
    finishTime?: string | null;
    status: "finished" | "dns" | "dnf" | "dsq" | "absent";
    isTie?: boolean;
  }>;
}) {
  await requireAdmin();
  const { stageId, entries } = input;

  const [stage] = await db.select().from(stages).where(eq(stages.id, stageId)).limit(1);
  if (!stage) return { error: "Etapa não encontrada" };
  if (stage.status === "homologated") {
    return { error: "Etapa homologada — use correção com justificativa" };
  }

  for (const entry of entries) {
    const [existing] = await db
      .select()
      .from(stageResults)
      .where(
        and(
          eq(stageResults.stageId, stageId),
          eq(stageResults.userId, entry.userId),
        ),
      )
      .limit(1);

    if (existing) {
      if (existing.locked) continue;
      await db
        .update(stageResults)
        .set({
          place: entry.place,
          finishTime: entry.finishTime ?? null,
          status: entry.status,
          isTie: entry.isTie ?? false,
          teamId: entry.teamId,
          updatedAt: new Date(),
        })
        .where(eq(stageResults.id, existing.id));
    } else {
      await db.insert(stageResults).values({
        stageId,
        registrationId: entry.registrationId,
        userId: entry.userId,
        teamId: entry.teamId,
        place: entry.place,
        finishTime: entry.finishTime ?? null,
        status: entry.status,
        isTie: entry.isTie ?? false,
      });
    }
  }

  await db
    .update(stages)
    .set({ status: "awaiting_results", updatedAt: new Date() })
    .where(eq(stages.id, stageId));

  try {
    await computePreliminaryPoints(stageId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro no cálculo" };
  }

  revalidatePath(`/admin/chegada/${stageId}`);
  revalidatePath("/admin/homologacao");
  return { ok: true };
}

export async function homologateStageAction(stageId: string) {
  const admin = await requireAdmin();
  try {
    await computePreliminaryPoints(stageId);
    await homologateStage({ stageId, actorId: admin.id });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Falha na homologação" };
  }
  revalidatePath("/admin/homologacao");
  revalidatePath("/rankings");
  return { ok: true };
}

export async function correctResultAction(formData: FormData) {
  const admin = await requireAdmin();
  const stageResultId = String(formData.get("stageResultId"));
  const justification = String(formData.get("justification") ?? "");
  const placeRaw = formData.get("place");
  const status = String(formData.get("status") ?? "finished") as
    | "finished"
    | "dns"
    | "dnf"
    | "dsq"
    | "absent";

  try {
    await correctHomologatedResult({
      stageResultId,
      actorId: admin.id,
      place: placeRaw === "" || placeRaw == null ? null : Number(placeRaw),
      status,
      justification,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Falha na correção" };
  }

  revalidatePath("/admin/homologacao");
  revalidatePath("/rankings");
  return { ok: true };
}

export async function getAdminStats() {
  await requireAdmin();
  const [tournamentCount] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(tournaments)
    .where(sql`${tournaments.status} in ('registration_open','in_progress')`);
  const [seasonCount] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(seasons);
  const [registrationCount] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(registrations)
    .where(sql`${registrations.status} in ('pending','approved')`);
  const [teamCount] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(teams)
    .where(eq(teams.status, "active"));
  const [stageCount] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(stages)
    .where(eq(stages.status, "homologated"));
  const [pendingHomologation] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(stages)
    .where(eq(stages.status, "awaiting_results"));

  const upcoming = await db
    .select()
    .from(stages)
    .where(sql`${stages.status} in ('scheduled','open')`)
    .orderBy(stages.eventDate)
    .limit(5);

  return {
    tournamentsActive: tournamentCount.count,
    seasons: seasonCount.count,
    registrations: registrationCount.count,
    teams: teamCount.count,
    stagesDone: stageCount.count,
    pendingHomologation: pendingHomologation.count,
    upcoming,
  };
}

export async function listRecentTournaments() {
  return db.select().from(tournaments).orderBy(desc(tournaments.createdAt)).limit(12);
}
