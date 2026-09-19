/**
 * DS-VALUE-02 — enriquecimento real com proveniência.
 *
 * Fontes reais e gratuitas, sem credencial:
 *  - o site público do próprio lead (contatos publicados na página);
 *  - o registro público do OpenStreetMap (Nominatim com extratags).
 *
 * Cada valor devolvido carrega fonte, data, confiança e classificação
 * (confirmado/provável). Nada é inferido: campo que as fontes não informam
 * simplesmente não entra no resultado, e falha de fonte não apaga o lead.
 */

import { isPublicHttpUrl, normalizePhone } from "../prospector.js";
import { guardedFetch, parseTargetUrl } from "../net/ssrf-guard.js";

export const ENRICHMENT_SOURCE_WEBSITE = "site publico do lead";
export const ENRICHMENT_SOURCE_OSM = "openstreetmap";
export const ENRICHMENT_MAX_HTML_BYTES = 512 * 1024;

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_CONTACT = "DattaSeller CRM (+https://crm.datta360.com.br)";
const DEFAULT_NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export class EnrichmentError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = "EnrichmentError";
    this.code = code;
    this.details = details;
  }
}

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const text = (value) => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Sufixos genéricos de razão social não mudam a identidade do negócio: nome com
// e sem eles continua sendo o mesmo registro público.
const GENERIC_NAME_TOKENS = new Set(["restaurant", "restaurante", "cafe", "bar", "llc", "inc", "ltda", "me", "eireli", "company", "group", "grupo", "oficial", "official", "the", "de", "da", "do", "e"]);
const normalizeBusinessName = (value) => text(value)
  .replace(/[^a-z0-9\s]/g, " ")
  .split(/\s+/)
  .filter((token) => token && !GENERIC_NAME_TOKENS.has(token))
  .join(" ");

function timeoutSignal(milliseconds) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), milliseconds);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

async function fetchText(url, { fetchImpl, timeoutMs, accept = "text/html,application/xhtml+xml", contact, resolveHost }) {
  // O endereço é validado antes de qualquer requisição (SSRF fail-closed) e o
  // redirect só é seguido após validar o destino do salto.
  parseTargetUrl(url);
  const { signal, done } = timeoutSignal(timeoutMs);
  try {
    const { response } = await guardedFetch(url, { fetchImpl, resolveHost, signal, label: "site público do lead", headers: { "User-Agent": contact, Accept: accept, "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8" } });
    if (!response?.ok) throw new EnrichmentError("enrichment_source_unavailable", `A fonte respondeu ${response?.status ?? "sem status"}.`, { status: response?.status ?? null });
    const type = String(response.headers?.get?.("content-type") ?? "");
    const body = await response.text();
    if (type && !/html|text|json/i.test(type)) throw new EnrichmentError("enrichment_source_unavailable", `A fonte devolveu conteúdo não textual (${type}).`);
    return body.slice(0, ENRICHMENT_MAX_HTML_BYTES);
  } catch (error) {
    if (error instanceof EnrichmentError) throw error;
    if (error?.name === "AbortError") throw new EnrichmentError("enrichment_source_timeout", `A fonte não respondeu dentro de ${Math.round(timeoutMs / 1000)}s.`);
    throw new EnrichmentError("enrichment_source_unavailable", "Não foi possível consultar a fonte pública.");
  } finally {
    done();
  }
}

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const phonePattern = /tel:([+0-9()\s.\-]{8,25})/gi;
const whatsappPattern = /(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)(\d{8,15})/gi;
const instagramPattern = /instagram\.com\/(?!p\/|reel|explore|tv\/)([A-Za-z0-9._]{2,40})/gi;
const tiktokPattern = /tiktok\.com\/@([A-Za-z0-9._]{2,40})/gi;

const firstMatch = (pattern, value) => {
  pattern.lastIndex = 0;
  const match = pattern.exec(value);
  pattern.lastIndex = 0;
  return match ? clean(match[1] ?? match[0]) : "";
};

const allMatches = (pattern, value, limit = 5) => {
  const found = [];
  pattern.lastIndex = 0;
  let match;
  while ((match = pattern.exec(value)) && found.length < limit) found.push(clean(match[1] ?? match[0]));
  pattern.lastIndex = 0;
  return [...new Set(found)];
};

const isLikelyEmail = (value) => /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(value) && !/\.(png|jpe?g|gif|svg|webp|css|js)$/i.test(value) && !/^(exemplo|example|email|seuemail|teste)@/i.test(value);

/**
 * Extrai contatos publicados na própria página do negócio.
 * Só devolve o que está escrito na página — nenhuma composição de dado.
 */
