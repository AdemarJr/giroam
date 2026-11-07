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
