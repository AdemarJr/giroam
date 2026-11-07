import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { readSession } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { payments, registrations, tournaments } from "@/lib/db/schema";
import { Badge, Button, Card, PageHeader } from "@/components/ui/primitives";

export default async function PagamentoInscricaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reg?: string }>;
}) {
  const { id } = await params;
  const { reg: regId } = await searchParams;
  const user = await readSession();
  if (!user) redirect(`/login?next=/torneios/${id}/pagamento`);

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, id))
    .limit(1);
  if (!tournament) notFound();

  const regConds = [
    eq(registrations.tournamentId, id),
    eq(registrations.userId, user.id),
  ];
  if (regId) regConds.push(eq(registrations.id, regId));
  const [reg] = await db
    .select()
    .from(registrations)
    .where(and(...regConds))
    .limit(1);
  if (!reg) notFound();

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.registrationId, reg.id))
    .limit(1);

  const paid =
    payment?.status === "confirmed" || payment?.status === "received";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <PageHeader
        title="Pagamento da inscrição"
        subtitle={tournament.name}
        actions={<Badge>{payment?.status ?? reg.status}</Badge>}
      />

      {paid ? (
        <Card>
          <p className="text-sm text-white/80">
            Pagamento confirmado. Sua inscrição está{" "}
            <strong>{reg.status}</strong>.
          </p>
          <Link href={`/torneios/${id}`} className="mt-4 inline-block">
            <Button>Voltar ao evento</Button>
          </Link>
        </Card>
      ) : (
        <Card className="space-y-4">
          <p className="text-sm text-white/70">
            Valor:{" "}
            <strong className="text-white">
              {(reg.amountCents / 100).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </strong>
          </p>

          {!payment && (
            <p className="text-sm text-rose-200">
              Cobrança ainda não gerada. Verifique a configuração do Asaas.
            </p>
          )}

          {payment?.pixEncodedImage && (
            <div className="flex flex-col items-center gap-3">
              {/* QR Code real retornado pela API Asaas (base64) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${payment.pixEncodedImage}`}
                alt="QR Code PIX Asaas"
                className="h-56 w-56 rounded-xl bg-white p-2"
              />
              <p className="text-xs text-white/45">
                QR Code gerado pelo Asaas — não é imagem estática simulada.
              </p>
            </div>
          )}

          {payment?.pixCopyPaste && (
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-white/45">
                PIX copia e cola
              </p>
              <code className="block break-all rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white/80">
                {payment.pixCopyPaste}
              </code>
            </div>
          )}

          {payment?.invoiceUrl && (
            <a href={payment.invoiceUrl} target="_blank" rel="noreferrer">
              <Button variant="gold">Abrir link de pagamento Asaas</Button>
            </a>
          )}

          <p className="text-xs text-white/45">
            A inscrição só será confirmada após webhook/consulta do Asaas
            (`PAYMENT_RECEIVED` / `PAYMENT_CONFIRMED`). Não confie apenas nesta
            tela.
          </p>

          <Link href={`/torneios/${id}`}>
            <Button variant="ghost">Voltar</Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
