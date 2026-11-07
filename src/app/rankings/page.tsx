import { Podium } from "@/components/podium/Podium";
import {
  IndividualRankingTable,
  TeamRankingTable,
} from "@/components/ranking/RankingTable";
import { Card, PageHeader } from "@/components/ui/primitives";
import { db } from "@/lib/db/client";
import { seasons, tournaments } from "@/lib/db/schema";
import {
  getIndividualRanking,
  getTeamRanking,
} from "@/lib/scoring/rankings";


export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ seasonId?: string; tournamentId?: string }>;
}) {
  const sp = await searchParams;
  let individual: Awaited<ReturnType<typeof getIndividualRanking>> = [];
  let collective: Awaited<ReturnType<typeof getTeamRanking>> = [];
  let seasonRows: (typeof seasons.$inferSelect)[] = [];
  let tournamentRows: (typeof tournaments.$inferSelect)[] = [];

  try {
    seasonRows = await db.select().from(seasons);
    tournamentRows = await db.select().from(tournaments);
    individual = await getIndividualRanking({
      seasonId: sp.seasonId,
      tournamentId: sp.tournamentId,
    });
    collective = await getTeamRanking({
      seasonId: sp.seasonId,
      tournamentId: sp.tournamentId,
    });
  } catch {
    // ignore until DB is ready
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <PageHeader
        title="Rankings"
        subtitle="Classificação individual e coletiva — pontos só após homologação."
      />

      <Card className="mb-6">
        <form className="grid gap-3 md:grid-cols-3">
          <select
            name="seasonId"
            defaultValue={sp.seasonId ?? ""}
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm"
          >
            <option value="">Todas as temporadas</option>
            {seasonRows.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            name="tournamentId"
            defaultValue={sp.tournamentId ?? ""}
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm"
          >
            <option value="">Todos os torneios</option>
            {tournamentRows.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button className="rounded-xl bg-[var(--giro-green)] px-4 py-2.5 text-sm font-semibold text-[#04140c]">
            Filtrar
          </button>
        </form>
      </Card>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-[family-name:var(--font-display)] text-3xl">
            Pódio individual
          </h2>
          <Podium
            entries={individual.slice(0, 3).map((r) => ({
              position: r.position,
              name: r.name,
              points: r.points,
              subtitle: r.teamName,
              photoUrl: r.photoUrl,
            }))}
          />
        </Card>
        <Card>
          <h2 className="mb-2 font-[family-name:var(--font-display)] text-3xl">
            Pódio de equipes
          </h2>
          <Podium
            entries={collective.slice(0, 3).map((r) => ({
              position: r.position,
              name: r.name,
              points: r.points,
              subtitle: `${r.members} atletas`,
              photoUrl: r.crestUrl,
            }))}
          />
        </Card>
      </div>

      <div className="space-y-8">
        <div>
          <h2 className="mb-3 text-xl font-semibold">Individual</h2>
          <IndividualRankingTable rows={individual} />
        </div>
        <div>
          <h2 className="mb-3 text-xl font-semibold">Equipes</h2>
          <TeamRankingTable rows={collective} />
        </div>
      </div>
    </div>
  );
}
