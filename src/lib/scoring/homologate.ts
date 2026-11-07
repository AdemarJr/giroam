import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  pointLedger,
  resultAuditLogs,
  scoringTables,
  stageResults,
  stages,
  tournaments,
} from "@/lib/db/schema";
import {
  calculateStagePoints,
  validatePlaces,
  type ScoringConfig,
} from "./engine";

export async function computePreliminaryPoints(stageId: string) {
  const [stage] = await db.select().from(stages).where(eq(stages.id, stageId)).limit(1);
  if (!stage) throw new Error("Etapa não encontrada");

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, stage.tournamentId))
    .limit(1);
  if (!tournament) throw new Error("Torneio não encontrado");

  const [table] = await db
    .select()
    .from(scoringTables)
    .where(eq(scoringTables.id, tournament.scoringTableId))
    .limit(1);
  if (!table) throw new Error("Tabela de pontuação não encontrada");

  const config: ScoringConfig = {
    positions: table.positions,
    finisherPoints: table.finisherPoints,
    participationPoints: table.participationPoints,
    bonuses: table.bonuses ?? {},
  };

  const results = await db
    .select()
    .from(stageResults)
    .where(eq(stageResults.stageId, stageId));

  const validationError = validatePlaces(
    results.map((r) => ({
      place: r.place,
      status: r.status,
      isTie: r.isTie,
    })),
  );
  if (validationError) throw new Error(validationError);

  for (const result of results) {
    if (result.locked) continue;
    const points = calculateStagePoints({
      place: result.place,
      status: result.status,
      config,
    });

    await db
      .update(stageResults)
      .set({
        pointsPreliminary: points,
        updatedAt: new Date(),
      })
      .where(eq(stageResults.id, result.id));
  }

  await db
    .update(stages)
    .set({ status: "awaiting_results", updatedAt: new Date() })
    .where(eq(stages.id, stageId));

  return { ok: true, count: results.length };
}

export async function homologateStage(input: {
  stageId: string;
  actorId: string;
}) {
  const { stageId, actorId } = input;

  return db.transaction(async (tx) => {
    const [stage] = await tx.select().from(stages).where(eq(stages.id, stageId)).limit(1);
    if (!stage) throw new Error("Etapa não encontrada");
    if (stage.status === "homologated") {
      throw new Error("Etapa já homologada");
    }

    const [tournament] = await tx
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, stage.tournamentId))
      .limit(1);
    if (!tournament) throw new Error("Torneio não encontrado");

    const results = await tx
      .select()
      .from(stageResults)
      .where(eq(stageResults.stageId, stageId));

    if (!results.length) throw new Error("Sem resultados para homologar");

    const incomplete = results.filter(
      (r) => r.status === "finished" && r.place == null,
    );
    if (incomplete.length) {
      throw new Error("Há resultados incompletos (sem colocação).");
    }

    for (const result of results) {
      const points = result.pointsPreliminary;

      await tx
        .update(stageResults)
        .set({
          pointsFinal: points,
          locked: true,
          updatedAt: new Date(),
        })
        .where(eq(stageResults.id, result.id));

      // Remove lançamento final anterior (se reprocessar após correção autorizada)
      await tx
        .delete(pointLedger)
        .where(
          and(
            eq(pointLedger.stageResultId, result.id),
            eq(pointLedger.source, "stage_finish"),
            eq(pointLedger.isFinal, true),
          ),
        );

      await tx.insert(pointLedger).values({
        seasonId: tournament.seasonId,
        tournamentId: tournament.id,
        stageId: stage.id,
        userId: result.userId,
        teamId: result.teamId,
        stageResultId: result.id,
        points,
        source: "stage_finish",
        isFinal: true,
      });
    }

    await tx
      .update(stages)
      .set({
        status: "homologated",
        homologatedAt: new Date(),
        homologatedBy: actorId,
        updatedAt: new Date(),
      })
      .where(eq(stages.id, stageId));

    return { ok: true, results: results.length };
  });
}

export async function correctHomologatedResult(input: {
  stageResultId: string;
  actorId: string;
  place?: number | null;
  status?: (typeof stageResults.$inferSelect)["status"];
  finishTime?: string | null;
  isTie?: boolean;
  justification: string;
}) {
  const {
    stageResultId,
    actorId,
    place,
    status,
    finishTime,
    isTie,
    justification,
  } = input;

  if (!justification.trim()) {
    throw new Error("Justificativa obrigatória após homologação");
  }

  return db.transaction(async (tx) => {
    const [result] = await tx
      .select()
      .from(stageResults)
      .where(eq(stageResults.id, stageResultId))
      .limit(1);
    if (!result) throw new Error("Resultado não encontrado");

    const [stage] = await tx
      .select()
      .from(stages)
      .where(eq(stages.id, result.stageId))
      .limit(1);
    if (!stage) throw new Error("Etapa não encontrada");

    const [tournament] = await tx
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, stage.tournamentId))
      .limit(1);
    if (!tournament) throw new Error("Torneio não encontrado");

    const [table] = await tx
      .select()
      .from(scoringTables)
      .where(eq(scoringTables.id, tournament.scoringTableId))
      .limit(1);
    if (!table) throw new Error("Tabela de pontuação não encontrada");

    const next = {
      place: place === undefined ? result.place : place,
      status: status ?? result.status,
      finishTime: finishTime === undefined ? result.finishTime : finishTime,
      isTie: isTie ?? result.isTie,
    };

    const audits: Array<{ field: string; oldValue: string; newValue: string }> =
      [];
    if (next.place !== result.place) {
      audits.push({
        field: "place",
        oldValue: String(result.place),
        newValue: String(next.place),
      });
    }
    if (next.status !== result.status) {
      audits.push({
        field: "status",
        oldValue: result.status,
        newValue: next.status,
      });
    }
    if (next.finishTime !== result.finishTime) {
      audits.push({
        field: "finishTime",
        oldValue: String(result.finishTime),
        newValue: String(next.finishTime),
      });
    }

    const points = calculateStagePoints({
      place: next.place,
      status: next.status,
      config: {
        positions: table.positions,
        finisherPoints: table.finisherPoints,
        participationPoints: table.participationPoints,
        bonuses: table.bonuses ?? {},
      },
    });

    await tx
      .update(stageResults)
      .set({
        ...next,
        pointsPreliminary: points,
        pointsFinal: stage.status === "homologated" ? points : result.pointsFinal,
        updatedAt: new Date(),
      })
      .where(eq(stageResults.id, stageResultId));

    for (const audit of audits) {
      await tx.insert(resultAuditLogs).values({
        stageResultId,
        actorId,
        field: audit.field,
        oldValue: audit.oldValue,
        newValue: audit.newValue,
        justification,
      });
    }

    if (stage.status === "homologated") {
      await tx
        .delete(pointLedger)
        .where(
          and(
            eq(pointLedger.stageResultId, stageResultId),
            eq(pointLedger.source, "stage_finish"),
            eq(pointLedger.isFinal, true),
          ),
        );

      await tx.insert(pointLedger).values({
        seasonId: tournament.seasonId,
        tournamentId: tournament.id,
        stageId: stage.id,
        userId: result.userId,
        teamId: result.teamId,
        stageResultId: result.id,
        points,
        source: "stage_finish",
        isFinal: true,
      });

      await tx.insert(resultAuditLogs).values({
        stageResultId,
        actorId,
        field: "pointsFinal",
        oldValue: String(result.pointsFinal),
        newValue: String(points),
        justification,
      });
    }

    return { ok: true, points };
  });
}
