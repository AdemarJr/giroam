import Link from "next/link";
import { desc } from "drizzle-orm";
import { GiroAmLogo } from "@/components/brand/Logo";
import { Podium } from "@/components/podium/Podium";
import { Button, Card } from "@/components/ui/primitives";
import { db } from "@/lib/db/client";
import { tournaments } from "@/lib/db/schema";
import { getIndividualRanking } from "@/lib/scoring/rankings";


export default async function HomePage() {
  let ranking: Awaited<ReturnType<typeof getIndividualRanking>> = [];
  let openTournaments: (typeof tournaments.$inferSelect)[] = [];

  try {
    ranking = await getIndividualRanking({});
    openTournaments = (
      await db.select().from(tournaments).orderBy(desc(tournaments.createdAt)).limit(12)
    ).filter((t) =>
      ["registration_open", "in_progress"].includes(t.status),
    );
  } catch {
    // DB ainda não configurado — UI sobe mesmo assim
  }

  const podium = ranking.slice(0, 3).map((r) => ({
    position: r.position,
    name: r.name,
    points: r.points,
    subtitle: r.teamName,
    photoUrl: r.photoUrl,
  }));

  return (
    <div>
      <section className="relative overflow-hidden forest-grid">
        <div className="hero-sheen pointer-events-none absolute inset-0" />
        <div className="relative mx-auto flex min-h-[78vh] max-w-7xl flex-col justify-center px-4 py-16">
          <GiroAmLogo className="mb-8 scale-110 origin-left" />
          <h1 className="max-w-3xl font-[family-name:var(--font-display)] text-5xl leading-[0.95] tracking-wide text-white md:text-7xl">
            A floresta acelera.
            <span className="block text-[var(--giro-green)]">A classificação responde.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-white/65 md:text-lg">
            Temporadas, etapas, equipes e homologação de chegada — o campeonato de
            ciclismo e triathlon da Amazônia em uma plataforma só.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/torneios">
              <Button>Ver torneios</Button>
            </Link>
            <Link href="/rankings">
              <Button variant="gold">Rankings</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-12 md:grid-cols-2">
        <Card>
          <h2 className="font-[family-name:var(--font-display)] text-3xl text-white">
            Pódio geral
          </h2>
          <p className="mb-4 text-sm text-white/50">
            Atualizado após homologação das etapas
          </p>
          <Podium entries={podium} />
        </Card>

        <Card>
          <h2 className="font-[family-name:var(--font-display)] text-3xl text-white">
            Inscrições abertas
          </h2>
          <div className="mt-4 space-y-3">
            {openTournaments.map((t) => (
              <Link
                key={t.id}
                href={`/torneios/${t.id}`}
                className="block rounded-xl border border-white/10 bg-black/20 px-4 py-3 hover:border-[var(--giro-green)]/40"
              >
                <div className="font-semibold text-white">{t.name}</div>
                <div className="text-xs uppercase tracking-wide text-white/45">
                  {t.modality} · {t.status.replaceAll("_", " ")}
                </div>
              </Link>
            ))}
            {!openTournaments.length && (
              <p className="text-sm text-white/45">
                Nenhum torneio aberto no momento. Configure o Postgres e rode o seed.
              </p>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
