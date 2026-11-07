import Link from "next/link";
import { redirect } from "next/navigation";
import {
  listOrganizerDashboard,
  listOrganizerPayments,
} from "@/lib/actions/organizer";
import { isOrganizer } from "@/lib/auth/roles";
import { readSession } from "@/lib/auth/session";
import { Badge, Button, Card, PageHeader } from "@/components/ui/primitives";

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default async function OrganizadorFinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; tournamentId?: string }>;
}) {
  const user = await readSession();
  if (!user || !isOrganizer(user.role)) redirect("/organizador");
  const sp = await searchParams;
  const data = await listOrganizerDashboard();
  const payments = await listOrganizerPayments({
    status: sp.status,
    tournamentId: sp.tournamentId,
  });

  const cancelled = payments.filter((p) =>
    ["cancelled", "refunded", "failed", "overdue"].includes(p.payment.status),
  ).length;

  const csv = [
    "id,evento,participante,status,bruto,taxa,liquido,gateway_id,pago_em",
    ...payments.map((p) =>
      [
        p.payment.id,
        JSON.stringify(p.tournamentName),
        JSON.stringify(p.userName),
        p.payment.status,
        (p.payment.amountCents / 100).toFixed(2),
        ((p.payment.feeCents ?? 0) / 100).toFixed(2),
        ((p.payment.netAmountCents ?? 0) / 100).toFixed(2),
        p.payment.gatewayPaymentId ?? "",
        p.payment.paidAt?.toISOString() ?? "",
      ].join(","),
    ),
  ].join("\n");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader
        title="Financeiro"
        subtitle="Indicadores com base nas cobranças Asaas do seu organizador."
        actions={
          <a
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
            download="financeiro-giroam.csv"
          >
            <Button variant="ghost">Exportar CSV</Button>
          </a>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Inscrições", data.finance.registrations],
          ["Pagas", data.finance.paid],
          ["Pendentes", data.finance.pending],
          ["Cancel./estorno/atraso", cancelled],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <div className="text-xs uppercase text-white/45">{label}</div>
            <div className="mt-2 text-3xl text-[var(--giro-green)]">{value}</div>
          </Card>
        ))}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card>
          <div className="text-xs uppercase text-white/45">Valor bruto</div>
          <div className="mt-2 text-2xl">{brl(data.finance.grossCents)}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase text-white/45">Taxas gateway</div>
          <div className="mt-2 text-2xl">{brl(data.finance.feeCents)}</div>
        </Card>
        <Card>
          <div className="text-xs uppercase text-white/45">Líquido informado</div>
          <div className="mt-2 text-2xl text-[var(--giro-gold)]">
            {brl(data.finance.netCents)}
          </div>
          <p className="mt-2 text-xs text-white/45">
            Disponível para saque depende do saldo/transferências no Asaas — não
            confunda com bruto.
          </p>
        </Card>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/organizador/financeiro">
          <Button variant={!sp.status ? "primary" : "ghost"}>Todos</Button>
        </Link>
        {["awaiting", "confirmed", "received", "overdue", "refunded", "cancelled"].map(
          (s) => (
            <Link key={s} href={`/organizador/financeiro?status=${s}`}>
              <Button variant={sp.status === s ? "primary" : "ghost"}>{s}</Button>
            </Link>
          ),
        )}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-white/45">
              <tr>
                <th className="py-2">Evento</th>
                <th>Participante</th>
                <th>Status</th>
                <th>Bruto</th>
                <th>Líquido</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.payment.id} className="border-t border-white/10">
                  <td className="py-2 text-white">{p.tournamentName}</td>
                  <td className="text-white/80">{p.userName}</td>
                  <td>
                    <Badge>{p.payment.status}</Badge>
                  </td>
                  <td>{brl(p.payment.amountCents)}</td>
                  <td>{brl(p.payment.netAmountCents ?? 0)}</td>
                  <td>
                    {p.payment.invoiceUrl ? (
                      <a
                        className="text-[var(--giro-green)] underline"
                        href={p.payment.invoiceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Checkout
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
              {!payments.length && (
                <tr>
                  <td colSpan={6} className="py-6 text-white/45">
                    Sem cobranças neste filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
