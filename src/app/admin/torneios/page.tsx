import { desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import {
  updateTournamentStatusAction,
} from "@/lib/actions/championships";
import { createTournamentFormAction } from "@/lib/actions/forms";
import { readSession } from "@/lib/auth/session";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db/client";
import { seasons, tournaments } from "@/lib/db/schema";
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


export default async function TorneiosAdminPage() {
  const user = await readSession();
  if (!user || !isAdminRole(user.role)) redirect("/login");

  const seasonRows = await db.select().from(seasons).orderBy(desc(seasons.year));
  const rows = await db.select().from(tournaments).orderBy(desc(tournaments.createdAt));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader title="Torneios" subtitle="Cadastro e status das competições." />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Novo torneio</h2>
          <form action={createTournamentFormAction} className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input name="name" required />
            </div>
            <div>
              <Label>Temporada</Label>
              <Select name="seasonId" required defaultValue={seasonRows[0]?.id}>
                {seasonRows.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Modalidade</Label>
              <Select name="modality" defaultValue="ciclismo">
                <option value="ciclismo">Ciclismo</option>
                <option value="mtb">MTB</option>
                <option value="triathlon">Triathlon</option>
                <option value="gravel">Gravel</option>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Início</Label>
                <Input name="startsAt" type="date" required />
              </div>
              <div>
                <Label>Término</Label>
                <Input name="endsAt" type="date" required />
              </div>
            </div>
            <div>
              <Label>Máx. participantes</Label>
              <Input name="maxParticipants" type="number" min={1} />
            </div>
            <div>
              <Label>Descrição</Label>
              <TextArea name="description" rows={3} />
            </div>
            <div>
              <Label>Regulamento</Label>
              <TextArea name="regulation" rows={4} />
            </div>
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input type="checkbox" name="autoApprove" value="true" defaultChecked />
              Aprovar inscrições automaticamente
            </label>
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input type="checkbox" name="allowTeams" value="true" defaultChecked />
              Permitir equipes
            </label>
            <Button type="submit">Criar torneio</Button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Torneios cadastrados</h2>
          <ul className="space-y-3">
            {rows.map((t) => (
              <li key={t.id} className="rounded-xl border border-white/10 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-xs text-white/45">
                      {t.modality} · {t.startsAt} → {t.endsAt}
                    </div>
                  </div>
                  <Badge>{t.status.replaceAll("_", " ")}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(
                    [
                      "registration_open",
                      "registration_closed",
                      "in_progress",
                      "finished",
                      "cancelled",
                    ] as const
                  ).map((status) => (
                    <form
                      key={status}
                      action={async () => {
                        "use server";
                        await updateTournamentStatusAction(t.id, status);
                      }}
                    >
                      <Button type="submit" variant="ghost">
                        {status.replaceAll("_", " ")}
                      </Button>
                    </form>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
