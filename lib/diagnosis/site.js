/**
 * DS-VALUE-03 — diagnóstico factual do site real do lead.
 *
 * Regra do contrato: só entra fato verificável. O diagnóstico relata o que foi
 * observado na resposta HTTP e no HTML público — nunca afirma lentidão,
 * insegurança, SEO ruim ou perda de cliente sem teste.
 */

import { isPublicHttpUrl } from "../prospector.js";
import { UnsafeTargetError, guardedFetch } from "../net/ssrf-guard.js";

export const DIAGNOSIS_MAX_BYTES = 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_CONTACT = "DattaSeller CRM (+https://crm.datta360.com.br)";

export class DiagnosisError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = "DiagnosisError";
    this.code = code;
    this.details = details;
  }
}

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const stripTags = (value) => clean(String(value ?? "").replace(/<[^>]*>/g, " "));
const unescape = (value) => String(value ?? "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const tagTexts = (html, tag) => [...String(html).matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "gi"))].map((match) => stripTags(unescape(match[1]))).filter(Boolean).slice(0, 20);
const CTA_PATTERN = /(fale conosco|entre em contato|contato|whatsapp|orçamento|orcamento|peça|peca|agende|agendar|reserve|reservar|compre|comprar|solicite|solicitar|ligue|chame|saiba mais|ver mais|pedir|delivery|menu|cardápio|cardapio)/i;

/**
 * Lê a resposta real e devolve apenas fatos observados, cada um com a sua
 * evidência textual (o que foi visto e onde).
 */
export function analyzeSite({ finalUrl, status, contentType, html, bytes, redirects = [], checkedAt }) {
  const body = String(html ?? "");
  const links = [...body.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{0,120}?)<\/a>/gi)].map((match) => ({ href: clean(match[1]), texto: stripTags(unescape(match[2])) }));
  const host = (() => { try { return new URL(finalUrl).hostname.replace(/^www\./, ""); } catch { return ""; } })();
  const externos = links.filter((link) => /^https?:\/\//i.test(link.href) && !link.href.includes(host));
  const ctas = links.filter((link) => CTA_PATTERN.test(link.texto) || CTA_PATTERN.test(link.href)).map((link) => link.texto || link.href).slice(0, 10);
  const imagens = [...body.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
  const semAlt = imagens.filter((tag) => !/\balt\s*=\s*["'][^"']+["']/i.test(tag)).length;
  const fatos = {
    url_final: finalUrl,
    redirecionamentos: redirects,
    http_status: status,
    content_type: contentType || null,
    tamanho_bytes: bytes,
    titulo: clean(unescape(/<title[^>]*>([\s\S]{0,300}?)<\/title>/i.exec(body)?.[1] ?? "")),
    descricao: clean(unescape(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']{0,400})["']/i.exec(body)?.[1] ?? "")),
    idioma_declarado: clean(/<html[^>]+lang=["']([^"']+)["']/i.exec(body)?.[1] ?? ""),
    viewport_declarado: /<meta[^>]+name=["']viewport["']/i.test(body),
    titulos_h1: tagTexts(body, "h1"),
    subtitulos_h2: tagTexts(body, "h2").slice(0, 10),
    chamadas_para_acao: ctas,
    links: { total: links.length, externos: externos.length },
    contatos: {
      email: [...new Set([...body.matchAll(/mailto:([^"'?>\s]+)/gi)].map((match) => decodeURIComponent(clean(match[1]))))].slice(0, 5),
      telefone: [...new Set([...body.matchAll(/tel:([+0-9()\s.\-]{8,25})/gi)].map((match) => clean(match[1])))].slice(0, 5),
      whatsapp: /wa\.me\/\d{8,15}|api\.whatsapp\.com\/send\?phone=\d{8,15}/i.test(body),
      formulario: /<form\b/i.test(body),
      instagram: /instagram\.com\/[A-Za-z0-9._]{2,40}/i.test(body),
      facebook: /facebook\.com\/[A-Za-z0-9._-]{2,60}/i.test(body),
    },
    imagens: { total: imagens.length, sem_alt: semAlt },
    tecnologia_declarada: {
      generator: clean(/<meta[^>]+name=["']generator["'][^>]*content=["']([^"']+)["']/i.exec(body)?.[1] ?? ""),
      og_image: /<meta[^>]+property=["']og:image["']/i.test(body),
      favicon: /rel=["'][^"']*icon[^"']*["']/i.test(body),
      canonical: clean(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i.exec(body)?.[1] ?? ""),
    },
  };
  const evidencias = [
    { criterio: "resposta_http", observacao: `GET ${finalUrl} respondeu ${status}`, valor: String(status) },
    { criterio: "titulo", observacao: fatos.titulo ? `Título declarado: "${fatos.titulo}"` : "Página sem <title> legível no HTML", valor: fatos.titulo },
    { criterio: "proposta_de_valor", observacao: fatos.descricao ? `Meta description: "${fatos.descricao}"` : "Sem meta description declarada", valor: fatos.descricao },
    { criterio: "cta", observacao: ctas.length ? `Chamadas para ação encontradas no HTML: ${ctas.slice(0, 5).join(" · ")}` : "Nenhum texto de chamada para ação reconhecido no HTML", valor: String(ctas.length) },
    { criterio: "mobile", observacao: fatos.viewport_declarado ? "Página declara meta viewport" : "Página não declara meta viewport no HTML", valor: String(fatos.viewport_declarado) },
    { criterio: "hierarquia", observacao: `H1: ${fatos.titulos_h1.length} · H2: ${fatos.subtitulos_h2.length}`, valor: String(fatos.titulos_h1.length) },
    { criterio: "contato", observacao: `mailto: ${fatos.contatos.email.length} · tel: ${fatos.contatos.telefone.length} · formulário: ${fatos.contatos.formulario ? "sim" : "não"} · WhatsApp: ${fatos.contatos.whatsapp ? "sim" : "não"}`, valor: JSON.stringify(fatos.contatos) },
    { criterio: "prova_social", observacao: fatos.contatos.instagram || fatos.contatos.facebook ? "A página aponta para rede social pública" : "Nenhum link de rede social reconhecido no HTML", valor: `${fatos.contatos.instagram ? "instagram" : ""}${fatos.contatos.facebook ? " facebook" : ""}`.trim() },
    { criterio: "imagens", observacao: `${fatos.imagens.total} imagem(ns) no HTML; ${fatos.imagens.sem_alt} sem texto alternativo`, valor: String(fatos.imagens.total) },
  ];
  return { fatos, evidencias, checked_at: checkedAt };
}

export async function diagnoseSite(url, { fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS, contact = DEFAULT_CONTACT, now = () => new Date(), resolveHost } = {}) {
  if (!isPublicHttpUrl(url)) throw new DiagnosisError("diagnosis_invalid_url", "O lead não possui site público HTTP(S) para diagnosticar.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let outcome;
  try {
    // SSRF fail-closed: o destino e cada salto de redirect são validados antes
    // de qualquer requisição (localhost, rede privada, link-local, metadata).
    outcome = await guardedFetch(String(url), { fetchImpl, resolveHost, signal: controller.signal, label: "site do lead", headers: { "User-Agent": contact, Accept: "text/html,application/xhtml+xml", "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8" } });
  } catch (error) {
    if (error?.name === "AbortError") throw new DiagnosisError("diagnosis_timeout", `O site não respondeu dentro de ${Math.round(timeoutMs / 1000)}s.`);
    if (error instanceof UnsafeTargetError) throw new DiagnosisError(error.code, `Endereço recusado pela proteção SSRF: ${error.message}`, error.details);
    throw new DiagnosisError("diagnosis_unavailable", "Não foi possível abrir o site público do lead.");
  } finally {
    clearTimeout(timer);
  }
  const { response, url: finalUrl, chain } = outcome;
  const redirects = chain.slice(0, -1).map((from, index) => ({ de: from, para: chain[index + 1] }));
  const status = Number(response?.status ?? 0);
  const contentType = response?.headers?.get?.("content-type") ?? "";
  if (!response?.ok) throw new DiagnosisError("diagnosis_http_error", `O site respondeu ${status || "sem status"}.`, { status });
  if (contentType && !/html|text/i.test(contentType)) throw new DiagnosisError("diagnosis_not_html", `O endereço devolveu ${contentType}, não uma página HTML.`, { contentType });
  const html = (await response.text()).slice(0, DIAGNOSIS_MAX_BYTES);
  return { url: String(url), ...analyzeSite({ finalUrl: String(finalUrl), status, contentType, html, bytes: html.length, redirects, checkedAt: now().toISOString() }) };
}
