import { desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import {
  closeSeasonAction,
  publishChampionsAction,
} from "@/lib/actions/championships";
import { createSeasonFormAction } from "@/lib/actions/forms";
import { readSession } from "@/lib/auth/session";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db/client";
import { seasons } from "@/lib/db/schema";
import {
  Badge,
  Button,
  Card,
  Input,
  Label,
  PageHeader,
  TextArea,
} from "@/components/ui/primitives";


export default async function TemporadasAdminPage() {
  const user = await readSession();
  if (!user || !isAdminRole(user.role)) redirect("/login");

  const rows = await db.select().from(seasons).orderBy(desc(seasons.year));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader title="Temporadas" subtitle="Gestão anual do campeonato." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Nova temporada</h2>
          <form action={createSeasonFormAction} className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input name="name" required placeholder="Temporada 2026" />
            </div>
            <div>
              <Label>Ano</Label>
              <Input name="year" type="number" required defaultValue={new Date().getFullYear()} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Início</Label>
                <Input name="startsAt" type="date" required />
              </div>
              <div>
                <Label>Encerramento</Label>
                <Input name="endsAt" type="date" required />
              </div>
            </div>
            <div>
              <Label>Regulamento geral</Label>
              <TextArea name="regulation" rows={4} />
            </div>
            <Button type="submit">Criar temporada</Button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Histórico</h2>
          <ul className="space-y-3">
            {rows.map((s) => (
              <li key={s.id} className="rounded-xl border border-white/10 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-xs text-white/45">
                      {s.startsAt} → {s.endsAt}
                    </div>
                  </div>
                  <Badge tone={s.status === "active" ? "green" : "muted"}>
                    {s.status}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <form
                    action={async () => {
                      "use server";
                      await closeSeasonAction(s.id);
                    }}
                  >
                    <Button type="submit" variant="ghost">
                      Encerrar
                    </Button>
                  </form>
                  <form
                    action={async () => {
                      "use server";
                      await publishChampionsAction(s.id);
                    }}
                  >
                    <Button type="submit" variant="gold">
                      Publicar campeões
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
