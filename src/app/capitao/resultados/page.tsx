import Link from "next/link";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/session";
import { isCaptain, isAdminRole } from "@/lib/auth/roles";
import { getCaptainDashboard } from "@/lib/actions/captain";
import { registerTournamentFormAction } from "@/lib/actions/forms";
import {
  Badge,
  Button,
  Card,
  PageHeader,
} from "@/components/ui/primitives";

export default async function CapitaoResultadosPage() {
  const user = await readSession();
  if (!user) redirect("/login");
  if (!isCaptain(user.role) && !isAdminRole(user.role)) redirect("/me");

  let data: Awaited<ReturnType<typeof getCaptainDashboard>> | null = null;
  try {
    data = await getCaptainDashboard();
  } catch {
    data = null;
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <PageHeader title="Torneios e resultados" />
        <Card>
          <p className="text-sm text-white/60">Não foi possível carregar os dados.</p>
        </Card>
      </div>
    );
  }

  const teamById = new Map(data.teams.map((t) => [t.id, t]));
  const nameById = new Map(data.members.map((m) => [m.userId, m.name]));
  nameById.set(data.captain.id, data.captain.name);
  const pointsById = new Map(data.finalPoints.map((p) => [p.userId, p.points]));
  const myRegs = data.registrations.filter((r) => r.userId === data.captain.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <PageHeader
        title="Torneios e resultados"
        subtitle="Inscreva-se nos campeonatos da sua equipe e acompanhe o desempenho do elenco e o seu."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <div className="text-xs uppercase tracking-wide text-white/45">
            Seu ranking
          </div>
          <div className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--giro-gold)]">
            {data.myRank ? `${data.myRank.position}º` : "—"}
          </div>
          <div className="text-sm text-white/60">
            {data.myRank
              ? `${data.myRank.points} pts · ${data.myRank.stages} etapas`
              : "Sem pontos homologados ainda"}
          </div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-white/45">
            Atletas na equipe
          </div>
          <div className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--giro-green)]">
            {data.members.length}
          </div>
          <div className="text-sm text-white/60">
            {data.athleteRanks.length} com pontos no ranking
          </div>
        </Card>
      </div>

      <Card className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Torneios da equipe</h2>
        <ul className="space-y-3">
          {data.tournaments.map((t) => {
            const team = data.teams.find((tm) => tm.tournamentId === t.id);
            const alreadyIn = myRegs.some(
              (r) => r.tournamentId === t.id && r.status !== "cancelled",
            );
            const canRegister =
              !alreadyIn &&
              (t.status === "registration_open" || t.status === "in_progress");

            return (
              <li
                key={t.id}
                className="rounded-xl border border-white/10 px-3 py-3 text-sm"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Link
                      href={`/torneios/${t.id}`}
                      className="font-medium hover:underline"
                    >
                      {t.name}
                    </Link>
                    <div className="text-white/45">
                      {team?.name ?? "Equipe"} ·{" "}
                      <Badge>{t.status.replaceAll("_", " ")}</Badge>
                    </div>
                  </div>
                  {alreadyIn && <Badge tone="gold">Você inscrito</Badge>}
                </div>
                {canRegister && team && (
                  <form action={registerTournamentFormAction}>
                    <input type="hidden" name="tournamentId" value={t.id} />
                    <input type="hidden" name="teamId" value={team.id} />
                    <Button type="submit">Inscrever-me neste torneio</Button>
                  </form>
                )}
                {!canRegister && !alreadyIn && (
                  <p className="text-xs text-white/40">
                    Inscrições indisponíveis no momento.
                  </p>
                )}
              </li>
            );
          })}
          {!data.tournaments.length && (
            <li className="text-sm text-white/45">
              Nenhuma equipe/torneio vinculado.{" "}
              <Link href="/torneios" className="text-[var(--giro-green)]">
                Ver torneios públicos
              </Link>
            </li>
          )}
        </ul>
      </Card>

      <Card className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Desempenho dos atletas</h2>
        <ul className="space-y-2">
          {data.members.map((m) => {
            const rank = data.athleteRanks.find((r) => r.userId === m.userId);
            const pts = pointsById.get(m.userId) ?? rank?.points ?? 0;
            const team = teamById.get(m.teamId);
            return (
              <li
                key={`${m.teamId}-${m.userId}`}
                className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm"
              >
                <div>
                  <div className="font-medium">
                    {m.name}
                    {m.userId === data.captain.id ? " (você)" : ""}
                  </div>
                  <div className="text-xs text-white/45">{team?.name}</div>
                </div>
                <div className="text-right text-white/70">
                  {rank ? `${rank.position}º` : "—"} · {pts} pts
                </div>
              </li>
            );
          })}
          {!data.members.length && (
            <li className="text-sm text-white/45">
              Cadastre atletas em{" "}
              <Link href="/capitao/convites" className="text-[var(--giro-green)]">
                Atletas / convites
              </Link>
              .
            </li>
          )}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Resultados recentes</h2>
        <ul className="space-y-2">
          {data.recentResults.map((r, idx) => (
            <li
              key={`${r.stageId}-${r.userId}-${idx}`}
              className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm"
            >
              <div>
                <div className="font-medium">
                  {nameById.get(r.userId) ?? "Atleta"}
                </div>
                <div className="text-xs text-white/45">
                  {r.stageNumber}. {r.stageName} · {r.eventDate}
                </div>
              </div>
              <Badge>
                {r.place ? `${r.place}º` : r.status} · {r.pointsFinal ?? 0} pts
              </Badge>
            </li>
          ))}
          {!data.recentResults.length && (
            <li className="text-sm text-white/45">
              Ainda não há resultados de chegada/homologação.
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
