import { eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  changePasswordFormAction,
  updateProfileFormAction,
} from "@/lib/actions/forms";
import { Card, PageHeader, Badge, Button, Input, Label } from "@/components/ui/primitives";
import { readSession, loadUserById } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { achievements, registrations, teams, tournaments, users } from "@/lib/db/schema";
import { getIndividualRanking, getTeamRanking } from "@/lib/scoring/rankings";

type Props = {
  searchParams: Promise<{ error?: string; ok?: string }>;
};

export default async function MePage({ searchParams }: Props) {
  const session = await readSession();
  if (!session) redirect("/login");
  const user = (await loadUserById(session.id)) ?? session;
  const [profile] = await db
    .select({ phone: users.phone, birthDate: users.birthDate })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  const { error, ok } = await searchParams;

  const myRegs = await db
    .select()
    .from(registrations)
    .where(eq(registrations.userId, user.id));

  const tournamentIds = myRegs.map((r) => r.tournamentId);
  const allTournaments = tournamentIds.length
    ? await db
        .select()
        .from(tournaments)
        .where(inArray(tournaments.id, tournamentIds))
    : [];
  const tMap = new Map(allTournaments.map((t) => [t.id, t]));

  const individual = await getIndividualRanking({});
  const me = individual.find((r) => r.userId === user.id);

  let teamRank = null as Awaited<ReturnType<typeof getTeamRanking>>[number] | null;
  if (me?.teamId) {
    const teamsRanking = await getTeamRanking({});
    teamRank = teamsRanking.find((t) => t.teamId === me.teamId) ?? null;
  }

  const medals = await db
    .select()
    .from(achievements)
    .where(eq(achievements.userId, user.id));

  const myTeamId = myRegs.find((r) => r.teamId)?.teamId;
  let myTeam = null as (typeof teams.$inferSelect) | null;
  if (myTeamId) {
    const [t] = await db.select().from(teams).where(eq(teams.id, myTeamId)).limit(1);
    myTeam = t ?? null;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader
        title={`Olá, ${user.name.split(" ")[0]}`}
        subtitle="Seu desempenho, perfil, equipe, inscrições e conquistas."
        actions={
          <Link href="/organizador">
            <Button variant="ghost">Painel Organizador</Button>
          </Link>
        }
      />

      {(error || ok) && (
        <p
          className={`mb-6 rounded-xl border px-3 py-2 text-sm ${
            error
              ? "border-red-500/30 bg-red-500/10 text-red-200"
              : "border-[var(--giro-green)]/30 bg-[var(--giro-green)]/10 text-[var(--giro-green)]"
          }`}
        >
          {error
            ? error
            : ok === "senha"
              ? "Senha atualizada."
              : "Perfil atualizado."}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="text-xs uppercase tracking-wide text-white/45">
            Classificação
          </div>
          <div className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--giro-gold)]">
            {me ? `${me.position}º` : "—"}
          </div>
          <div className="text-sm text-white/60">
            {me ? `${me.points} pts · ${me.stages} etapas` : "Sem pontos homologados"}
          </div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-white/45">Equipe</div>
          <div className="mt-2 text-xl font-semibold text-white">
            {myTeam?.name ?? "Sem equipe"}
          </div>
          <div className="text-sm text-white/60">
            {teamRank
              ? `${teamRank.position}º coletivo · ${teamRank.points} pts`
              : "Aguardando classificação coletiva"}
          </div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-white/45">
            Conquistas
          </div>
          <div className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--giro-green)]">
            {medals.length + (me?.podiums ?? 0)}
          </div>
          <div className="text-sm text-white/60">
            {me?.wins ?? 0} vitórias · {me?.podiums ?? 0} pódios
          </div>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Editar perfil</h2>
          <form action={updateProfileFormAction} className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input name="name" required minLength={3} defaultValue={user.name} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                name="phone"
                defaultValue={profile?.phone ?? ""}
                placeholder="(92) 90000-0000"
              />
            </div>
            <div>
              <Label>Data de nascimento</Label>
              <Input
                name="birthDate"
                type="date"
                required
                defaultValue={profile?.birthDate ?? ""}
              />
              <p className="mt-1 text-xs text-white/40">
                Usada para validar a categoria etária nos campeonatos.
              </p>
            </div>
            <div>
              <Label>URL da foto</Label>
              <Input
                name="photoUrl"
                type="url"
                defaultValue={user.photoUrl ?? ""}
                placeholder="https://..."
              />
            </div>
            <p className="text-xs text-white/40">E-mail: {user.email} · CPF: {user.cpf}</p>
            <Button type="submit">Salvar perfil</Button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Alterar senha</h2>
          <form action={changePasswordFormAction} className="space-y-3">
            <div>
              <Label>Senha atual</Label>
              <Input name="currentPassword" type="password" required minLength={8} />
            </div>
            <div>
              <Label>Nova senha</Label>
              <Input name="newPassword" type="password" required minLength={8} />
            </div>
            <div>
              <Label>Confirmar nova senha</Label>
              <Input name="confirmPassword" type="password" required minLength={8} />
            </div>
            <Button type="submit" variant="ghost">
              Atualizar senha
            </Button>
          </form>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Minhas inscrições</h2>
          <ul className="space-y-2">
            {myRegs.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm"
              >
                <Link href={`/torneios/${r.tournamentId}`} className="text-white hover:underline">
                  {tMap.get(r.tournamentId)?.name ?? "Torneio"}
                </Link>
                <Badge>{r.status}</Badge>
              </li>
            ))}
            {!myRegs.length && (
              <li className="text-sm text-white/45">
                Nenhuma inscrição.{" "}
                <Link href="/torneios" className="text-[var(--giro-green)]">
                  Ver torneios
                </Link>
              </li>
            )}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Medalhas</h2>
          <ul className="space-y-2">
            {medals.map((m) => (
              <li key={m.id} className="rounded-xl border border-white/10 px-3 py-2 text-sm">
                <div className="font-medium text-[var(--giro-gold)]">{m.title}</div>
                <div className="text-white/50">{m.description}</div>
              </li>
            ))}
            {!medals.length && (
              <li className="text-sm text-white/45">
                Conquistas oficiais aparecem aqui após a publicação dos campeões.
              </li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
