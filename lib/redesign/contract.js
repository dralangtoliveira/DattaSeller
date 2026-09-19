/**
 * DS-VALUE-04 — contrato do job de redesign (DattaSeller Worker Agent).
 *
 * O CRM (DattaSeller web) orquestra; o worker executa a ação BUILD_REDESIGN.
 * O contrato é separado da implementação: o worker pode rodar em VPS, em modo
 * local/dev ou configurado por URL, sem acoplar o CRM ao runtime do agente.
 *
 * Entrada mínima do job: lead_slug + site_url + diagnosis_id (o contexto do CRM
 * vem por referência, não duplicado no payload).
 */

export const REDESIGN_ACTION = "BUILD_REDESIGN";
export const REDESIGN_JOB_STATUS = ["queued", "running", "completed", "failed"];
export const REDESIGN_ARTIFACT_FIELDS = [
  "lead_slug", "source_url", "assets", "asset_sources", "brand_context",
  "generated_html", "generation_metadata", "warnings", "created_at",
];

export class RedesignError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = "RedesignError";
    this.code = code;
    this.details = details;
  }
}

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const isSafeLeadSlug = (value) => typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,71}$/.test(value);

export function isPublicHttpUrl(value) {
  try {
    const url = new URL(String(value ?? ""));
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Valida o payload do job. `diagnosis_id` é exigido pelo CRM (o redesign parte
 * do diagnóstico factual); quando ausente, o job é aceito apenas com marcação
 * explícita para uso avulso em VPS, que fica registrada em `warnings`.
 */
export function parseRedesignJob(body = {}) {
  const lead_slug = clean(body.lead_slug);
  const site_url = clean(body.site_url ?? body.siteUrl);
  const diagnosis_id = clean(body.diagnosis_id ?? body.diagnosisId);
  if (!isSafeLeadSlug(lead_slug)) throw new RedesignError("redesign_invalid_lead_slug", "lead_slug inválido para o job de redesign.");
  if (!isPublicHttpUrl(site_url)) throw new RedesignError("redesign_invalid_site_url", "site_url precisa ser uma URL pública HTTP(S).");
  if (diagnosis_id && !/^[a-zA-Z0-9_-]{3,64}$/.test(diagnosis_id)) throw new RedesignError("redesign_invalid_diagnosis_id", "diagnosis_id inválido.");
  return {
    action: REDESIGN_ACTION,
    lead_slug,
    site_url,
    diagnosis_id: diagnosis_id || null,
    context_url: clean(body.context_url ?? body.contextUrl) || null,
    context: body.context && typeof body.context === "object" ? body.context : null,
    requested_by: clean(body.requested_by) || null,
    notes: clean(body.notes) || null,
  };
}

/** Valida o artefato antes de qualquer persistência: saída incompleta não entra no CRM. */
export function validateRedesignArtifact(artifact) {
  if (!artifact || typeof artifact !== "object") throw new RedesignError("redesign_invalid_artifact", "Artefato de redesign ausente.");
  for (const field of REDESIGN_ARTIFACT_FIELDS) {
    if (!(field in artifact)) throw new RedesignError("redesign_incomplete_artifact", `Artefato sem o campo obrigatório ${field}.`, { field });
  }
  if (!isSafeLeadSlug(artifact.lead_slug)) throw new RedesignError("redesign_invalid_artifact", "Artefato sem lead_slug válido.");
  if (!isPublicHttpUrl(artifact.source_url)) throw new RedesignError("redesign_invalid_artifact", "Artefato sem source_url público.");
  if (!Array.isArray(artifact.assets) || !Array.isArray(artifact.asset_sources)) throw new RedesignError("redesign_invalid_artifact", "Artefato precisa listar assets e asset_sources.");
  if (!artifact.asset_sources.length || !artifact.asset_sources.every((origem) => isPublicHttpUrl(origem))) throw new RedesignError("redesign_invalid_artifact", "asset_sources precisa listar as páginas de origem (URLs públicas).");
  for (const asset of artifact.assets) {
    if (!asset || !asset.kind || !isPublicHttpUrl(asset.url) || !isPublicHttpUrl(asset.source_url) || !asset.collected_at) {
      throw new RedesignError("redesign_asset_without_source", "Cada ativo precisa de tipo, URL pública, fonte e data de coleta.", { asset });
    }
  }
  if (typeof artifact.generated_html !== "string" || artifact.generated_html.length < 500) throw new RedesignError("redesign_invalid_artifact", "HTML gerado ausente ou curto demais.");
  if (!artifact.generated_html.includes("<!doctype html") && !artifact.generated_html.includes("<!DOCTYPE html")) throw new RedesignError("redesign_invalid_artifact", "HTML gerado precisa ser um documento completo.");
  if (!/<meta[^>]+name=["']viewport["']/i.test(artifact.generated_html)) throw new RedesignError("redesign_invalid_artifact", "HTML gerado precisa declarar viewport (responsividade).");
  return artifact;
}

/**
 * Regras bloqueantes de conteúdo: o redesign só pode usar o que veio de fonte
 * pública. Rótulo de interface é permitido; afirmação sobre a empresa, não.
 */
export const REDESIGN_FORBIDDEN_CLAIMS = [
  /\b\d+\s*(anos|year[s]?)\s+de\s+experi[eê]ncia/i,
  /\bmelhor\s+(da|do)\s+(cidade|regi[aã]o|bairro|pa[ií]s)\b/i,
  /\b(l[ií]der|n[uú]mero\s*1|nº\s*1)\s+(do|de|da)\b/i,
  /\b\d{2,}(\.\d{3})*\s*(clientes|atendimentos|projetos)\s+(atendidos|realizados)\b/i,
  /\b(5|4[.,]9|cinco)\s*estrelas\b/i,
  /[★⭐]/,
  /\bdepoimento\s+de\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+/,
  /\b(garantia|garantido)\s+de\s+\d+/i,
];

export function findForbiddenClaims(html) {
  const texto = String(html ?? "");
  return REDESIGN_FORBIDDEN_CLAIMS
    .map((pattern) => pattern.exec(texto)?.[0] ?? null)
    .filter(Boolean);
}

/**
 * Todo dado do cliente que aparece no HTML precisa existir nos dados coletados.
 * Rótulos fixos da interface (navegação, CTA, títulos de seção) são permitidos.
 */
export const REDESIGN_UI_LABELS = [
  "Serviços", "Onde estamos", "Contato", "Fale no WhatsApp", "Ligar agora", "Enviar e-mail",
  "Como chegar", "Galeria", "Sobre", "Início", "Página inicial", "Abrir no mapa", "WhatsApp",
  "Protótipo preparado por DattaSeller", "Ativos originais publicados pelo próprio cliente",
  "Versão proposta", "Voltar ao site atual", "Fotos", "Serviço",
];

export function unusedSourceMaterial(html, sources) {
  const texto = String(html ?? "");
  const permitido = new Set([...REDESIGN_UI_LABELS, ...(Array.isArray(sources) ? sources : [])]);
  const suspeitos = [];
  for (const pattern of [/\bR\$\s?\d[\d.,]*/g, /\b\d{1,3}(\.\d{3})+(\s*avalia[çc][õo]es)?/g]) {
    for (const match of texto.matchAll(pattern)) {
      const valor = match[0].trim();
      if (![...permitido].some((origem) => String(origem).includes(valor))) suspeitos.push(valor);
    }
  }
  return [...new Set(suspeitos)];
}
