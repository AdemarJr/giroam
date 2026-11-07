import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { homologateStageAction } from "@/lib/actions/championships";
import { correctResultFormAction } from "@/lib/actions/forms";
import { readSession } from "@/lib/auth/session";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db/client";
import { stageResults, stages, users } from "@/lib/db/schema";
import {
  Badge,
  Button,
  Card,
  Input,
  Label,
  PageHeader,
  Select,
  TextArea,
} from "@/components/ui/primitives";

type Props = {
  searchParams: Promise<{ stageId?: string }>;
};

export default async function HomologacaoPage({ searchParams }: Props) {
  const user = await readSession();
  if (!user || !isAdminRole(user.role)) redirect("/login");
  const { stageId: selectedId } = await searchParams;

  const pending = await db
    .select()
    .from(stages)
    .where(eq(stages.status, "awaiting_results"))
    .orderBy(desc(stages.eventDate));

  const homologated = await db
    .select()
    .from(stages)
    .where(eq(stages.status, "homologated"))
    .orderBy(desc(stages.homologatedAt))
    .limit(20);

  const selected =
    homologated.find((s) => s.id === selectedId) ?? homologated[0] ?? null;

  let results: (typeof stageResults.$inferSelect)[] = [];
  let peopleMap = new Map<string, string>();
  if (selected) {
    results = await db
      .select()
      .from(stageResults)
      .where(eq(stageResults.stageId, selected.id));
    const userIds = [...new Set(results.map((r) => r.userId))];
    if (userIds.length) {
      const people = await db.select().from(users);
      peopleMap = new Map(
        people
          .filter((p) => userIds.includes(p.id))
          .map((p) => [p.id, p.name]),
      );
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader
        title="Homologação"
        subtitle="Revise a pontuação preliminar e publique os pontos definitivos. Correções exigem justificativa."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Aguardando homologação</h2>
          <ul className="space-y-3">
            {pending.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 p-3"
              >
                <div>
                  <div className="font-medium">
                    {s.number}. {s.name}
                  </div>
                  <div className="text-xs text-white/45">{s.eventDate}</div>
                </div>
                <form
                  action={async () => {
                    "use server";
                    await homologateStageAction(s.id);
                  }}
                >
                  <Button type="submit" variant="gold">
                    Homologar
                  </Button>
                </form>
              </li>
            ))}
            {!pending.length && (
              <li className="text-sm text-white/45">Nada pendente.</li>
            )}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Correção com auditoria</h2>
          {homologated.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {homologated.map((s) => (
                <Link key={s.id} href={`/admin/homologacao?stageId=${s.id}`}>
                  <Badge tone={selected?.id === s.id ? "gold" : "muted"}>
                    {s.number}. {s.name}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
          {!selected && (
            <p className="text-sm text-white/45">
              Homologue uma etapa para habilitar correções auditadas.
            </p>
          )}
          {selected && (
            <ul className="space-y-4">
              {results.map((r) => (
                <li key={r.id} className="rounded-xl border border-white/10 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium">
                      {peopleMap.get(r.userId) ?? r.userId}
                    </span>
                    <Badge>
                      {r.place ? `${r.place}º` : r.status} · {r.pointsFinal ?? 0}{" "}
                      pts
                    </Badge>
                  </div>
                  <form
                    action={correctResultFormAction}
                    className="grid gap-2 md:grid-cols-2"
                  >
                    <input type="hidden" name="stageResultId" value={r.id} />
                    <div>
                      <Label>Nova colocação</Label>
                      <Input
                        name="place"
                        type="number"
                        defaultValue={r.place ?? ""}
                      />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select name="status" defaultValue={r.status}>
                        <option value="finished">Concluiu</option>
                        <option value="dns">DNS</option>
                        <option value="dnf">DNF</option>
                        <option value="dsq">DSQ</option>
                        <option value="absent">Ausente</option>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <Label>Justificativa (obrigatória)</Label>
                      <TextArea name="justification" required rows={2} />
                    </div>
                    <Button type="submit" variant="danger">
                      Corrigir e recalcular
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
