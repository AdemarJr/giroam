import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  pointLedger,
  stageResults,
  stages,
  teams,
  tournaments,
  users,
} from "@/lib/db/schema";
import {
  sortIndividualRanking,
  sortTeamRanking,
  type RankingRow,
  type TeamRankingRow,
  type TieBreaker,
} from "./engine";

export async function getIndividualRanking(filters: {
  seasonId?: string;
  tournamentId?: string;
  stageId?: string;
  teamId?: string;
}) {
  const conditions = [eq(pointLedger.isFinal, true)];
  if (filters.seasonId) conditions.push(eq(pointLedger.seasonId, filters.seasonId));
  if (filters.tournamentId) {
    conditions.push(eq(pointLedger.tournamentId, filters.tournamentId));
  }
  if (filters.stageId) conditions.push(eq(pointLedger.stageId, filters.stageId));
  if (filters.teamId) conditions.push(eq(pointLedger.teamId, filters.teamId));

  const ledger = await db
    .select({
      userId: pointLedger.userId,
      teamId: pointLedger.teamId,
      points: pointLedger.points,
      stageId: pointLedger.stageId,
    })
    .from(pointLedger)
    .where(and(...conditions));

  if (!ledger.length) return [];

  const stageIds = [...new Set(ledger.map((l) => l.stageId))];
  const stageRows = await db
    .select({
      id: stages.id,
      number: stages.number,
    })
    .from(stages)
    .where(inArray(stages.id, stageIds));
  const stageNumber = new Map(stageRows.map((s) => [s.id, s.number]));

  const resultRows = await db
    .select({
      userId: stageResults.userId,
      stageId: stageResults.stageId,
      place: stageResults.place,
      status: stageResults.status,
      pointsFinal: stageResults.pointsFinal,
    })
    .from(stageResults)
    .where(inArray(stageResults.stageId, stageIds));

  const byUser = new Map<string, RankingRow>();

  for (const row of ledger) {
    const current = byUser.get(row.userId) ?? {
      userId: row.userId,
      teamId: row.teamId,
      points: 0,
      stages: 0,
      wins: 0,
      seconds: 0,
      thirds: 0,
      podiums: 0,
      recentPlace: null as number | null,
      recentStageNumber: 0,
    };
    current.points += row.points;
    if (row.teamId) current.teamId = row.teamId;
    byUser.set(row.userId, current);
  }

  const stagesPerUser = new Map<string, Set<string>>();
  for (const r of resultRows) {
    if (!byUser.has(r.userId)) continue;
    // Só resultados finalizados contam para desempate / etapas
    if (r.status !== "finished") continue;

    const set = stagesPerUser.get(r.userId) ?? new Set();
    set.add(r.stageId);
    stagesPerUser.set(r.userId, set);

    const entry = byUser.get(r.userId)!;
    if (r.place === 1) entry.wins += 1;
    if (r.place === 2) entry.seconds += 1;
    if (r.place === 3) entry.thirds += 1;
    if (r.place != null && r.place <= 3) entry.podiums += 1;

    const n = stageNumber.get(r.stageId) ?? 0;
    if (n >= entry.recentStageNumber && r.place != null) {
      entry.recentStageNumber = n;
      entry.recentPlace = r.place;
    }
  }

  for (const [userId, set] of stagesPerUser) {
    const entry = byUser.get(userId);
    if (entry) entry.stages = set.size;
  }

  let tieBreakers: TieBreaker[] | undefined;
  if (filters.tournamentId) {
    const [t] = await db
      .select({ tieBreakers: tournaments.tieBreakers })
      .from(tournaments)
      .where(eq(tournaments.id, filters.tournamentId))
      .limit(1);
    tieBreakers = (t?.tieBreakers as TieBreaker[]) ?? undefined;
  }

  const ranked = sortIndividualRanking([...byUser.values()], tieBreakers);
  const userIds = ranked.map((r) => r.userId);
  const people = userIds.length
    ? await db.select().from(users).where(inArray(users.id, userIds))
    : [];
  const peopleMap = new Map(people.map((p) => [p.id, p]));

  const teamIds = [
    ...new Set(ranked.map((r) => r.teamId).filter(Boolean) as string[]),
  ];
  const teamRows = teamIds.length
    ? await db.select().from(teams).where(inArray(teams.id, teamIds))
    : [];
  const teamMap = new Map(teamRows.map((t) => [t.id, t]));

  return ranked.map((row, index) => {
    const person = peopleMap.get(row.userId);
    const team = row.teamId ? teamMap.get(row.teamId) : null;
    return {
      position: index + 1,
      ...row,
      name: person?.name ?? "Atleta",
      photoUrl: person?.photoUrl ?? null,
      teamName: team?.name ?? null,
      teamColor: team?.color ?? null,
      teamCrestUrl: team?.crestUrl ?? null,
    };
  });
}

