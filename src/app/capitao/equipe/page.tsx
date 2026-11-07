import Link from "next/link";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/session";
import { isCaptain, isAdminRole } from "@/lib/auth/roles";
import { listCaptainTeamData } from "@/lib/actions/teams";
import {
  removeTeamMemberFormAction,
  resolveJoinRequestFormAction,
} from "@/lib/actions/forms";
import {
  Badge,
  Button,
  Card,
  PageHeader,
} from "@/components/ui/primitives";

export default async function CapitaoEquipePage() {
  const user = await readSession();
  if (!user) redirect("/login");
  if (!isCaptain(user.role) && !isAdminRole(user.role)) redirect("/me");

  let data: Awaited<ReturnType<typeof listCaptainTeamData>> = {
    teams: [],
    members: [],
    requests: [],
  };
  try {
    data = await listCaptainTeamData();
  } catch {
    data = { teams: [], members: [], requests: [] };
  }

  const teamName = new Map(data.teams.map((t) => [t.id, t.name]));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <PageHeader
        title="Elenco e solicitações"
        subtitle="Aprove pedidos de entrada e gerencie os atletas da equipe."
        actions={
          <Link href="/capitao/convites">
            <Button variant="ghost">Convites de cadastro</Button>
          </Link>
        }
      />

      <Card className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Solicitações pendentes</h2>
        <ul className="space-y-3">
          {data.requests.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-3 text-sm"
            >
              <div>
                <div className="font-medium">{r.name}</div>
                <div className="text-white/45">
                  {r.email} · {teamName.get(r.teamId) ?? "Equipe"}
                </div>
              </div>
              <div className="flex gap-2">
                <form action={resolveJoinRequestFormAction}>
                  <input type="hidden" name="requestId" value={r.id} />
                  <input type="hidden" name="decision" value="approved" />
                  <Button type="submit" variant="gold">
                    Aprovar
                  </Button>
                </form>
                <form action={resolveJoinRequestFormAction}>
                  <input type="hidden" name="requestId" value={r.id} />
                  <input type="hidden" name="decision" value="rejected" />
                  <Button type="submit" variant="danger">
                    Recusar
                  </Button>
                </form>
              </div>
            </li>
          ))}
          {!data.requests.length && (
            <li className="text-sm text-white/45">Nenhuma solicitação pendente.</li>
          )}
        </ul>
      </Card>

      {data.teams.map((team) => {
        const roster = data.members.filter((m) => m.teamId === team.id);
        return (
          <Card key={team.id} className="mb-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{team.name}</h2>
              <Badge>
                {roster.length}/{team.maxMembers}
              </Badge>
            </div>
            <ul className="space-y-2">
              {roster.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm"
                >
                  <span>
                    <span className="font-medium">{m.name}</span>
                    <span className="ml-2 text-white/45">{m.email}</span>
                    {m.userId === team.captainId && (
                      <span className="ml-2">
                        <Badge tone="gold">Capitão</Badge>
                      </span>
                    )}
                  </span>
                  {m.userId !== team.captainId && (
                    <form action={removeTeamMemberFormAction}>
                      <input type="hidden" name="teamId" value={team.id} />
                      <input type="hidden" name="userId" value={m.userId} />
                      <Button type="submit" variant="ghost">
                        Remover
                      </Button>
                    </form>
                  )}
                </li>
              ))}
              {!roster.length && (
                <li className="text-sm text-white/45">Sem atletas ainda.</li>
              )}
            </ul>
          </Card>
        );
      })}

      {!data.teams.length && (
        <Card>
          <p className="text-sm text-white/60">
            Você ainda não é capitão de nenhuma equipe. O admin cria a equipe em
            Admin → Equipes junto com a conta do capitão.
          </p>
        </Card>
      )}
    </div>
  );
}
