import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/session";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db/client";
import { stages, tournaments } from "@/lib/db/schema";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";


export default async function ChegadaIndexPage() {
  const user = await readSession();
  if (!user || !isAdminRole(user.role)) redirect("/login");

  const stageRows = await db.select().from(stages).orderBy(desc(stages.eventDate));
  const tournamentRows = await db.select().from(tournaments);
  const tMap = new Map(tournamentRows.map((t) => [t.id, t.name]));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <PageHeader
        title="Registrar chegada"
        subtitle="Escolha a etapa para lançar a ordem de chegada manualmente."
      />
      <Card>
        <ul className="space-y-2">
          {stageRows.map((s) => (
            <li key={s.id}>
              <Link
                href={`/admin/chegada/${s.id}`}
                className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-3 hover:border-[var(--giro-gold)]/40"
              >
                <div>
                  <div className="font-medium text-white">
                    {s.number}. {s.name}
                  </div>
                  <div className="text-xs text-white/45">
                    {tMap.get(s.tournamentId)} · {s.eventDate}
                  </div>
                </div>
                <Badge tone={s.status === "homologated" ? "gold" : "green"}>
                  {s.status}
                </Badge>
              </Link>
            </li>
          ))}
          {!stageRows.length && (
            <li className="text-sm text-white/45">Crie uma etapa primeiro.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