export function extractContactsFromHtml(html, { sourceUrl, checkedAt }) {
  const body = String(html ?? "");
  const evidence = (value, extra = {}) => ({ value, source: ENRICHMENT_SOURCE_WEBSITE, source_url: sourceUrl, checked_at: checkedAt, confidence: "high", classification: "confirmado", ...extra });
  const fields = {};
  const emails = allMatches(emailPattern, body).filter(isLikelyEmail);
  if (emails.length) fields.email = evidence(emails[0]);
  const phones = allMatches(phonePattern, body).map((value) => normalizePhone(value)).filter((value) => value.length >= 10);
  if (phones.length) fields.telefone = evidence(phones[0]);
  const whatsapp = firstMatch(whatsappPattern, body).replace(/\D/g, "");
  if (whatsapp.length >= 10) fields.whatsapp = evidence(whatsapp);
  const instagram = firstMatch(instagramPattern, body);
  if (instagram) fields.instagram_url = evidence(`https://instagram.com/${instagram}`);
  const tiktok = firstMatch(tiktokPattern, body);
  if (tiktok) fields.tiktok_url = evidence(`https://tiktok.com/@${tiktok}`);
  const title = clean(/<title[^>]*>([\s\S]{0,300}?)<\/title>/i.exec(body)?.[1] ?? "");
  const description = clean(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']{0,300})["']/i.exec(body)?.[1] ?? "");
  return { fields, page: { title, description, source_url: sourceUrl, checked_at: checkedAt, contact_form: /<form[^>]*>/i.test(body), has_whatsapp_link: Boolean(whatsapp) } };
}

export async function enrichFromWebsite(url, { fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS, contact = DEFAULT_CONTACT, now = () => new Date(), resolveHost } = {}) {
  if (!isPublicHttpUrl(url)) throw new EnrichmentError("enrichment_invalid_source", "O lead não possui site público válido para enriquecer.");
  const html = await fetchText(url, { fetchImpl, timeoutMs, contact, resolveHost });
  return extractContactsFromHtml(html, { sourceUrl: String(url), checkedAt: now().toISOString() });
}

const osmFieldMap = { phone: "telefone", "contact:phone": "telefone", "contact:mobile": "telefone", email: "email", "contact:email": "email", website: "site_antigo", "contact:website": "site_antigo", url: "site_antigo", "contact:instagram": "instagram_url", instagram: "instagram_url", "contact:tiktok": "tiktok_url" };

function osmValue(field, raw) {
  const value = clean(raw);
  if (field === "telefone") return normalizePhone(value);
  if (field === "site_antigo") return isPublicHttpUrl(value) ? value : isPublicHttpUrl(`https://${value}`) ? `https://${value}` : "";
  if (field === "instagram_url") {
    const handle = value.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/+$/, "");
    return /^[A-Za-z0-9._]{2,40}$/.test(handle) ? `https://instagram.com/${handle}` : "";
  }
  if (field === "tiktok_url") {
    const handle = value.replace(/^https?:\/\/(www\.)?tiktok\.com\/@?/i, "").replace(/^@/, "").replace(/\/+$/, "");
    return /^[A-Za-z0-9._]{2,40}$/.test(handle) ? `https://tiktok.com/@${handle}` : "";
  }
  return value;
}

function addressFromOsm(address) {
  if (!address || typeof address !== "object") return "";
  const line = [
    clean([address.road, address.house_number].filter(Boolean).join(", ")),
    clean(address.suburb || address.neighbourhood || address.city_district),
    clean([address.city || address.town || address.village, address.state].filter(Boolean).join(", ")),
    clean(address.postcode),
  ].filter(Boolean).join(" · ");
  return line;
}

let lastLookupAt = 0;

/**
 * Busca o registro público da empresa no OpenStreetMap. Quando o nome normalizado
 * confere com o registro, o dado é classificado como confirmado; quando coincide
 * apenas parcialmente na mesma cidade, como provável (para revisão humana).
 */