export async function getTeamRanking(filters: {
  seasonId?: string;
  tournamentId?: string;
  stageId?: string;
}) {
  const conditions = [
    eq(pointLedger.isFinal, true),
    sql`${pointLedger.teamId} is not null`,
  ];
  if (filters.seasonId) conditions.push(eq(pointLedger.seasonId, filters.seasonId));
  if (filters.tournamentId) {
    conditions.push(eq(pointLedger.tournamentId, filters.tournamentId));
  }
  if (filters.stageId) conditions.push(eq(pointLedger.stageId, filters.stageId));

  const ledger = await db
    .select({
      teamId: pointLedger.teamId,
      userId: pointLedger.userId,
      points: pointLedger.points,
      stageId: pointLedger.stageId,
    })
    .from(pointLedger)
    .where(and(...conditions));

  if (!ledger.length) return [];

  // Limite de atletas que pontuam por etapa (config do torneio)
  let maxScoringMembers: number | null = null;
  if (filters.tournamentId) {
    const [t] = await db
      .select({ max: tournaments.maxScoringMembersPerStage })
      .from(tournaments)
      .where(eq(tournaments.id, filters.tournamentId))
      .limit(1);
    maxScoringMembers = t?.max ?? null;
  }

  type StageMemberPts = { userId: string; points: number };
  const pointsByTeamStage = new Map<string, StageMemberPts[]>();

  for (const row of ledger) {
    if (!row.teamId) continue;
    const key = `${row.teamId}::${row.stageId}`;
    const list = pointsByTeamStage.get(key) ?? [];
    list.push({ userId: row.userId, points: row.points });
    pointsByTeamStage.set(key, list);
  }

  const scoredLedger: typeof ledger = [];
  for (const [key, list] of pointsByTeamStage) {
    const [teamId, stageId] = key.split("::");
    const sorted = [...list].sort((a, b) => b.points - a.points);
    const capped =
      maxScoringMembers && maxScoringMembers > 0
        ? sorted.slice(0, maxScoringMembers)
        : sorted;
    for (const item of capped) {
      scoredLedger.push({
        teamId,
        userId: item.userId,
        points: item.points,
        stageId,
      });
    }
  }

  const byTeam = new Map<string, TeamRankingRow & { memberSet: Set<string>; stageSet: Set<string> }>();

  for (const row of scoredLedger) {
    if (!row.teamId) continue;
    const current = byTeam.get(row.teamId) ?? {
      teamId: row.teamId,
      points: 0,
      members: 0,
      stages: 0,
      stageWins: 0,
      recentPlace: null as number | null,
      recentStageNumber: 0,
      wins: 0,
      seconds: 0,
      thirds: 0,
      memberSet: new Set<string>(),
      stageSet: new Set<string>(),
    };
    current.points += row.points;
    current.memberSet.add(row.userId);
    current.stageSet.add(row.stageId);
    byTeam.set(row.teamId, current);
  }

  // Vitórias de etapa = equipe com maior pontuação na etapa (empate = ninguém leva)
  const stageIds = [...new Set(scoredLedger.map((l) => l.stageId))];
  for (const stageId of stageIds) {
    const stagePoints = new Map<string, number>();
    for (const row of scoredLedger.filter((l) => l.stageId === stageId && l.teamId)) {
      stagePoints.set(
        row.teamId!,
        (stagePoints.get(row.teamId!) ?? 0) + row.points,
      );
    }
    let bestTeam: string | null = null;
    let best = -1;
    let tie = false;
    for (const [teamId, pts] of stagePoints) {
      if (pts > best) {
        best = pts;
        bestTeam = teamId;
        tie = false;
      } else if (pts === best) {
        tie = true;
      }
    }
    if (!tie && bestTeam && byTeam.has(bestTeam)) {
      byTeam.get(bestTeam)!.stageWins += 1;
      byTeam.get(bestTeam)!.wins += 1;
    }
  }

  const rows: TeamRankingRow[] = [...byTeam.values()].map((t) => ({
    teamId: t.teamId,
    points: t.points,
    members: t.memberSet.size,
    stages: t.stageSet.size,
    stageWins: t.stageWins,
    recentPlace: t.recentPlace,
    recentStageNumber: t.recentStageNumber,
    wins: t.wins,
    seconds: t.seconds,
    thirds: t.thirds,
  }));

  let tieBreakers: TieBreaker[] | undefined;
  if (filters.tournamentId) {
    const [t] = await db
      .select({ tieBreakers: tournaments.tieBreakers })
      .from(tournaments)
      .where(eq(tournaments.id, filters.tournamentId))
      .limit(1);
    tieBreakers = (t?.tieBreakers as TieBreaker[]) ?? undefined;
  }

  const ranked = sortTeamRanking(rows, tieBreakers);
  const teamIds = ranked.map((r) => r.teamId);
  const teamRows = await db.select().from(teams).where(inArray(teams.id, teamIds));
  const teamMap = new Map(teamRows.map((t) => [t.id, t]));

  return ranked.map((row, index) => {
    const team = teamMap.get(row.teamId);
    return {
      position: index + 1,
      ...row,
      name: team?.name ?? "Equipe",
      crestUrl: team?.crestUrl ?? null,
      color: team?.color ?? "#1B7A4E",
    };
  });
}

export async function getTeamPointsBreakdown(teamId: string, tournamentId?: string) {
  const conditions = [
    eq(pointLedger.teamId, teamId),
    eq(pointLedger.isFinal, true),
  ];
  if (tournamentId) conditions.push(eq(pointLedger.tournamentId, tournamentId));

  const rows = await db
    .select({
      userId: pointLedger.userId,
      points: sql<number>`sum(${pointLedger.points})`.mapWith(Number),
    })
    .from(pointLedger)
    .where(and(...conditions))
    .groupBy(pointLedger.userId);

  const userIds = rows.map((r) => r.userId);
  const people = userIds.length
    ? await db.select().from(users).where(inArray(users.id, userIds))
    : [];
  const map = new Map(people.map((p) => [p.id, p]));

  return rows
    .map((r) => ({
      userId: r.userId,
      name: map.get(r.userId)?.name ?? "Atleta",
      photoUrl: map.get(r.userId)?.photoUrl ?? null,
      points: r.points,
    }))
    .sort((a, b) => b.points - a.points);
}
