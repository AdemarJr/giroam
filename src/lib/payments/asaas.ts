import { asaasConfig } from "@/lib/config";

export type AsaasCustomer = {
  id: string;
  name: string;
  cpfCnpj?: string;
  email?: string;
};

export type AsaasPayment = {
  id: string;
  status: string;
  value: number;
  netValue?: number;
  billingType: string;
  dueDate?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  paymentDate?: string;
  clientPaymentDate?: string;
  confirmedDate?: string;
  externalReference?: string;
  customer: string;
};

export type AsaasPixQrCode = {
  encodedImage: string;
  payload: string;
  expirationDate?: string;
};

export class AsaasNotConfiguredError extends Error {
  constructor() {
    super(
      "Gateway Asaas não configurado. Defina ASAAS_API_KEY no ambiente para cobranças reais.",
    );
    this.name = "AsaasNotConfiguredError";
  }
}

async function asaasFetch<T>(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<T> {
  const cfg = asaasConfig();
  if (!cfg.enabled) throw new AsaasNotConfiguredError();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    access_token: cfg.apiKey,
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.idempotencyKey) {
    headers["Idempotency-Key"] = init.idempotencyKey;
  }

  const res = await fetch(`${cfg.baseUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (body as { errors?: { description?: string }[] })?.errors?.[0]
        ?.description ||
      (body as { message?: string })?.message ||
      `Asaas HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body as T;
}

export function isAsaasEnabled() {
  return asaasConfig().enabled;
}

export async function findOrCreateCustomer(input: {
  name: string;
  email: string;
  cpf: string;
  phone?: string | null;
}): Promise<AsaasCustomer> {
  const cpfCnpj = input.cpf.replace(/\D/g, "");
  const listed = await asaasFetch<{ data: AsaasCustomer[] }>(
    `/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}&limit=1`,
  );
  if (listed.data?.[0]) return listed.data[0];

  return asaasFetch<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      cpfCnpj,
      mobilePhone: input.phone?.replace(/\D/g, "") || undefined,
      notificationDisabled: true,
    }),
  });
}

export async function createPayment(input: {
  customerId: string;
  billingType: "PIX" | "CREDIT_CARD" | "UNDEFINED";
  value: number;
  dueDate: string;
  description: string;
  externalReference: string;
  idempotencyKey: string;
}): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>("/payments", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body: JSON.stringify({
      customer: input.customerId,
      billingType: input.billingType,
      value: input.value,
      dueDate: input.dueDate,
      description: input.description,
      externalReference: input.externalReference,
    }),
  });
}

export async function getPaymentPixQrCode(
  paymentId: string,
): Promise<AsaasPixQrCode> {
  return asaasFetch<AsaasPixQrCode>(`/payments/${paymentId}/pixQrCode`);
}

export async function getPayment(paymentId: string): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>(`/payments/${paymentId}`);
}

export async function refundPayment(
  paymentId: string,
  value?: number,
): Promise<AsaasPayment> {
  return asaasFetch<AsaasPayment>(`/payments/${paymentId}/refund`, {
    method: "POST",
    body: JSON.stringify(value != null ? { value } : {}),
  });
}

/** Mapeia status Asaas → status interno. */
export function mapAsaasStatus(
  status: string,
):
  | "pending"
  | "awaiting"
  | "confirmed"
  | "received"
  | "overdue"
  | "refunded"
  | "cancelled"
  | "failed" {
  switch (status) {
    case "PENDING":
      return "awaiting";
    case "RECEIVED":
    case "RECEIVED_IN_CASH":
      return "received";
    case "CONFIRMED":
      return "confirmed";
    case "OVERDUE":
      return "overdue";
    case "REFUNDED":
    case "REFUND_REQUESTED":
    case "REFUND_IN_PROGRESS":
      return "refunded";
    case "DELETED":
    case "CANCELED":
      return "cancelled";
    default:
      return "pending";
  }
}

export function isPaidAsaasStatus(status: string) {
  return ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(status);
}