export async function enrichFromOpenStreetMap({ nome, cidade }, { fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS, contact = DEFAULT_CONTACT, url = process.env.DATTASELLER_DISCOVERY_NOMINATIM_URL || DEFAULT_NOMINATIM_URL, now = () => new Date(), resolveHost } = {}) {
  const nomeLimpo = clean(nome);
  const cidadeLimpa = clean(cidade);
  if (!nomeLimpo) throw new EnrichmentError("enrichment_invalid_source", "Sem nome de empresa não há busca pública.");
  const wait = Math.max(0, 1100 - (Date.now() - lastLookupAt));
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  lastLookupAt = Date.now();
  const endpoint = new URL(url);
  endpoint.searchParams.set("q", [nomeLimpo, cidadeLimpa].filter(Boolean).join(", "));
  endpoint.searchParams.set("format", "jsonv2");
  endpoint.searchParams.set("limit", "3");
  endpoint.searchParams.set("addressdetails", "1");
  endpoint.searchParams.set("extratags", "1");
  const payload = JSON.parse(await fetchText(endpoint.toString(), { fetchImpl, timeoutMs, accept: "application/json", contact, resolveHost }));
  const candidatos = Array.isArray(payload) ? payload : [];
  const alvo = normalizeBusinessName(nomeLimpo);
  const nomeDoCandidato = (item) => clean(item?.name || String(item?.display_name ?? "").split(",")[0]);
  const escolhido = candidatos.find((item) => normalizeBusinessName(nomeDoCandidato(item)) === alvo) ?? candidatos.find((item) => normalizeBusinessName(nomeDoCandidato(item)).startsWith(alvo)) ?? candidatos[0];
  if (!escolhido) throw new EnrichmentError("enrichment_source_empty", `Nenhum registro público encontrado para "${nomeLimpo}".`);
  const exact = normalizeBusinessName(nomeDoCandidato(escolhido)) === alvo;
  const checkedAt = now().toISOString();
  const sourceUrl = `https://www.openstreetmap.org/${escolhido.osm_type ?? "node"}/${escolhido.osm_id ?? ""}`;
  const evidence = { source: ENRICHMENT_SOURCE_OSM, source_url: sourceUrl, checked_at: checkedAt, confidence: exact ? "high" : "medium", classification: exact ? "confirmado" : "provável" };
  const fields = {};
  for (const [key, raw] of Object.entries(escolhido.extratags ?? {})) {
    const field = osmFieldMap[key];
    if (!field || fields[field]) continue;
    const value = osmValue(field, raw);
    if (value) fields[field] = { ...evidence, value };
  }
  const endereco = addressFromOsm(escolhido.address);
  if (endereco) fields.end_cliente = { ...evidence, value: endereco };
  return { fields, match: { nome: clean(escolhido.name ?? escolhido.display_name), source_url: sourceUrl, exato: exact, tipo: clean(escolhido.type), latitude: Number(escolhido.lat), longitude: Number(escolhido.lon) } };
}

/**
 * Enriquece um lead incompleto. O resultado é um conjunto de campos com
 * proveniência; a decisão de gravar (e o que nunca sobrescrever) é da rota.
 */
export async function enrichLead({ lead, fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS, contact = DEFAULT_CONTACT, now = () => new Date(), resolveHost } = {}) {
  if (!lead || typeof lead !== "object" || !clean(lead.nome)) throw new EnrichmentError("enrichment_invalid_lead", "Lead sem nome não pode ser enriquecido.");
  const fields = {};
  const sources = [];
  const warnings = [];
  const siteUrl = clean(lead.site_antigo);
  if (siteUrl && isPublicHttpUrl(siteUrl)) {
    try {
      const site = await enrichFromWebsite(siteUrl, { fetchImpl, timeoutMs, contact, now, resolveHost });
      Object.assign(fields, site.fields);
      sources.push({ source: ENRICHMENT_SOURCE_WEBSITE, source_url: siteUrl, ok: true, page: site.page });
    } catch (error) {
      warnings.push({ source: ENRICHMENT_SOURCE_WEBSITE, source_url: siteUrl, error: error?.code ?? "enrichment_source_unavailable", message: error?.message ?? "fonte indisponível" });
    }
  } else if (siteUrl) {
    warnings.push({ source: ENRICHMENT_SOURCE_WEBSITE, source_url: siteUrl, error: "enrichment_invalid_source", message: "site do lead não é público HTTP(S)" });
  }
  try {
    const osm = await enrichFromOpenStreetMap({ nome: lead.nome, cidade: lead.cidade }, { fetchImpl, timeoutMs, contact, now, resolveHost });
    for (const [field, value] of Object.entries(osm.fields)) if (!fields[field]) fields[field] = value;
    sources.push({ source: ENRICHMENT_SOURCE_OSM, source_url: osm.match.source_url, ok: true, match: osm.match });
  } catch (error) {
    warnings.push({ source: ENRICHMENT_SOURCE_OSM, error: error?.code ?? "enrichment_source_unavailable", message: error?.message ?? "fonte indisponível" });
  }
  if (!sources.length) throw new EnrichmentError("enrichment_unavailable", "Nenhuma fonte pública respondeu para este lead.", { warnings });
  const checked_at = now().toISOString();
  return { checked_at, fields, sources, warnings };
}

/** Campo já confirmado (manual ou por fonte) não é sobrescrito em silêncio. */
export function planEnrichmentUpdate(lead, fields, { force = false, ignorar = [] } = {}) {
  const updates = {};
  const ignored = [];
  for (const [field, evidence] of Object.entries(fields ?? {})) {
    const atual = clean(lead?.[field]);
    if (ignorar.includes(field)) { ignored.push({ field, reason: "campo ignorado pelo operador", valor_atual: atual }); continue; }
    if (!atual) { updates[field] = evidence; continue; }
    if (force) { updates[field] = evidence; continue; }
    ignored.push({ field, reason: "valor já existente preservado", valor_atual: atual });
  }
  return { updates, ignored };
}
