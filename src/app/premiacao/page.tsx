import { eq } from "drizzle-orm";
import { Podium } from "@/components/podium/Podium";
import { Card, PageHeader } from "@/components/ui/primitives";
import { db } from "@/lib/db/client";
import { seasons } from "@/lib/db/schema";
import { getIndividualRanking, getTeamRanking } from "@/lib/scoring/rankings";

export default async function PremiacaoPage() {
  const published = await db
    .select()
    .from(seasons)
    .where(eq(seasons.championsPublished, true));

  const season = published[0];
  let individual: Awaited<ReturnType<typeof getIndividualRanking>> = [];
  let collective: Awaited<ReturnType<typeof getTeamRanking>> = [];

  if (season) {
    individual = await getIndividualRanking({ seasonId: season.id });
    collective = await getTeamRanking({ seasonId: season.id });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader
        title="Premiação"
        subtitle={
          season
            ? `Campeões oficiais · ${season.name}`
            : "Os campeões aparecem aqui após o admin publicar a temporada."
        }
      />

      {!season && (
        <Card>
          <p className="text-sm text-white/60">
            Ainda não há temporada com campeões publicados. Acompanhe os rankings
            em tempo real na página de Rankings.
          </p>
        </Card>
      )}

      {season && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <h2 className="mb-2 font-[family-name:var(--font-display)] text-3xl text-[var(--giro-gold)]">
              Campeões individuais
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
            <div className="mt-6 space-y-2 text-sm text-white/55">
              {individual.slice(0, 3).map((r) => (
                <div
                  key={r.userId}
                  className="rounded-xl border border-white/10 px-3 py-2"
                >
                  {r.position}º · {r.name} · {r.points} pts
                </div>
              ))}
              {!individual.length && (
                <p>Sem ranking homologado nesta temporada.</p>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="mb-2 font-[family-name:var(--font-display)] text-3xl text-[var(--giro-green)]">
              Equipes campeãs
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
            <div className="mt-6 space-y-2 text-sm text-white/55">
              {collective.slice(0, 3).map((r) => (
                <div
                  key={r.teamId}
                  className="rounded-xl border border-white/10 px-3 py-2"
                >
                  {r.position}º · {r.name} · {r.points} pts
                </div>
              ))}
              {!collective.length && (
                <p>Sem ranking coletivo homologado nesta temporada.</p>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
