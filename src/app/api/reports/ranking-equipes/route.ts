import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth/session";
import { isAdminRole } from "@/lib/auth/roles";
import { toCsv, toExcelBuffer } from "@/lib/export/reports";
import { getTeamRanking } from "@/lib/scoring/rankings";

export async function GET(req: NextRequest) {
  const user = await readSession();
  if (!user || !isAdminRole(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const seasonId = req.nextUrl.searchParams.get("seasonId") ?? undefined;
  const tournamentId = req.nextUrl.searchParams.get("tournamentId") ?? undefined;
  const format = req.nextUrl.searchParams.get("format") ?? "csv";

  const ranking = await getTeamRanking({ seasonId, tournamentId });
  const rows = ranking.map((r) => ({
    posicao: r.position,
    equipe: r.name,
    pontos: r.points,
    integrantes: r.members,
    etapas: r.stages,
    vitorias_etapa: r.stageWins,
  }));

  if (format === "xlsx") {
    const buffer = toExcelBuffer({ equipes: rows });
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="ranking-equipes-giroam.xlsx"',
      },
    });
  }

  const csv = toCsv(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="ranking-equipes-giroam.csv"',
    },
  });
}
