import Link from "next/link";
import { desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { createStageFormAction } from "@/lib/actions/forms";
import { readSession } from "@/lib/auth/session";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db/client";
import { stages, tournaments } from "@/lib/db/schema";
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


export default async function EtapasAdminPage() {
  const user = await readSession();
  if (!user || !isAdminRole(user.role)) redirect("/login");

  const tournamentRows = await db
    .select()
    .from(tournaments)
    .orderBy(desc(tournaments.createdAt));
  const stageRows = await db.select().from(stages).orderBy(desc(stages.eventDate));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader title="Etapas" subtitle="Eventos dentro de cada torneio." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Nova etapa</h2>
          <form action={createStageFormAction} className="space-y-3">
            <div>
              <Label>Torneio</Label>
              <Select name="tournamentId" required>
                {tournamentRows.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Nome</Label>
              <Input name="name" required placeholder="1ª Etapa — Ponta Negra" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Número</Label>
                <Input name="number" type="number" min={1} required />
              </div>
              <div>
                <Label>Data</Label>
                <Input name="eventDate" type="date" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Horário</Label>
                <Input name="eventTime" type="time" />
              </div>
              <div>
                <Label>Distância (km)</Label>
                <Input name="distanceKm" type="number" step="0.1" />
              </div>
            </div>
            <div>
              <Label>Local</Label>
              <Input name="location" />
            </div>
            <div>
              <Label>Descrição</Label>
              <TextArea name="description" rows={3} />
            </div>
            <Button type="submit">Criar etapa</Button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Etapas</h2>
          <ul className="space-y-2">
            {stageRows.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm"
              >
                <div>
                  <div className="font-medium">
                    {s.number}. {s.name}
                  </div>
                  <div className="text-xs text-white/45">
                    {s.eventDate} · {s.location}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{s.status}</Badge>
                  {s.status !== "homologated" && s.status !== "cancelled" && (
                    <Link href={`/admin/chegada/${s.id}`}>
                      <Button variant="ghost">Chegada</Button>
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
