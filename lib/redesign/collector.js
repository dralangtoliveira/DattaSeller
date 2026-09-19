/**
 * DS-VALUE-04 — coleta de ativos públicos reais do site do cliente.
 *
 * Nada é baixado: os ativos são referenciados pela URL pública original e cada
 * um carrega a sua fonte (página, seletor/atributo de onde saiu e data). O
 * acesso à URL do cliente passa pelo guard SSRF do PR #18.
 */

import { guardedFetch, parseTargetUrl } from "../net/ssrf-guard.js";
import { RedesignError, isPublicHttpUrl } from "./contract.js";

export const COLLECTOR_MAX_PHOTOS = 12;
const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_CONTACT = "DattaSeller Worker (+https://crm.datta360.com.br)";

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const stripTags = (value) => clean(String(value ?? "").replace(/<[^>]*>/g, " "));
const unescape = (value) => String(value ?? "")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const digits = (value) => String(value ?? "").replace(/\D/g, "");

/** URL pública utilizável em asset; host privado é descartado (não reduzimos a proteção do PR #18). */
export function publicAssetUrl(value, base) {
  if (!value) return "";
  let absolute;
  try {
    absolute = new URL(String(value).trim(), base).toString();
  } catch {
    return "";
  }
  if (!isPublicHttpUrl(absolute)) return "";
  try {
    parseTargetUrl(absolute);
  } catch {
    return "";
  }
  return absolute;
}

const attr = (tag, name) => {
  const match = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i").exec(tag);
  return match ? unescape(match[1]).trim() : "";
};

function bestFromSrcset(srcset) {
  if (!srcset) return "";
  return srcset
    .split(",")
    .map((entry) => entry.trim().split(/\s+/))
    .map(([url, descriptor]) => ({ url, size: Number(String(descriptor ?? "").replace(/\D/g, "")) || 0 }))
    .sort((a, b) => b.size - a.size)
    .map((entry) => entry.url)[0] ?? "";
}

const isTinyOrTracking = (tag, url) => {
  const width = Number(attr(tag, "width") || 0);
  const height = Number(attr(tag, "height") || 0);
  if (width && width <= 40 && height && height <= 40) return true;
  return /(sprite|pixel|tracking|analytics|1x1|placeholder|blank\.|spacer)/i.test(url);
};

/**
 * Lê a página pública do cliente e devolve ativos, textos, contatos e paleta —
 * cada item com a sua origem. O que não existe na fonte não é inventado: entra
 * como aviso, não como dado.
 */
