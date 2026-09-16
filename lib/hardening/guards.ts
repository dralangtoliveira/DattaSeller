export const SAFE_LEAD_SLUG = /^[a-z0-9][a-z0-9-]{0,71}$/;

export const LEAD_INPUT_KEYS = new Set([
  "slug", "nome", "empresa", "nicho", "cidade", "nota", "avaliacoes", "email", "telefone", "whatsapp",
  "siteAntigo", "site_antigo", "instagram_url", "motivo", "status", "urlNova", "url_nova", "dataProposta",
  "data_proposta", "valor", "obs", "contratoStatus", "contrato_status", "contratoEm", "contrato_em", "manutencao",
  "pago", "docCliente", "doc_cliente", "endCliente", "end_cliente", "source", "source_url", "source_checked_at",
  "public_contact_type", "product_suggested", "product_reason", "next_action", "delivery_status", "checkout_url",
  "checkout_presented_at", "checkout_clicked_at", "qualification_json", "site_audit_json", "instagram_audit_json",
  "valor_fechado", "message", "referrer", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
  "consents", "closingConfirmed",
  "region", "search_radius_km", "target_quantity", "search_limit", "tiktok_url", "contact_evidence",
]);

export const SOCIAL_AUDIT_INPUT_KEYS = new Set([
  "lead_slug", "platform", "url", "username", "bio", "cta", "link", "visual_identity", "consistency_note",
  "frequency_note", "factual_notes", "recommendation", "creative_direction", "evidence",
]);

export function isSafeLeadSlug(value: unknown) {
  return typeof value === "string" && SAFE_LEAD_SLUG.test(value);
}

export function firstDisallowedKey(value: unknown, allowed: Set<string>) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "body";
  return Object.keys(value).find((key) => !allowed.has(key)) ?? null;
}

export function isAdminProfile(profile: unknown) {
  return Boolean(profile && typeof profile === "object" && (profile as { role?: unknown }).role === "admin");
}

export function canGenerateContract(isDemo: unknown) {
  return isDemo !== true;
}

export function sellerName(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

export function canSoftDeleteLead(hasPaidOrder: boolean) {
  return !hasPaidOrder;
}

export function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}
