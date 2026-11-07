import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { createTeamFormAction } from "@/lib/actions/forms";
import { readSession } from "@/lib/auth/session";
import { isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db/client";
import { teams, tournaments, users } from "@/lib/db/schema";
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

export default async function EquipesAdminPage() {
  const user = await readSession();
  if (!user || !isAdminRole(user.role)) redirect("/login");

  const tournamentRows = await db
    .select()
    .from(tournaments)
    .orderBy(desc(tournaments.createdAt));
  const teamRows = await db.select().from(teams).orderBy(desc(teams.createdAt));

  const captainIds = teamRows
    .map((t) => t.captainId)
    .filter((id): id is string => Boolean(id));
  const captainRows = captainIds.length
    ? await db.select().from(users).where(inArray(users.id, captainIds))
    : [];
  const cMap = new Map(captainRows.map((c) => [c.id, c]));
  const tMap = new Map(tournamentRows.map((t) => [t.id, t.name]));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader
        title="Equipes"
        subtitle="Ao criar a equipe, o capitão é cadastrado junto e já pode convocar atletas."
      />

      {!tournamentRows.length && (
        <Card className="mb-6">
          <p className="text-sm text-white/70">
            Ainda não há torneio. Crie uma{" "}
            <Link href="/admin/temporadas" className="text-[var(--giro-green)]">
              temporada
            </Link>{" "}
            e depois um{" "}
            <Link href="/admin/torneios" className="text-[var(--giro-green)]">
              torneio
            </Link>{" "}
            antes de cadastrar equipes.
          </p>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Nova equipe + capitão</h2>
          <form action={createTeamFormAction} className="space-y-3">
            <div>
              <Label>Torneio</Label>
              <Select name="tournamentId" required disabled={!tournamentRows.length}>
                <option value="">Selecione…</option>
                {tournamentRows.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Nome da equipe</Label>
              <Input name="name" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cor</Label>
                <Input name="color" type="color" defaultValue="#1B7A4E" />
              </div>
              <div>
                <Label>Máx. integrantes</Label>
                <Input name="maxMembers" type="number" defaultValue={10} min={2} />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <TextArea name="description" rows={2} />
            </div>

            <div className="border-t border-white/10 pt-4">
              <h3 className="mb-3 text-sm font-semibold text-[var(--giro-green)]">
                Capitão (criado junto)
              </h3>
              <div className="space-y-3">
                <div>
                  <Label>Nome do capitão</Label>
                  <Input name="captainName" required minLength={3} />
                </div>
                <div>
                  <Label>E-mail (login)</Label>
                  <Input name="captainEmail" type="email" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>CPF</Label>
                    <Input name="captainCpf" required placeholder="000.000.000-00" />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input name="captainPhone" />
                  </div>
                </div>
                <div>
                  <Label>Senha inicial</Label>
                  <Input name="captainPassword" type="password" required minLength={8} />
                </div>
              </div>
            </div>

            <Button type="submit" disabled={!tournamentRows.length}>
              Criar equipe e capitão
            </Button>
          </form>
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Equipes</h2>
          <ul className="space-y-2">
            {teamRows.map((t) => {
              const cap = t.captainId ? cMap.get(t.captainId) : null;
              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ background: t.color }}
                    />
                    <div>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-white/45">
                        {tMap.get(t.tournamentId)}
                        {cap
                          ? ` · Cap: ${cap.name} (${cap.email})`
                          : " · Sem capitão"}
                      </div>
                    </div>
                  </div>
                  <Badge>{t.status}</Badge>
                </li>
              );
            })}
            {!teamRows.length && (
              <li className="text-sm text-white/45">Nenhuma equipe ainda.</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
