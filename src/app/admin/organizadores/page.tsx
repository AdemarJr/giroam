import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import {
  listOrganizerApplications,
  listPlatformPayments,
  reviewEventAction,
  reviewOrganizerAction,
  setPlatformFeeAction,
} from "@/lib/actions/admin-organizers";
import { isAdminRole, isSuperAdmin } from "@/lib/auth/roles";
import { readSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { tournaments } from "@/lib/db/schema";
import {
  Badge,
  Button,
  Card,
  Input,
  Label,
  PageHeader,
  Select,
} from "@/components/ui/primitives";

export default async function AdminOrganizadoresPage() {
  const user = await readSession();
  if (!user || !isAdminRole(user.role)) redirect("/login");

  const apps = await listOrganizerApplications();
  const pendingEvents = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.approvalStatus, "pending_review"));
  const platformPays = await listPlatformPayments();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader
        title="Organizadores e auditoria"
        subtitle="Aprovar organizadores, eventos e acompanhar cobranças da plataforma."
      />

      {isSuperAdmin(user.role) && (
        <Card className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-white">
            Taxa administrativa (config futura de split)
          </h2>
          <form action={setPlatformFeeAction} className="flex flex-wrap items-end gap-3">
            <div>
              <Label>% plataforma</Label>
              <Input name="percent" defaultValue="0" className="w-28" />
            </div>
            <Button type="submit">Salvar</Button>
          </form>
          <p className="mt-2 text-xs text-white/45">
            Split Asaas só deve ser ativado após validação no provedor — esta
            taxa fica registrada para uso futuro.
          </p>
        </Card>
      )}

      <Card className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-white">Solicitações</h2>
        <ul className="space-y-3">
          {apps.map(({ profile, user: u }) => (
            <li
              key={profile.userId}
              className="rounded-xl border border-white/10 p-3 text-sm"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <strong className="text-white">{profile.displayName}</strong>
                <Badge>{profile.status}</Badge>
                <span className="text-white/45">
                  {u.email} · {u.name}
                </span>
              </div>
              <form action={reviewOrganizerAction} className="flex flex-wrap gap-2">
                <input type="hidden" name="userId" value={profile.userId} />
                <Select name="decision" defaultValue={profile.status}>
                  <option value="pending">pending</option>
                  <option value="approved">approved</option>
                  <option value="blocked">blocked</option>
                </Select>
                <Input name="platformFeePercent" placeholder="% fee" className="w-24" />
                <Input name="notes" placeholder="Notas" className="min-w-[12rem] flex-1" />
                <Button type="submit">Salvar</Button>
              </form>
            </li>
          ))}
          {!apps.length && (
            <li className="text-white/45">Nenhuma solicitação.</li>
          )}
        </ul>
      </Card>

      <Card className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-white">
          Eventos aguardando revisão
        </h2>
        <ul className="space-y-3">
          {pendingEvents.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm"
            >
              <div>
                <div className="font-medium text-white">{t.name}</div>
                <div className="text-white/45">
                  {t.kind} · {t.paymentMode}
                </div>
              </div>
              <form action={reviewEventAction} className="flex gap-2">
                <input type="hidden" name="id" value={t.id} />
                <Select name="approvalStatus" defaultValue="approved">
                  <option value="approved">Aprovar</option>
                  <option value="rejected">Rejeitar</option>
                  <option value="suspended">Suspender</option>
                  <option value="pending_review">Manter</option>
                </Select>
                <Button type="submit">Aplicar</Button>
              </form>
            </li>
          ))}
          {!pendingEvents.length && (
            <li className="text-white/45">Nenhum evento pendente.</li>
          )}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold text-white">
          Transações recentes
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-white/45">
              <tr>
                <th className="py-2">Organizador</th>
                <th>Evento</th>
                <th>Status</th>
                <th>Valor</th>
                <th>Gateway</th>
              </tr>
            </thead>
            <tbody>
              {platformPays.slice(0, 50).map((p) => (
                <tr key={p.payment.id} className="border-t border-white/10">
                  <td className="py-2">{p.organizerName}</td>
                  <td>{p.tournamentName}</td>
                  <td>
                    <Badge>{p.payment.status}</Badge>
                  </td>
                  <td>
                    {(p.payment.amountCents / 100).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                  <td className="text-xs text-white/45">
                    {p.payment.gatewayPaymentId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
