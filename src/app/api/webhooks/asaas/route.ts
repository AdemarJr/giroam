import { NextResponse } from "next/server";
import { asaasConfig } from "@/lib/config";
import { confirmPaymentFromGateway } from "@/lib/payments/service";

export const runtime = "nodejs";

/**
 * Webhook Asaas — confirma pagamentos apenas com dados do gateway.
 * Configure a URL: {APP_URL}/api/webhooks/asaas
 * e o token em ASAAS_WEBHOOK_TOKEN (header asaas-access-token).
 */
export async function POST(request: Request) {
  const cfg = asaasConfig();
  if (!cfg.enabled) {
    return NextResponse.json(
      { error: "Asaas não configurado" },
      { status: 503 },
    );
  }

  if (cfg.webhookToken) {
    const token =
      request.headers.get("asaas-access-token") ||
      request.headers.get("Asaas-Access-Token") ||
      "";
    if (token !== cfg.webhookToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const payload = (await request.json().catch(() => null)) as {
    id?: string;
    event?: string;
    payment?: { id?: string };
  } | null;

  if (!payload?.payment?.id) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const result = await confirmPaymentFromGateway({
      gatewayPaymentId: payload.payment.id,
      eventType: payload.event ?? "PAYMENT_UPDATE",
      gatewayEventId: payload.id ?? null,
      payload: payload as unknown as Record<string, unknown>,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[asaas webhook]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "webhook_error" },
      { status: 500 },
    );
  }
}
