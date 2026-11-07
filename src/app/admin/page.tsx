import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminRole, isSuperAdmin } from "@/lib/auth/roles";
import { readSession } from "@/lib/auth/session";
import { getAdminStats } from "@/lib/actions/championships";
import { Button, Card, PageHeader } from "@/components/ui/primitives";


export default async function AdminDashboardPage() {
  const user = await readSession();
  if (!user || !isAdminRole(user.role)) redirect("/login");

  let stats = {
    tournamentsActive: 0,
    seasons: 0,
    registrations: 0,
    teams: 0,
    stagesDone: 0,
    pendingHomologation: 0,
    upcoming: [] as Awaited<ReturnType<typeof getAdminStats>>["upcoming"],
  };

  try {
    stats = await getAdminStats();
  } catch {
    // DB offline
  }

  const cards = [
    { label: "Torneios ativos", value: stats.tournamentsActive },
    { label: "Temporadas", value: stats.seasons },
    { label: "Inscrições", value: stats.registrations },
    { label: "Equipes", value: stats.teams },
    { label: "Etapas homologadas", value: stats.stagesDone },
    { label: "Aguardando homologação", value: stats.pendingHomologation },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <PageHeader
        title="Painel administrativo"
        subtitle="Operação do campeonato GiroAm no EasyPanel."
      />

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <div className="text-xs uppercase tracking-wide text-white/45">
              {c.label}
            </div>
            <div className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--giro-green)]">
              {c.value}
            </div>
          </Card>
        ))}
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        {[
          ["/admin/temporadas", "Nova temporada / listar"],
          ["/admin/torneios", "Novo torneio"],
          ["/admin/etapas", "Nova etapa"],
          ["/admin/inscricoes", "Gerenciar inscrições"],
          ["/admin/equipes", "Equipes + capitães"],
          ...(isSuperAdmin(user.role)
            ? [["/admin/capitaes", "Capitães (lista)"] as const]
            : []),
          ["/admin/organizadores", "Organizadores / financeiro"],
          ["/admin/chegada", "Registrar chegada"],
          ["/admin/homologacao", "Homologar resultados"],
          ["/admin/relatorios", "Relatórios"],
        ].map(([href, label]) => (
          <Link key={href} href={href}>
            <Button variant={href.includes("chegada") ? "gold" : "ghost"}>
              {label}
            </Button>
          </Link>
        ))}
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Próximas competições</h2>
        <ul className="space-y-2">
          {stats.upcoming.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm"
            >
              <span>
                {s.number}. {s.name}
              </span>
              <span className="text-white/45">
                {s.eventDate} {s.eventTime ?? ""}
              </span>
            </li>
          ))}
          {!stats.upcoming.length && (
            <li className="text-sm text-white/45">Nenhuma etapa agendada.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
