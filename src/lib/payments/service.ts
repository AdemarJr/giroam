import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  paymentEvents,
  payments,
  registrationLots,
  registrations,
  tournaments,
  users,
} from "@/lib/db/schema";
import {
  createPayment,
  findOrCreateCustomer,
  getPayment,
  getPaymentPixQrCode,
  isAsaasEnabled,
  isPaidAsaasStatus,
  mapAsaasStatus,
  AsaasNotConfiguredError,
} from "@/lib/payments/asaas";
import { randomUUID } from "crypto";

function moneyToReais(cents: number) {
  return Math.round(cents) / 100;
}

function addDaysIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function resolveRegistrationPriceCents(input: {
  tournamentId: string;
  lotId?: string | null;
}) {
  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, input.tournamentId))
    .limit(1);
  if (!tournament) throw new Error("Evento não encontrado");

  if (tournament.paymentMode === "free") return 0;

  if (input.lotId) {
    const [lot] = await db
      .select()
      .from(registrationLots)
      .where(
        and(
          eq(registrationLots.id, input.lotId),
          eq(registrationLots.tournamentId, input.tournamentId),
          eq(registrationLots.active, true),
        ),
      )
      .limit(1);
    if (!lot) throw new Error("Lote inválido");
    const now = new Date();
    if (lot.startsAt && lot.startsAt > now) throw new Error("Lote ainda não iniciado");
    if (lot.endsAt && lot.endsAt < now) throw new Error("Lote encerrado");
    if (lot.maxQuantity != null && lot.soldCount >= lot.maxQuantity) {
      throw new Error("Lote esgotado");
    }
    return lot.priceCents;
  }

  return tournament.priceCents;
}

/**
 * Cria cobrança real no Asaas para uma inscrição.
 * Não simula PIX — exige ASAAS_API_KEY.
 */
export async function createRegistrationCharge(input: {
  registrationId: string;
  billingType?: "PIX" | "CREDIT_CARD" | "UNDEFINED";
}) {
  if (!isAsaasEnabled()) throw new AsaasNotConfiguredError();

  const [reg] = await db
    .select()
    .from(registrations)
    .where(eq(registrations.id, input.registrationId))
    .limit(1);
  if (!reg) throw new Error("Inscrição não encontrada");

  const [existingPaid] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.registrationId, reg.id),
        inArray(payments.status, ["confirmed", "received"]),
      ),
    )
    .limit(1);
  if (existingPaid) {
    throw new Error("Já existe pagamento confirmado para esta inscrição");
  }

  const [openPay] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.registrationId, reg.id),
        inArray(payments.status, ["pending", "awaiting"]),
      ),
    )
    .limit(1);
  if (openPay?.gatewayPaymentId) {
    return openPay;
  }

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, reg.tournamentId))
    .limit(1);
  if (!tournament) throw new Error("Evento não encontrado");
  if (!tournament.organizerId) {
    throw new Error("Evento sem organizador vinculado");
  }
  if (tournament.paymentMode === "free" || reg.amountCents <= 0) {
    throw new Error("Evento gratuito — cobrança não necessária");
  }

  const [payer] = await db
    .select()
    .from(users)
    .where(eq(users.id, reg.userId))
    .limit(1);
  if (!payer) throw new Error("Participante não encontrado");

  const customer = await findOrCreateCustomer({
    name: payer.name,
    email: payer.email,
    cpf: payer.cpf,
    phone: payer.phone,
  });

  const billingType =
    input.billingType ??
    (tournament.paymentMode === "checkout" ? "UNDEFINED" : "PIX");

  const idempotencyKey = `reg_${reg.id}_${billingType}`;
  const externalReference = `giroam:${reg.id}`;
  const dueDate = addDaysIso(tournament.paymentDueDays || 2);

  const asaasPayment = await createPayment({
    customerId: customer.id,
    billingType,
    value: moneyToReais(reg.amountCents),
    dueDate,
    description: `Inscrição ${tournament.name}`,
    externalReference,
    idempotencyKey,
  });

  let pixCopyPaste: string | null = null;
  let pixEncodedImage: string | null = null;
  if (billingType === "PIX" || asaasPayment.billingType === "PIX") {
    const pix = await getPaymentPixQrCode(asaasPayment.id);
    pixCopyPaste = pix.payload;
    pixEncodedImage = pix.encodedImage;
  }

  const [row] = await db
    .insert(payments)
    .values({
      organizerId: tournament.organizerId,
      tournamentId: tournament.id,
      registrationId: reg.id,
      userId: payer.id,
      gateway: "asaas",
      gatewayPaymentId: asaasPayment.id,
      gatewayCustomerId: customer.id,
      billingType:
        billingType === "CREDIT_CARD"
          ? "CREDIT_CARD"
          : billingType === "UNDEFINED"
            ? "UNDEFINED"
            : "PIX",
      status: mapAsaasStatus(asaasPayment.status),
      amountCents: reg.amountCents,
      netAmountCents:
        asaasPayment.netValue != null
          ? Math.round(asaasPayment.netValue * 100)
          : null,
      feeCents:
        asaasPayment.netValue != null
          ? reg.amountCents - Math.round(asaasPayment.netValue * 100)
          : null,
      currency: tournament.currency || "BRL",
      pixCopyPaste,
      pixEncodedImage,
      invoiceUrl: asaasPayment.invoiceUrl ?? null,
      dueDate: asaasPayment.dueDate ?? dueDate,
      idempotencyKey,
      externalReference,
      rawPayload: asaasPayment as unknown as Record<string, unknown>,
    })
    .onConflictDoNothing()
    .returning();

  if (!row) {
    const [again] = await db
      .select()
      .from(payments)
      .where(eq(payments.idempotencyKey, idempotencyKey))
      .limit(1);
    return again!;
  }

  await db
    .update(registrations)
    .set({ status: "awaiting_payment", updatedAt: new Date() })
    .where(eq(registrations.id, reg.id));

  return row;
}

