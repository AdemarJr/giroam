import Link from "next/link";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { applyOrganizerAction, listOrganizerDashboard } from "@/lib/actions/organizer";
import { isOrganizer } from "@/lib/auth/roles";
import { readSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { organizerProfiles } from "@/lib/db/schema";
import {
  Badge,
  Button,
  Card,
  Input,
  Label,
  PageHeader,
  TextArea,
} from "@/components/ui/primitives";

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default async function OrganizadorHomePage() {
  const session = await readSession();
  if (!session) redirect("/login");

  const [profileRow] = await db
    .select()
    .from(organizerProfiles)
    .where(eq(organizerProfiles.userId, session.id))
    .limit(1);

  let data: Awaited<ReturnType<typeof listOrganizerDashboard>> | null = null;
  try {
    if (isOrganizer(session.role)) {
      data = await listOrganizerDashboard();
    }
  } catch {
    data = null;
  }

  const profile = data?.profile ?? profileRow ?? null;
  const approved = profile?.status === "approved" || session.role === "super_admin";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <PageHeader
        title="Painel do Organizador"
        subtitle="Crie campeonatos, eventos e acompanhe inscrições e recebimentos."
        actions={
          <Badge>
            {profile?.status === "approved"
              ? "aprovado"
              : profile?.status === "blocked"
                ? "bloqueado"
                : profile
                  ? "pendente"
                  : "sem perfil"}
          </Badge>
        }
      />

      {!profile && (
        <Card className="mb-8">
          <h2 className="mb-2 text-lg font-semibold text-white">
            Solicitar perfil Organizador
          </h2>
          <p className="mb-4 text-sm text-white/60">
            Após o envio, um administrador precisa aprovar seu acesso antes de
            publicar eventos pagos ou gratuitos.
          </p>
          <form action={applyOrganizerAction} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Nome público / organização</Label>
              <Input name="displayName" required defaultValue={session.name} />
            </div>
            <div>
              <Label>CPF/CNPJ</Label>
              <Input name="document" />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input name="phone" />
            </div>
            <div className="sm:col-span-2">
              <Label>Sobre</Label>
              <TextArea name="bio" rows={3} />
            </div>
            <div>
              <Button type="submit">Enviar solicitação</Button>
            </div>
          </form>
        </Card>
      )}

      {profile && !approved && (
        <Card className="mb-8 border-amber-500/30">
          <p className="text-sm text-amber-200">
            Seu perfil está <strong>{profile.status}</strong>. Aguarde a
            aprovação do administrador para criar e publicar eventos.
          </p>
        </Card>
      )}

      {data && (
        <>
          <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Eventos", data.tournaments.length],
              ["Inscrições", data.finance.registrations],
              ["Pagas", data.finance.paid],
              ["Pendentes", data.finance.pending],
            ].map(([label, value]) => (
              <Card key={String(label)}>
                <div className="text-xs uppercase tracking-wide text-white/45">
                  {label}
                </div>
                <div className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--giro-green)]">
                  {value}
                </div>
              </Card>
            ))}
          </div>

          <div className="mb-8 grid gap-3 sm:grid-cols-3">
            <Card>
              <div className="text-xs uppercase text-white/45">Bruto arrecadado</div>
              <div className="mt-2 text-2xl text-white">{brl(data.finance.grossCents)}</div>
            </Card>
            <Card>
              <div className="text-xs uppercase text-white/45">Taxas gateway</div>
              <div className="mt-2 text-2xl text-white">{brl(data.finance.feeCents)}</div>
            </Card>
            <Card>
              <div className="text-xs uppercase text-white/45">Líquido (gateway)</div>
              <div className="mt-2 text-2xl text-[var(--giro-gold)]">
                {brl(data.finance.netCents)}
              </div>
              <p className="mt-2 text-xs text-white/45">
                Não equivale automaticamente a saldo disponível para saque.
              </p>
            </Card>
          </div>

          {!data.asaasEnabled && (
            <Card className="mb-8 border-rose-500/30">
              <p className="text-sm text-rose-200">
                Gateway Asaas não configurado (`ASAAS_API_KEY`). Eventos pagos
                ficam bloqueados até a integração real.
              </p>
            </Card>
          )}

          {approved && (
            <div className="mb-8 flex flex-wrap gap-2">
              {[
                ["/organizador/temporadas", "Temporadas"],
                ["/organizador/eventos", "Eventos"],
                ["/organizador/etapas", "Etapas"],
                ["/organizador/categorias", "Categorias"],
                ["/organizador/lotes", "Lotes"],
                ["/organizador/inscricoes", "Inscrições"],
                ["/organizador/financeiro", "Financeiro"],
              ].map(([href, label]) => (
                <Link key={href} href={href}>
                  <Button variant="ghost">{label}</Button>
                </Link>
              ))}
            </div>
          )}

          <Card>
            <h2 className="mb-3 text-lg font-semibold text-white">Seus eventos</h2>
            <ul className="space-y-2">
              {data.tournaments.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium text-white">{t.name}</div>
                    <div className="text-white/45">
                      {t.kind} · {t.status} · {t.approvalStatus} ·{" "}
                      {t.paymentMode === "free"
                        ? "grátis"
                        : brl(t.priceCents)}
                    </div>
                  </div>
                  <Link href={`/torneios/${t.id}`}>
                    <Button variant="ghost">Ver página</Button>
                  </Link>
                </li>
              ))}
              {!data.tournaments.length && (
                <li className="text-sm text-white/45">Nenhum evento ainda.</li>
              )}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
