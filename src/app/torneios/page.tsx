import Link from "next/link";
import { desc } from "drizzle-orm";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";
import { db } from "@/lib/db/client";
import { tournaments } from "@/lib/db/schema";


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
        title="Torneios"
        subtitle="Competições individuais e coletivas da temporada."
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((t) => (
          <Link key={t.id} href={`/torneios/${t.id}`}>
            <Card className="h-full transition hover:border-[var(--giro-green)]/40">
              <div className="mb-3 flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold text-white">{t.name}</h2>
                <Badge>{t.status.replaceAll("_", " ")}</Badge>
              </div>
              <p className="line-clamp-3 text-sm text-white/55">
                {t.description || "Sem descrição."}
              </p>
              <p className="mt-4 text-xs uppercase tracking-wide text-white/40">
                {t.modality} · {t.startsAt} → {t.endsAt}
              </p>
            </Card>
          </Link>
        ))}
        {!rows.length && (
          <Card>
            <p className="text-sm text-white/55">Nenhum torneio cadastrado.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