export async function confirmPaymentFromGateway(input: {
  gatewayPaymentId: string;
  eventType: string;
  gatewayEventId?: string | null;
  payload: Record<string, unknown>;
}) {
  if (input.gatewayEventId) {
    const [dup] = await db
      .select()
      .from(paymentEvents)
      .where(eq(paymentEvents.gatewayEventId, input.gatewayEventId))
      .limit(1);
    if (dup?.processed) return { ok: true, duplicate: true };
  }

  const remote = await getPayment(input.gatewayPaymentId);
  const [pay] = await db
    .select()
    .from(payments)
    .where(eq(payments.gatewayPaymentId, input.gatewayPaymentId))
    .limit(1);

  if (!pay) {
    await db.insert(paymentEvents).values({
      paymentId: null,
      gatewayEventId: input.gatewayEventId ?? `orphan_${randomUUID()}`,
      eventType: input.eventType,
      payload: input.payload,
      processed: true,
    });
    return { ok: false, reason: "payment_not_found" };
  }

  if (pay.status === "confirmed" || pay.status === "received") {
    await db.insert(paymentEvents).values({
      paymentId: pay.id,
      gatewayEventId: input.gatewayEventId ?? `dup_${randomUUID()}`,
      eventType: input.eventType,
      payload: input.payload,
      processed: true,
    });
    return { ok: true, duplicate: true };
  }

  const status = mapAsaasStatus(remote.status);
  const paid = isPaidAsaasStatus(remote.status);

  await db
    .update(payments)
    .set({
      status,
      netAmountCents:
        remote.netValue != null ? Math.round(remote.netValue * 100) : pay.netAmountCents,
      feeCents:
        remote.netValue != null
          ? pay.amountCents - Math.round(remote.netValue * 100)
          : pay.feeCents,
      invoiceUrl: remote.invoiceUrl ?? pay.invoiceUrl,
      paidAt: paid
        ? new Date(
            remote.paymentDate ||
              remote.confirmedDate ||
              remote.clientPaymentDate ||
              Date.now(),
          )
        : pay.paidAt,
      refundedAt: status === "refunded" ? new Date() : pay.refundedAt,
      rawPayload: remote as unknown as Record<string, unknown>,
      updatedAt: new Date(),
    })
    .where(eq(payments.id, pay.id));

  if (paid) {
    await db
      .update(registrations)
      .set({ status: "approved", updatedAt: new Date() })
      .where(eq(registrations.id, pay.registrationId));

    const [reg] = await db
      .select()
      .from(registrations)
      .where(eq(registrations.id, pay.registrationId))
      .limit(1);
    if (reg?.lotId) {
      await db
        .update(registrationLots)
        .set({ soldCount: sql`${registrationLots.soldCount} + 1` })
        .where(eq(registrationLots.id, reg.lotId));
    }
  }

  if (status === "cancelled" || status === "overdue" || status === "failed") {
    await db
      .update(registrations)
      .set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(registrations.id, pay.registrationId),
          eq(registrations.status, "awaiting_payment"),
        ),
      );
  }

  if (status === "refunded") {
    await db
      .update(registrations)
      .set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() })
      .where(eq(registrations.id, pay.registrationId));
  }

  await db.insert(paymentEvents).values({
    paymentId: pay.id,
    gatewayEventId: input.gatewayEventId ?? `evt_${randomUUID()}`,
    eventType: input.eventType,
    payload: input.payload,
    processed: true,
  });

  return { ok: true, paid, status };
}
