import Link from "next/link";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/session";
import { isCaptain, isAdminRole } from "@/lib/auth/roles";
import { db } from "@/lib/db/client";
import { teams, tournaments } from "@/lib/db/schema";
import { Badge, Button, Card, PageHeader } from "@/components/ui/primitives";

export default async function CapitaoHomePage() {
  const user = await readSession();
  if (!user) redirect("/login");
  if (!isCaptain(user.role) && !isAdminRole(user.role)) redirect("/me");

  const myTeams =
    user.role === "captain"
      ? await db.select().from(teams).where(eq(teams.captainId, user.id))
      : [];

  const tournamentRows = myTeams.length
    ? await db.select().from(tournaments)
    : [];
  const tMap = new Map(tournamentRows.map((t) => [t.id, t.name]));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        title="Área do Capitão"
        subtitle="Cadastre atletas, envie links de uso único, inscreva-se nos torneios e acompanhe resultados."
      />

      <Card className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Suas equipes</h2>
        <ul className="space-y-2">
          {myTeams.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm"
            >
              <span>
                <span className="font-medium">{t.name}</span>
                <span className="ml-2 text-white/45">
                  {tMap.get(t.tournamentId)}
                </span>
              </span>
              <Badge>{t.status}</Badge>
            </li>
          ))}
          {!myTeams.length && (
            <li className="text-sm text-white/50">
              Nenhuma equipe vinculada ainda. O admin cria a equipe em Admin →
              Equipes e cadastra o capitão no mesmo formulário.
            </li>
          )}
        </ul>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h3 className="mb-2 font-semibold">Atletas</h3>
          <p className="mb-4 text-sm text-white/55">
            Cadastre direto ou gere link temporário (vale uma vez).
          </p>
          <Link href="/capitao/convites">
            <Button className="w-full">Atletas / convites</Button>
          </Link>
        </Card>
        <Card>
          <h3 className="mb-2 font-semibold">Elenco</h3>
          <p className="mb-4 text-sm text-white/55">
            Aprove pedidos e remova integrantes.
          </p>
          <Link href="/capitao/equipe">
            <Button variant="ghost" className="w-full">
              Elenco e pedidos
            </Button>
          </Link>
        </Card>
        <Card className="sm:col-span-2">
          <h3 className="mb-2 font-semibold">Torneios e resultados</h3>
          <p className="mb-4 text-sm text-white/55">
            Inscreva-se no campeonato e acompanhe seu desempenho e o dos atletas.
          </p>
          <Link href="/capitao/resultados">
            <Button variant="gold" className="w-full">
              Ver torneios e resultados
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
