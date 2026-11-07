import Link from "next/link";
import { desc, inArray } from "drizzle-orm";
import { CommercialFeatures } from "@/components/home/CommercialFeatures";
import {
  EventBannerCarousel,
  type CarouselEvent,
} from "@/components/home/EventBannerCarousel";
import { Podium } from "@/components/podium/Podium";
import { Button, Card } from "@/components/ui/primitives";
import { db } from "@/lib/db/client";
import { tournaments } from "@/lib/db/schema";
import { getIndividualRanking } from "@/lib/scoring/rankings";

export default async function HomePage() {
  let ranking: Awaited<ReturnType<typeof getIndividualRanking>> = [];
  let featured: CarouselEvent[] = [];
  let openTournaments: (typeof tournaments.$inferSelect)[] = [];

  try {
    ranking = await getIndividualRanking({});
    const rows = await db
      .select()
      .from(tournaments)
      .where(
        inArray(tournaments.status, [
          "registration_open",
          "in_progress",
          "registration_closed",
        ]),
      )
      .orderBy(desc(tournaments.createdAt))
      .limit(12);

    openTournaments = rows.filter((t) =>
      ["registration_open", "in_progress"].includes(t.status),
    );

    // Destaque: prioriza quem tem banner; depois campeonatos/corridas abertas
    featured = [...rows]
      .sort((a, b) => {
        const score = (t: (typeof rows)[number]) =>
          (t.bannerUrl ? 4 : 0) +
          (t.kind === "championship" || t.kind === "race" ? 2 : 0) +
          (t.status === "registration_open" ? 1 : 0);
        return score(b) - score(a);
      })
      .slice(0, 8)
      .map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        modality: t.modality,
        kind: t.kind,
        status: t.status,
        bannerUrl: t.bannerUrl,
        location: t.location,
        startsAt: t.startsAt,
        endsAt: t.endsAt,
        paymentMode: t.paymentMode,
        priceCents: t.priceCents,
      }));
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
      <EventBannerCarousel events={featured} />

      <CommercialFeatures />

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
                Nenhum torneio aberto no momento.
              </p>
            )}
          </div>
          <div className="mt-4">
            <Link href="/torneios">
              <Button variant="ghost">Ver todos</Button>
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
