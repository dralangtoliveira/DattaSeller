/**
 * DattaSeller Agent — contrato das ações sociais (DS-VALUE-05/06).
 *
 * O agente é o worker existente evoluído: o mesmo processo, a mesma autenticação
 * e o mesmo padrão de job. Nenhum projeto paralelo e nenhum multiagente.
 */

import { RedesignError } from "../redesign/contract.js";

export const AGENT_ACTIONS = {
  redesign: "BUILD_REDESIGN",
  socialAnalysis: "ANALYZE_SOCIAL",
  socialDemo: "BUILD_SOCIAL_DEMO",
};

export const SOCIAL_PLATFORMS = ["instagram", "tiktok"];
const HOSTS = { instagram: ["instagram.com", "www.instagram.com"], tiktok: ["tiktok.com", "www.tiktok.com"] };

export class AgentError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = "AgentError";
    this.code = code;
    this.details = details;
  }
}

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const isSafeLeadSlug = (value) => typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,71}$/.test(value);

/**
 * Só perfil público das plataformas suportadas entra no job: host fora da lista,
 * esquema diferente de HTTP(S) ou URL inválida falha fechado.
 */
export function parseSocialProfileUrl(value) {
  let url;
  try {
    url = new URL(clean(value));
  } catch {
    throw new AgentError("social_invalid_profile_url", "Perfil social inválido: informe a URL pública completa.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new AgentError("social_invalid_profile_url", "Perfil social precisa ser HTTP(S).");
  const host = url.hostname.toLowerCase();
  const plataforma = SOCIAL_PLATFORMS.find((candidata) => HOSTS[candidata].includes(host));
  if (!plataforma) throw new AgentError("social_unsupported_platform", "Somente perfis públicos de Instagram ou TikTok são suportados.", { host });
  const caminho = url.pathname.replace(/\/+$/, "");
  // TikTok publica o perfil como /@handle; Instagram como /handle.
  const handle = /^\/@?([A-Za-z0-9._]{2,40})$/.exec(caminho)?.[1] ?? "";
  if (!handle || ["p", "reel", "reels", "explore", "accounts", "stories"].includes(handle.toLowerCase())) {
    throw new AgentError("social_invalid_profile_url", "A URL precisa apontar para o perfil público (ex.: instagram.com/nome).", { url: url.toString() });
  }
  const caminhoPerfil = plataforma === "tiktok" ? `/@${handle}/` : `/${handle}/`;
  return { platform: plataforma, handle, url: `https://www.${plataforma}.com${caminhoPerfil}` };
}

export function parseSocialJob(body = {}) {
  const action = clean(body.action) || AGENT_ACTIONS.socialAnalysis;
  if (![AGENT_ACTIONS.socialAnalysis, AGENT_ACTIONS.socialDemo].includes(action)) {
    throw new AgentError("social_invalid_action", `Ação social inválida: ${action || "(vazia)"}.`);
  }
  const lead_slug = clean(body.lead_slug);
  if (!isSafeLeadSlug(lead_slug)) throw new AgentError("social_invalid_lead_slug", "lead_slug inválido para o job social.");
  const perfil = body.profile_url || body.profileUrl ? parseSocialProfileUrl(body.profile_url ?? body.profileUrl) : null;
  if (action === AGENT_ACTIONS.socialAnalysis && !perfil) throw new AgentError("social_profile_required", "Análise social exige a URL do perfil público confirmado.");
  const evidencia = body.browser_evidence ?? body.browserEvidence ?? null;
  if (evidencia) {
    if (typeof evidencia !== "object" || Array.isArray(evidencia)) throw new AgentError("social_invalid_browser_evidence", "browser_evidence precisa ser um objeto com os fatos coletados no browser.");
    if (!perfil || parseSocialProfileUrl(evidencia.url ?? "").url !== perfil.url) {
      throw new AgentError("social_invalid_browser_evidence", "browser_evidence precisa apontar para o mesmo perfil público do job.");
    }
    if (!clean(evidencia.collected_at) || Number.isNaN(Date.parse(evidencia.collected_at))) throw new AgentError("social_invalid_browser_evidence", "browser_evidence precisa da data da coleta.");
    const conteudo = clean(evidencia.visible_text ?? evidencia.visibleText ?? evidencia.title ?? evidencia.og_title);
    if (conteudo.length < 20) throw new AgentError("social_invalid_browser_evidence", "browser_evidence precisa do que foi realmente lido na página pública.");
  }
  return {
    action,
    lead_slug,
    platform: perfil?.platform ?? null,
    handle: perfil?.handle ?? null,
    profile_url: perfil?.url ?? null,
    diagnosis_id: clean(body.diagnosis_id) || null,
    context_url: body.context_url ?? null,
    context: body.context && typeof body.context === "object" ? body.context : null,
    browser_evidence: evidencia ? {
      url: parseSocialProfileUrl(evidencia.url).url,
      collected_at: clean(evidencia.collected_at),
      title: clean(evidencia.title),
      og_title: clean(evidencia.og_title ?? evidencia.ogTitle),
      og_description: clean(evidencia.og_description ?? evidencia.ogDescription),
      og_image: clean(evidencia.og_image ?? evidencia.ogImage),
      visible_text: clean(evidencia.visible_text ?? evidencia.visibleText),
      tabs: Array.isArray(evidencia.tabs) ? evidencia.tabs.map((item) => clean(item)).filter(Boolean).slice(0, 12) : [],
      collector: clean(evidencia.collector) || "playwright",
    } : null,
    requested_by: clean(body.requested_by) || null,
  };
}

export const SOCIAL_AUDIT_FIELDS = ["lead_slug", "platform", "profile_url", "handle", "checked_at", "bio", "cta", "links", "visual_identity", "consistency_note", "frequency_note", "formats", "facts", "evidence", "warnings"];
export const SOCIAL_DEMO_FIELDS = ["lead_slug", "source_profile_url", "brand_context", "direction", "calendar", "feed_pieces", "stories", "generated_html", "generation_metadata", "warnings", "created_at"];

export function validateSocialAuditArtifact(artifact) {
  if (!artifact || typeof artifact !== "object") throw new AgentError("social_invalid_artifact", "Artefato de análise social ausente.");
  for (const campo of SOCIAL_AUDIT_FIELDS) if (!(campo in artifact)) throw new AgentError("social_incomplete_artifact", `Análise social sem o campo ${campo}.`, { field: campo });
  if (!Array.isArray(artifact.evidence) || !artifact.evidence.length) throw new AgentError("social_invalid_artifact", "Análise social exige evidência do que foi observado.");
  if (!artifact.profile_url) throw new AgentError("social_invalid_artifact", "Análise social exige a URL do perfil observado.");
  return artifact;
}

export function validateSocialDemoArtifact(artifact) {
  if (!artifact || typeof artifact !== "object") throw new AgentError("social_invalid_artifact", "Artefato de demonstração social ausente.");
  for (const campo of SOCIAL_DEMO_FIELDS) if (!(campo in artifact)) throw new AgentError("social_incomplete_artifact", `Demonstração social sem o campo ${campo}.`, { field: campo });
  if (!Array.isArray(artifact.calendar) || artifact.calendar.length !== 7) throw new AgentError("social_invalid_artifact", "O calendário precisa ter 7 dias.");
  if (!Array.isArray(artifact.feed_pieces) || artifact.feed_pieces.length !== 3) throw new AgentError("social_invalid_artifact", "A demonstração precisa de 3 peças de feed.");
  if (!Array.isArray(artifact.stories) || artifact.stories.length !== 3) throw new AgentError("social_invalid_artifact", "A demonstração precisa de 3 stories.");
  for (const peca of artifact.feed_pieces) {
    if (!peca.hook || !peca.caption || !Array.isArray(peca.hashtags) || peca.hashtags.length !== 5 || !peca.visual) {
      throw new AgentError("social_invalid_artifact", "Cada peça precisa de gancho, legenda, 5 hashtags e sugestão visual.", { piece: peca?.id ?? null });
    }
  }
  if (typeof artifact.generated_html !== "string" || artifact.generated_html.length < 1000) throw new AgentError("social_invalid_artifact", "A demonstração precisa de artefato visual renderizável (não só JSON).");
  if (!/<meta[^>]+name=["']viewport["']/i.test(artifact.generated_html)) throw new AgentError("social_invalid_artifact", "O artefato visual precisa declarar viewport.");
  return artifact;
}

export function isAgentError(error) {
  return error instanceof AgentError || error instanceof RedesignError;
}
