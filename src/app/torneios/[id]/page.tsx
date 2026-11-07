import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { cancelRegistrationAction } from "@/lib/actions/championships";
import {
  registerTournamentFormAction,
  requestJoinTeamFormAction,
} from "@/lib/actions/forms";
import { readSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { registrations, stages, teams, tournaments } from "@/lib/db/schema";
import {
  Badge,
  Button,
  Card,
  Label,
  PageHeader,
  Select,
} from "@/components/ui/primitives";

export default async function TorneioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, id))
    .limit(1);
  if (!tournament) notFound();

  const stageRows = await db
    .select()
    .from(stages)
    .where(eq(stages.tournamentId, id));
  const teamRows = await db
    .select()
    .from(teams)
    .where(and(eq(teams.tournamentId, id), eq(teams.status, "active")));
  const user = await readSession();

  let myReg: (typeof registrations.$inferSelect) | null = null;
  if (user) {
    const [reg] = await db
      .select()
      .from(registrations)
      .where(
        and(
          eq(registrations.tournamentId, id),
          eq(registrations.userId, user.id),
        ),
      )
      .limit(1);
    myReg = reg ?? null;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader
        title={tournament.name}
        subtitle={tournament.description ?? undefined}
        actions={<Badge>{tournament.status.replaceAll("_", " ")}</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-white">Regulamento</h2>
          <p className="whitespace-pre-wrap text-sm text-white/65">
            {tournament.regulation || "Regulamento ainda não publicado."}
          </p>
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/45">
              Etapas
            </h3>
            <ul className="space-y-2">
              {stageRows.map((s) => (
                <li
                  key={s.id}
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-white">
                    {s.number}. {s.name}
                  </span>
                  <span className="ml-2 text-white/45">
                    {s.eventDate} · {s.status}
                  </span>
                </li>
              ))}
              {!stageRows.length && (
                <li className="text-sm text-white/45">Nenhuma etapa cadastrada.</li>
              )}
            </ul>
          </div>

          {tournament.allowTeams && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/45">
                Equipes
              </h3>
              <ul className="space-y-2">
                {teamRows.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: t.color }}
                      />
                      {t.name}
                    </span>
                    {user && (
                      <form action={requestJoinTeamFormAction}>
                        <input type="hidden" name="teamId" value={t.id} />
                        <Button type="submit" variant="ghost">
                          Pedir vaga
                        </Button>
                      </form>
                    )}
                  </li>
                ))}
                {!teamRows.length && (
                  <li className="text-sm text-white/45">Nenhuma equipe neste torneio.</li>
                )}
              </ul>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold text-white">Inscrição</h2>
          {!user && (
            <p className="text-sm text-white/55">
              <Link href="/login" className="text-[var(--giro-green)]">
                Faça login
              </Link>{" "}
              para se inscrever. O CPF da conta será validado automaticamente.
            </p>
          )}
          {user && myReg && myReg.status !== "cancelled" && (
            <div className="space-y-3">
              <p className="text-sm text-white/70">
                Status: <Badge>{myReg.status}</Badge>
              </p>
              <form
                action={async () => {
                  "use server";
                  await cancelRegistrationAction(myReg!.id);
                }}
              >
                <Button type="submit" variant="danger" className="w-full">
                  Cancelar inscrição
                </Button>
              </form>
            </div>
          )}
          {user && (!myReg || myReg.status === "cancelled") && (
            <form action={registerTournamentFormAction} className="space-y-3">
              <input type="hidden" name="tournamentId" value={tournament.id} />
              {tournament.allowTeams && (
                <div>
                  <Label>Equipe (opcional)</Label>
                  <Select name="teamId" defaultValue="">
                    <option value="">Sem equipe</option>
                    {teamRows.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              <Button type="submit" className="w-full">
                Inscrever-se
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
