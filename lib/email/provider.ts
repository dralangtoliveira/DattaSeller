export function resendConfigurationError(provider: unknown, hasApiKey: boolean): "provider_not_configured" | null {
  return provider === "resend" && !hasApiKey ? "provider_not_configured" : null;
}

/**
 * Destinatário efetivo de um envio. O rascunho pode ter sido criado sem
 * `recipient` (é o caso do fluxo rascunho → revisão → aprovação do CRM), então o
 * e-mail do lead é a fonte de fallback — o mesmo critério de `/api/email-send`.
 */
export function resolveEmailRecipient(
  email: { recipient?: unknown } | null | undefined,
  lead: { email?: unknown } | null | undefined,
): string | null {
  const direct = String(email?.recipient ?? "").trim();
  if (direct) return direct;
  return String(lead?.email ?? "").trim() || null;
}
