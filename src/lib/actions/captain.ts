"use server";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { requireCaptain } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import {
  pointLedger,
  registrations,
  stageResults,
  stages,
  teamMembers,
  teams,
  tournaments,
  users,
} from "@/lib/db/schema";
import { getIndividualRanking } from "@/lib/scoring/rankings";

export async function getCaptainDashboard() {
  const captain = await requireCaptain();

  const myTeams = await db
    .select()
    .from(teams)
    .where(and(eq(teams.captainId, captain.id), eq(teams.status, "active")));

  const teamIds = myTeams.map((t) => t.id);
  const tournamentIds = [...new Set(myTeams.map((t) => t.tournamentId))];

  const tournamentRows = tournamentIds.length
    ? await db
        .select()
        .from(tournaments)
        .where(inArray(tournaments.id, tournamentIds))
        .orderBy(desc(tournaments.createdAt))
    : [];

  const members = teamIds.length
    ? await db
        .select({
          teamId: teamMembers.teamId,
          userId: teamMembers.userId,
          name: users.name,
          email: users.email,
          photoUrl: users.photoUrl,
        })
        .from(teamMembers)
        .innerJoin(users, eq(users.id, teamMembers.userId))
        .where(
          and(inArray(teamMembers.teamId, teamIds), eq(teamMembers.active, true)),
        )
    : [];

  const memberIds = [...new Set(members.map((m) => m.userId))];
  if (!memberIds.includes(captain.id)) memberIds.push(captain.id);

  const regs = memberIds.length
    ? await db
        .select()
        .from(registrations)
        .where(
          and(
            inArray(registrations.userId, memberIds),
            sql`${registrations.status} in ('pending','approved')`,
          ),
        )
    : [];

  const ranking =
    tournamentIds.length === 1
      ? await getIndividualRanking({ tournamentId: tournamentIds[0] })
      : await getIndividualRanking({});

  const myRank = ranking.find((r) => r.userId === captain.id) ?? null;
  const athleteRanks = ranking.filter((r) =>
    members.some((m) => m.userId === r.userId),
  );

  const stageIds = tournamentIds.length
    ? (
        await db
          .select({ id: stages.id })
          .from(stages)
          .where(inArray(stages.tournamentId, tournamentIds))
      ).map((s) => s.id)
    : [];

  const recentResults = stageIds.length
    ? await db
        .select({
          userId: stageResults.userId,
          stageId: stageResults.stageId,
          place: stageResults.place,
          status: stageResults.status,
          pointsFinal: stageResults.pointsFinal,
          stageName: stages.name,
          stageNumber: stages.number,
          eventDate: stages.eventDate,
          tournamentId: stages.tournamentId,
        })
        .from(stageResults)
        .innerJoin(stages, eq(stages.id, stageResults.stageId))
        .where(
          and(
            inArray(stageResults.stageId, stageIds),
            inArray(stageResults.userId, memberIds),
          ),
        )
        .orderBy(desc(stages.eventDate))
        .limit(40)
    : [];

  const finalPoints = memberIds.length
    ? await db
        .select({
          userId: pointLedger.userId,
          points: sql<number>`sum(${pointLedger.points})`.mapWith(Number),
        })
        .from(pointLedger)
        .where(
          and(
            eq(pointLedger.isFinal, true),
            inArray(pointLedger.userId, memberIds),
            tournamentIds.length
              ? inArray(pointLedger.tournamentId, tournamentIds)
              : sql`true`,
          ),
        )
        .groupBy(pointLedger.userId)
    : [];

  return {
    captain,
    teams: myTeams,
    tournaments: tournamentRows,
    members,
    registrations: regs,
    myRank,
    athleteRanks,
    recentResults,
    finalPoints,
  };
}
