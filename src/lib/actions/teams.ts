"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireCaptain, requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import {
  teamJoinRequests,
  teamMembers,
  teams,
  users,
} from "@/lib/db/schema";

async function assertCaptainOfTeam(captainId: string, teamId: string) {
  const [team] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.captainId, captainId)))
    .limit(1);
  if (!team) throw new Error("Equipe não encontrada ou sem permissão");
  return team;
}

export async function requestJoinTeamAction(formData: FormData) {
  const user = await requireUser();
  const teamId = String(formData.get("teamId") ?? "");
  if (!teamId) return { error: "Equipe inválida" };

  const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  if (!team || team.status !== "active") return { error: "Equipe indisponível" };

  const [member] = await db
    .select()
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, user.id),
        eq(teamMembers.active, true),
      ),
    )
    .limit(1);
  if (member) return { error: "Você já faz parte desta equipe" };

  const [pending] = await db
    .select()
    .from(teamJoinRequests)
    .where(
      and(
        eq(teamJoinRequests.teamId, teamId),
        eq(teamJoinRequests.userId, user.id),
        eq(teamJoinRequests.status, "pending"),
      ),
    )
    .limit(1);
  if (pending) return { error: "Solicitação já enviada" };

  await db.insert(teamJoinRequests).values({
    teamId,
    userId: user.id,
    status: "pending",
    invitedBy: null,
  });

  revalidatePath("/capitao");
  revalidatePath(`/torneios/${team.tournamentId}`);
  return { ok: true as const };
}

export async function resolveJoinRequestAction(formData: FormData) {
  const captain = await requireCaptain();
  const requestId = String(formData.get("requestId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!requestId || !["approved", "rejected"].includes(decision)) {
    return { error: "Pedido inválido" };
  }

  const [req] = await db
    .select()
    .from(teamJoinRequests)
    .where(eq(teamJoinRequests.id, requestId))
    .limit(1);
  if (!req || req.status !== "pending") return { error: "Pedido não encontrado" };

  const team = await assertCaptainOfTeam(captain.id, req.teamId);

  if (decision === "approved") {
    const [{ memberCount }] = await db
      .select({ memberCount: sql<number>`count(*)`.mapWith(Number) })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.active, true)));
    if (memberCount >= team.maxMembers) {
      return { error: "Equipe lotada" };
    }

    const [existing] = await db
      .select()
      .from(teamMembers)
      .where(
        and(eq(teamMembers.teamId, team.id), eq(teamMembers.userId, req.userId)),
      )
      .limit(1);

    if (!existing) {
      await db.insert(teamMembers).values({
        teamId: team.id,
        userId: req.userId,
        active: true,
      });
    } else if (!existing.active) {
      await db
        .update(teamMembers)
        .set({ active: true, leftAt: null, joinedAt: new Date() })
        .where(eq(teamMembers.id, existing.id));
    }
  }

  await db
    .update(teamJoinRequests)
    .set({ status: decision, resolvedAt: new Date() })
    .where(eq(teamJoinRequests.id, requestId));

  revalidatePath("/capitao");
  revalidatePath("/capitao/equipe");
  return { ok: true as const };
}

export async function removeTeamMemberAction(formData: FormData) {
  const captain = await requireCaptain();
  const teamId = String(formData.get("teamId") ?? "");
  const memberUserId = String(formData.get("userId") ?? "");
  if (!teamId || !memberUserId) return { error: "Dados inválidos" };

  const team = await assertCaptainOfTeam(captain.id, teamId);
  if (memberUserId === team.captainId) {
    return { error: "Não é possível remover o capitão da equipe" };
  }

  await db
    .update(teamMembers)
    .set({ active: false, leftAt: new Date() })
    .where(
      and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, memberUserId),
        eq(teamMembers.active, true),
      ),
    );

  revalidatePath("/capitao");
  revalidatePath("/capitao/equipe");
  return { ok: true as const };
}

export async function listCaptainTeamData() {
  const captain = await requireCaptain();
  const myTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.captainId, captain.id))
    .orderBy(desc(teams.createdAt));

  const teamIds = myTeams.map((t) => t.id);
  if (!teamIds.length) {
    return { teams: myTeams, members: [], requests: [] };
  }

  const members = await db
    .select({
      id: teamMembers.id,
      teamId: teamMembers.teamId,
      userId: teamMembers.userId,
      active: teamMembers.active,
      joinedAt: teamMembers.joinedAt,
      name: users.name,
      email: users.email,
    })
    .from(teamMembers)
    .innerJoin(users, eq(users.id, teamMembers.userId))
    .where(eq(teamMembers.active, true));

  const filteredMembers = members.filter((m) => teamIds.includes(m.teamId));

  const requests = await db
    .select({
      id: teamJoinRequests.id,
      teamId: teamJoinRequests.teamId,
      userId: teamJoinRequests.userId,
      status: teamJoinRequests.status,
      createdAt: teamJoinRequests.createdAt,
      name: users.name,
      email: users.email,
    })
    .from(teamJoinRequests)
    .innerJoin(users, eq(users.id, teamJoinRequests.userId))
    .where(eq(teamJoinRequests.status, "pending"))
    .orderBy(desc(teamJoinRequests.createdAt));

  const filteredRequests = requests.filter((r) => teamIds.includes(r.teamId));

  return { teams: myTeams, members: filteredMembers, requests: filteredRequests };
}
