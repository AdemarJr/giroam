import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { cancelRegistrationAction } from "@/lib/actions/championships";
import {
  enrollEventFormAction,
  requestJoinTeamFormAction,
} from "@/lib/actions/forms";
import { readSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import {
  eventCategories,
  registrationLots,
  registrations,
  stages,
  teams,
  tournaments,
} from "@/lib/db/schema";
import { formatAgeRange } from "@/lib/categories/age-presets";
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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, id))
    .limit(1);
  if (!tournament) notFound();

  const stageRows = await db
    .select()
    .from(stages)
    .where(eq(stages.tournamentId, id))
    .orderBy(asc(stages.number));
  const teamRows = await db
    .select()
    .from(teams)
    .where(and(eq(teams.tournamentId, id), eq(teams.status, "active")));
  const categories = await db
    .select()
    .from(eventCategories)
    .where(
      and(
        eq(eventCategories.tournamentId, id),
        eq(eventCategories.active, true),
      ),
    )
    .orderBy(asc(eventCategories.sortOrder));
  const lots = await db
    .select()
    .from(registrationLots)
    .where(
      and(
        eq(registrationLots.tournamentId, id),
        eq(registrationLots.active, true),
      ),
    );
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

  const priceLabel =
    tournament.paymentMode === "free"
      ? "Gratuito"
      : (tournament.priceCents / 100).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {tournament.bannerUrl && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tournament.bannerUrl}
            alt={`Banner ${tournament.name}`}
            className="max-h-[360px] w-full object-cover"
          />
        </div>
      )}

      <PageHeader
        title={tournament.name}
        subtitle={tournament.description ?? undefined}
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge>{tournament.kind}</Badge>
            <Badge>{tournament.status.replaceAll("_", " ")}</Badge>
            <Badge>{priceLabel}</Badge>
          </div>
        }
      />

      {sp.error && (
        <Card className="mb-4 border-rose-500/40 text-sm text-rose-200">
          {sp.error}
        </Card>
      )}
      {sp.ok && (
        <Card className="mb-4 border-[var(--giro-green)]/40 text-sm text-[var(--giro-green)]">
          Inscrição registrada.
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-white">Regulamento</h2>
          <p className="whitespace-pre-wrap text-sm text-white/65">
            {tournament.regulation || "Regulamento ainda não publicado."}
          </p>

          {(tournament.location || tournament.routeInfo) && (
            <div className="mt-6 space-y-2 text-sm text-white/70">
              {tournament.location && (
                <p>
                  <span className="text-white/45">Local: </span>
                  {tournament.location}
                </p>
              )}
              {tournament.routeInfo && (
                <p className="whitespace-pre-wrap">
                  <span className="text-white/45">Percurso: </span>
                  {tournament.routeInfo}
                </p>
              )}
            </div>
          )}

          {categories.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/45">
                Categorias por idade
              </h3>
              <ul className="space-y-2">
                {categories.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80"
                  >
                    <div className="font-medium text-white">{c.name}</div>
                    <div className="text-xs text-white/45">
                      {formatAgeRange(c.minAge, c.maxAge)}
                      {c.gender ? ` · ${c.gender}` : ""}
                      {c.description ? ` · ${c.description}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {lots.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/45">
                Lotes
              </h3>
              <ul className="space-y-2">
                {lots.map((l) => (
                  <li
                    key={l.id}
                    className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80"
                  >
                    {l.name}:{" "}
                    {(l.priceCents / 100).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </li>
                ))}
              </ul>
            </div>
          )}

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
                  <li className="text-sm text-white/45">
                    Nenhuma equipe neste torneio.
                  </li>
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
              para se inscrever.
            </p>
          )}
          {user && myReg && myReg.status !== "cancelled" && (
            <div className="space-y-3">
              <p className="text-sm text-white/70">
                Status: <Badge>{myReg.status}</Badge>
              </p>
              {myReg.status === "awaiting_payment" && (
                <Link href={`/torneios/${id}/pagamento?reg=${myReg.id}`}>
                  <Button className="w-full" variant="gold">
                    Pagar inscrição
                  </Button>
                </Link>
              )}
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
            <form action={enrollEventFormAction} className="space-y-3">
              <input type="hidden" name="tournamentId" value={tournament.id} />
              {categories.length > 0 && (
                <div>
                  <Label>Categoria etária</Label>
                  <Select name="categoryId" required>
                    <option value="">Selecione sua faixa etária</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({formatAgeRange(c.minAge, c.maxAge)}
                        {c.gender ? ` · ${c.gender}` : ""})
                      </option>
                    ))}
                  </Select>
                  <p className="mt-1 text-xs text-white/45">
                    A idade é validada pela data de nascimento do seu perfil.
                  </p>
                </div>
              )}
              {lots.length > 0 && (
                <div>
                  <Label>Lote</Label>
                  <Select name="lotId">
                    <option value="">Valor padrão ({priceLabel})</option>
                    {lots.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} —{" "}
                        {(l.priceCents / 100).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
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
                {tournament.paymentMode === "free"
                  ? "Inscrever-se"
                  : "Inscrever-se e pagar"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
