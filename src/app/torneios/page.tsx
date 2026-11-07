import Link from "next/link";
import { desc } from "drizzle-orm";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";
import { db } from "@/lib/db/client";
import { tournaments } from "@/lib/db/schema";

const FALLBACK: Record<string, string> = {
  ciclismo:
    "https://images.unsplash.com/photo-1517649763962-0c623066027e?auto=format&fit=crop&w=1200&q=70",
  triathlon:
    "https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=1200&q=70",
  mtb: "https://images.unsplash.com/photo-1576435728678-68d0fbf378e9?auto=format&fit=crop&w=1200&q=70",
};

export default async function TorneiosPage() {
  let rows: (typeof tournaments.$inferSelect)[] = [];
  try {
    rows = await db.select().from(tournaments).orderBy(desc(tournaments.startsAt));
  } catch {
    rows = [];
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <PageHeader
        title="Torneios e campeonatos"
        subtitle="Páginas exclusivas com regulamento, categorias, etapas e inscrição."
      />
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((t) => {
          const cover =
            t.bannerUrl ||
            FALLBACK[t.modality.toLowerCase()] ||
            FALLBACK.ciclismo;
          return (
            <Link key={t.id} href={`/torneios/${t.id}`} className="group">
              <Card className="h-full overflow-hidden p-0 transition hover:border-[var(--giro-green)]/40">
                <div className="relative aspect-[16/9] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cover}
                    alt=""
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                    <Badge>{t.kind === "championship" ? "Campeonato" : t.kind}</Badge>
                    <Badge tone="muted">{t.status.replaceAll("_", " ")}</Badge>
                  </div>
                </div>
                <div className="p-5">
                  <h2 className="text-lg font-semibold text-white">{t.name}</h2>
                  <p className="mt-2 line-clamp-3 text-sm text-white/55">
                    {t.description || "Sem descrição."}
                  </p>
                  <p className="mt-4 text-xs uppercase tracking-wide text-white/40">
                    {t.modality} · {t.startsAt} → {t.endsAt}
                  </p>
                </div>
              </Card>
            </Link>
          );
        })}
        {!rows.length && (
          <Card>
            <p className="text-sm text-white/55">Nenhum torneio cadastrado.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
