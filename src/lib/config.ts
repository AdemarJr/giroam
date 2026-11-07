/**
 * Cadastro aberto vs. só por convite de capitão.
 * Altere via .env: INVITE_ONLY_REGISTRATION=true|false
 * (padrão: true)
 */
export function isInviteOnlyRegistration() {
  const raw = (process.env.INVITE_ONLY_REGISTRATION ?? "true").toLowerCase();
  return raw !== "false" && raw !== "0" && raw !== "off";
}

export function inviteExpiryDays() {
  const n = Number(process.env.INVITE_EXPIRY_DAYS ?? "14");
  return Number.isFinite(n) && n > 0 ? n : 14;
}

/** Gateway principal: Asaas (PIX + checkout). Sem chave = pagamentos pagos desabilitados. */
export function asaasConfig() {
  const apiKey = process.env.ASAAS_API_KEY?.trim() ?? "";
  const baseUrl = (
    process.env.ASAAS_API_URL?.trim() || "https://api-sandbox.asaas.com/v3"
  ).replace(/\/$/, "");
  const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN?.trim() ?? "";
  return {
    apiKey,
    baseUrl,
    webhookToken,
    enabled: Boolean(apiKey),
  };
}

export function appPublicUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