export function extractSiteAssets({ html, finalUrl, status = 200, contentType = "text/html", bytes = 0, checkedAt, known = {} }) {
  const body = String(html ?? "");
  const base = finalUrl;
  const assets = [];
  const assetSources = [...new Set([base])];
  const addAsset = (kind, url, evidence) => {
    if (!url) return;
    if (assets.some((asset) => asset.url === url)) return;
    assets.push({ kind, url, source_url: base, evidence, collected_at: checkedAt });
  };

  const imgs = [...body.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
  const photos = [];
  for (const tag of imgs) {
    // Sites reais publicam imagem em src, srcset ou em atributos de lazy-load.
    const raw = attr(tag, "src") || attr(tag, "data-src") || attr(tag, "data-lazy-src") || attr(tag, "data-original") || bestFromSrcset(attr(tag, "srcset")) || bestFromSrcset(attr(tag, "data-srcset"));
    const url = publicAssetUrl(raw, base);
    if (!url || isTinyOrTracking(tag, url)) continue;
    const hint = `${attr(tag, "class")} ${attr(tag, "id")} ${attr(tag, "alt")} ${url}`;
    const tamanho = Number(attr(tag, "width") || 0) * Number(attr(tag, "height") || 0);
    if (/logo|marca|brand/i.test(hint)) addAsset("logo", url, `<img class="${attr(tag, "class")}">`);
    else photos.push({ url, alt: attr(tag, "alt"), tamanho, evidence: `<img src="${raw}">` });
  }
  // <picture><source srcset> e imagens de fundo publicadas no CSS inline.
  for (const match of body.matchAll(/<source\b[^>]*srcset=["']([^"']+)["']/gi)) {
    const url = publicAssetUrl(bestFromSrcset(match[1]), base);
    if (url) photos.push({ url, alt: "", tamanho: 0, evidence: "<source srcset>" });
  }
  for (const match of body.matchAll(/background(?:-image)?\s*:\s*url\((['"]?)([^'")]+)\1\)/gi)) {
    const url = publicAssetUrl(match[2], base);
    if (url && !/logo|marca|brand|icon|sprite/i.test(url)) photos.push({ url, alt: "", tamanho: 0, evidence: "background-image no CSS" });
  }
  const ogImage = publicAssetUrl(clean(unescape(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i.exec(body)?.[1] ?? "")), base);
  if (ogImage && !/logo|marca|brand|icon/i.test(ogImage)) photos.push({ url: ogImage, alt: "", tamanho: 0, evidence: "meta og:image" });
  // Variantes responsivas da mesma imagem (srcset) não são fotos diferentes.
  const chaveDaFoto = (url) => String(url).split("?")[0].replace(/[-_]\d{2,4}x\d{2,4}(?=\.)/i, "");
  const vistas = new Set();
  photos.sort((a, b) => b.tamanho - a.tamanho);
  for (const photo of photos) {
    const chave = chaveDaFoto(photo.url);
    if (vistas.has(chave)) continue;
    vistas.add(chave);
    addAsset("photo", photo.url, photo.evidence);
    if (vistas.size >= COLLECTOR_MAX_PHOTOS) break;
  }
  const iconRaw = /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*href=["']([^"']+)["']/i.exec(body)?.[1];
  addAsset("icon", publicAssetUrl(iconRaw, base), "link rel=icon");

  const headline = stripTags(unescape(/<h1[^>]*>([\s\S]{0,240}?)<\/h1>/i.exec(body)?.[1] ?? "")) || clean(unescape(/<title[^>]*>([\s\S]{0,200}?)<\/title>/i.exec(body)?.[1] ?? ""));
  const subheadline = clean(unescape(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']{0,300})["']/i.exec(body)?.[1] ?? ""));
  const sectionTitles = [...body.matchAll(/<h[23][^>]*>([\s\S]{0,160}?)<\/h[23]>/gi)].map((match) => stripTags(unescape(match[1]))).filter(Boolean);
  const listItems = [...body.matchAll(/<li[^>]*>([\s\S]{0,160}?)<\/li>/gi)].map((match) => stripTags(unescape(match[1]))).filter((item) => item.length >= 3 && item.length <= 60);
  const navItems = [...body.matchAll(/<a\b[^>]*>([\s\S]{0,80}?)<\/a>/gi)].map((match) => stripTags(unescape(match[1]))).filter((item) => item.length >= 3 && item.length <= 40);
  const paragraphs = [...body.matchAll(/<p\b[^>]*>([\s\S]{0,600}?)<\/p>/gi)].map((match) => stripTags(unescape(match[1]))).filter((item) => item.length >= 40);
  const ROTULOS_DE_ACAO = /^(home|in[ií]cio|contato|sobre|blog|menu|ligar|ligue|telefone|whatsapp|e-?mail|fale conosco|enviar|saiba mais|ver mais|comprar|pe[cç]a|agendar|reservar|delivery|card[aá]pio)$/i;
  // Listas reais (<ul>/<li>) mantêm o título que o próprio cliente publicou
  // antes delas: nada é renomeado nem reinterpretado por nós.
  const listas = [];
  for (const match of body.matchAll(/<ul\b[^>]*>([\s\S]{0,4000}?)<\/ul>/gi)) {
    const inicio = match.index ?? 0;
    const cabecalho = [...body.slice(0, inicio).matchAll(/<h[23][^>]*>([\s\S]{0,160}?)<\/h[23]>/gi)].pop();
    const items = [...match[1].matchAll(/<li[^>]*>([\s\S]{0,200}?)<\/li>/gi)].map((li) => stripTags(unescape(li[1]))).filter((item) => item.length >= 3 && item.length <= 80 && !ROTULOS_DE_ACAO.test(item));
    if (items.length) listas.push({ title: cabecalho ? stripTags(unescape(cabecalho[1])) : "", items: [...new Set(items)].slice(0, 8) });
  }
  const services = [...new Set(listas.flatMap((lista) => lista.items))].slice(0, 12);
  const nav = [...new Set(navItems)].filter((item) => !ROTULOS_DE_ACAO.test(item)).slice(0, 8);

  const telefonesPublicados = [...new Map([...body.matchAll(/tel:([+0-9()\s.\-]{8,25})/gi)].map((match) => [digits(match[1]), /^\s*\+/.test(match[1])])).entries()].filter(([value]) => value.length >= 10);
  const phones = telefonesPublicados.map(([value]) => value);
  const emails = [...new Set([...body.matchAll(/mailto:([^"'?>\s]+)/gi)].map((match) => decodeURIComponent(clean(match[1]))).filter((value) => /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(value)))];
  const whatsapp = digits(/wa\.me\/(\d{8,15})|api\.whatsapp\.com\/send\?phone=(\d{8,15})/i.exec(body)?.slice(1).filter(Boolean)[0] ?? "");
  const social = {
    instagram: /instagram\.com\/([A-Za-z0-9._]{2,40})/i.exec(body)?.[1] ?? "",
    facebook: /facebook\.com\/([A-Za-z0-9._-]{2,60})/i.exec(body)?.[1] ?? "",
    tiktok: /tiktok\.com\/@?([A-Za-z0-9._]{2,40})/i.exec(body)?.[1] ?? "",
  };
  const addressTag = stripTags(unescape(/<address[^>]*>([\s\S]{0,240}?)<\/address>/i.exec(body)?.[1] ?? ""));

  const contacts = {
    phone: [
      ...telefonesPublicados.map(([value, internacional]) => ({ value, international: internacional, source: "site publico do lead", source_url: base, evidence: "link tel:", collected_at: checkedAt })),
      ...(known.telefone && !phones.includes(digits(known.telefone)) ? [{ value: digits(known.telefone), international: /^\s*\+/.test(String(known.telefone)), source: known.source ?? "crm", source_url: known.source_url ?? null, evidence: "contato confirmado no CRM", collected_at: checkedAt }] : []),
    ],
    whatsapp: whatsapp
      ? [{ value: whatsapp, source: "site publico do lead", source_url: base, evidence: "link wa.me", international: true, collected_at: checkedAt }]
      : (known.whatsapp ? [{ value: digits(known.whatsapp), source: known.source ?? "crm", source_url: known.source_url ?? null, evidence: "contato confirmado no CRM", collected_at: checkedAt }] : []),
    email: [
      ...emails.map((value) => ({ value, source: "site publico do lead", source_url: base, evidence: "link mailto:", collected_at: checkedAt })),
      ...(known.email && !emails.includes(clean(known.email)) ? [{ value: clean(known.email), source: known.source ?? "crm", source_url: known.source_url ?? null, evidence: "contato confirmado no CRM", collected_at: checkedAt }] : []),
    ],
    address: addressTag
      ? { value: addressTag, source: "site publico do lead", source_url: base, evidence: "tag <address>", collected_at: checkedAt }
      : (known.end_cliente ? { value: clean(known.end_cliente), source: known.source ?? "crm", source_url: known.source_url ?? null, evidence: "endereço enriquecido no CRM", collected_at: checkedAt } : null),
    social: Object.fromEntries(Object.entries(social).map(([key, handle]) => [key, handle ? { handle, source: "site publico do lead", source_url: base, evidence: `link ${key}`, collected_at: checkedAt } : null])),
  };

  const cores = new Map();
  for (const match of body.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
    const hex = `#${match[1].toLowerCase()}`;
    cores.set(hex, (cores.get(hex) ?? 0) + 1);
  }
  const palette = [...cores.entries()]
    .filter(([hex]) => !/^#(fff|ffffff|000|000000)$/.test(hex))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([color, count]) => ({ color, count, source_url: base }));

  const visibleText = stripTags(body);
  const warnings = [];
  if (!assets.some((asset) => asset.kind === "logo")) warnings.push({ code: "redesign_no_logo", message: "Nenhum logo público encontrado no site do cliente: a marca será composta tipograficamente." });
  if (!assets.some((asset) => asset.kind === "photo")) warnings.push({ code: "redesign_no_photo", message: "Nenhuma foto pública do cliente encontrada no HTML." });
  if (!contacts.phone.length && !contacts.whatsapp.length && !contacts.email.length) warnings.push({ code: "redesign_no_contact", message: "Nenhum canal de contato público encontrado; a página sai sem CTA de contato." });
  if (!contacts.address) warnings.push({ code: "redesign_no_address", message: "Nenhum endereço público encontrado." });
  if (visibleText.length < 400) warnings.push({ code: "redesign_thin_html", message: "Pouco texto no HTML público (possível conteúdo renderizado por JavaScript)." });

  return {
    site: { url: base, status, content_type: contentType, bytes, title: clean(unescape(/<title[^>]*>([\s\S]{0,200}?)<\/title>/i.exec(body)?.[1] ?? "")), viewport: /<meta[^>]+name=["']viewport["']/i.test(body) },
    assets,
    asset_sources: assetSources,
    texts: { headline, subheadline, section_titles: sectionTitles.slice(0, 8), services, lists: listas.slice(0, 3), nav, paragraphs: paragraphs.slice(0, 6) },
    contacts,
    palette,
    warnings,
  };
}

export async function collectSiteAssets({ siteUrl, fetchImpl = fetch, resolveHost, timeoutMs = DEFAULT_TIMEOUT_MS, contact = DEFAULT_CONTACT, now = () => new Date(), known = {} } = {}) {
  if (!isPublicHttpUrl(siteUrl)) throw new RedesignError("redesign_invalid_site_url", "O lead não possui site público HTTP(S) para o redesign.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let outcome;
  try {
    outcome = await guardedFetch(String(siteUrl), { fetchImpl, resolveHost, signal: controller.signal, label: "site do cliente", headers: { "User-Agent": contact, Accept: "text/html,application/xhtml+xml", "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8" } });
  } catch (error) {
    if (error?.name === "AbortError") throw new RedesignError("redesign_timeout", `O site do cliente não respondeu dentro de ${Math.round(timeoutMs / 1000)}s.`);
    if (String(error?.code ?? "").startsWith("ssrf_")) throw new RedesignError(error.code, `Endereço recusado pela proteção SSRF: ${error.message}`, error.details);
    throw new RedesignError("redesign_site_unavailable", "Não foi possível abrir o site público do cliente.");
  } finally {
    clearTimeout(timer);
  }
  const { response, url: finalUrl } = outcome;
  if (!response?.ok) throw new RedesignError("redesign_site_http_error", `O site do cliente respondeu ${response?.status ?? "sem status"}.`, { status: response?.status ?? null });
  const contentType = response.headers?.get?.("content-type") ?? "";
  if (contentType && !/html|text/i.test(contentType)) throw new RedesignError("redesign_not_html", `O site do cliente devolveu ${contentType}, não HTML.`);
  const html = (await response.text()).slice(0, 1024 * 1024);
  return extractSiteAssets({ html, finalUrl, status: Number(response.status ?? 200), contentType, bytes: html.length, checkedAt: now().toISOString(), known });
}
