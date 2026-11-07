import type { resultStatusEnum } from "@/lib/db/schema";

export type ResultStatus = (typeof resultStatusEnum.enumValues)[number];

export const DEFAULT_SCORING_POSITIONS: Record<string, number> = {
  "1": 100,
  "2": 85,
  "3": 75,
  "4": 65,
  "5": 60,
  "6": 55,
  "7": 50,
  "8": 45,
  "9": 40,
  "10": 35,
};

export type ScoringConfig = {
  positions: Record<string, number>;
  finisherPoints: number;
  participationPoints: number;
  bonuses?: Record<string, number>;
};

export function calculateStagePoints(input: {
  place: number | null;
  status: ResultStatus;
  config: ScoringConfig;
}): number {
  const { place, status, config } = input;

  if (status !== "finished") return 0;

  let points = 0;
  if (place != null && config.positions[String(place)] != null) {
    points = config.positions[String(place)]!;
  } else if (place != null) {
    points = config.finisherPoints;
  }

  points += config.participationPoints ?? 0;

  if (place === 1 && config.bonuses?.win) {
    points += config.bonuses.win;
  }

  return points;
}

export type RankingRow = {
  userId: string;
  teamId: string | null;
  points: number;
  stages: number;
  wins: number;
  seconds: number;
  thirds: number;
  podiums: number;
  recentPlace: number | null;
  recentStageNumber: number;
};

export type TieBreaker =
  | "wins"
  | "seconds"
  | "thirds"
  | "best_recent_stage"
  | "points";

export function compareRankings(
  a: RankingRow,
  b: RankingRow,
  tieBreakers: TieBreaker[] = [
    "wins",
    "seconds",
    "thirds",
    "best_recent_stage",
  ],
): number {
  if (b.points !== a.points) return b.points - a.points;

  for (const rule of tieBreakers) {
    if (rule === "wins" && b.wins !== a.wins) return b.wins - a.wins;
    if (rule === "seconds" && b.seconds !== a.seconds) {
      return b.seconds - a.seconds;
    }
    if (rule === "thirds" && b.thirds !== a.thirds) {
      return b.thirds - a.thirds;
    }
    if (rule === "best_recent_stage") {
      const aPlace = a.recentPlace ?? Number.POSITIVE_INFINITY;
      const bPlace = b.recentPlace ?? Number.POSITIVE_INFINITY;
      if (aPlace !== bPlace) return aPlace - bPlace;
      if (b.recentStageNumber !== a.recentStageNumber) {
        return b.recentStageNumber - a.recentStageNumber;
      }
    }
  }

  return 0;
}

export function sortIndividualRanking(
  rows: RankingRow[],
  tieBreakers?: TieBreaker[],
) {
  return [...rows].sort((a, b) => compareRankings(a, b, tieBreakers));
}

export type TeamRankingRow = {
  teamId: string;
  points: number;
  members: number;
  stages: number;
  stageWins: number;
  recentPlace: number | null;
  recentStageNumber: number;
  wins: number;
  seconds: number;
  thirds: number;
};

export function sortTeamRanking(
  rows: TeamRankingRow[],
  tieBreakers?: TieBreaker[],
) {
  return [...rows].sort((a, b) =>
    compareRankings(
      {
        userId: a.teamId,
        teamId: a.teamId,
        points: a.points,
        stages: a.stages,
        wins: a.wins || a.stageWins,
        seconds: a.seconds,
        thirds: a.thirds,
        podiums: a.wins + a.seconds + a.thirds,
        recentPlace: a.recentPlace,
        recentStageNumber: a.recentStageNumber,
      },
      {
        userId: b.teamId,
        teamId: b.teamId,
        points: b.points,
        stages: b.stages,
        wins: b.wins || b.stageWins,
        seconds: b.seconds,
        thirds: b.thirds,
        podiums: b.wins + b.seconds + b.thirds,
        recentPlace: b.recentPlace,
        recentStageNumber: b.recentStageNumber,
      },
      tieBreakers,
    ),
  );
}

export function validatePlaces(
  entries: Array<{ place: number | null; status: ResultStatus; isTie: boolean }>,
): string | null {
  const finished = entries.filter((e) => e.status === "finished" && e.place != null);
  const placeMap = new Map<number, number>();

  for (const entry of finished) {
    const place = entry.place!;
    placeMap.set(place, (placeMap.get(place) ?? 0) + 1);
  }

  for (const [place, count] of placeMap) {
    if (count > 1) {
      const tied = finished.filter((e) => e.place === place);
      if (tied.some((e) => !e.isTie)) {
        return `Posição ${place} duplicada sem empate formal.`;
      }
    }
  }

  return null;
}
