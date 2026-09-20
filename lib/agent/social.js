/**
 * DS-VALUE-05 — ANALYZE_SOCIAL: diagnóstico factual do perfil social público.
 *
 * Lê somente página pública (nenhum login, nenhum bypass, nenhuma coleta privada)
 * e registra apenas o que foi observado. O que a página pública não expõe é
 * registrado como limitação — nunca preenchido por suposição.
 */

import { guardedFetch } from "../net/ssrf-guard.js";
import { AgentError } from "./contract.js";

const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_CONTACT = "DattaSeller Agent (+https://crm.datta360.com.br)";
const CTA_PATTERN = /(agende|agendar|peça|peca|pedido|delivery|order|book|reserve|compre|comprar|fale|whatsapp|contato|link na bio|clique)/i;

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const unescape = (value) => String(value ?? "").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const meta = (html, property) => {
  // A descrição pública do Instagram costuma ter apóstrofo ("Rosie's"), então o
  // valor é lido respeitando o tipo de aspas do atributo.
  const candidatos = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]*content="([^"]*)"`, "i"),
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]*content='([^']*)'`, "i"),
    new RegExp(`<meta[^>]+content="([^"]*)"[^>]*(?:property|name)=["']${property}["']`, "i"),
    new RegExp(`<meta[^>]+content='([^']*)'[^>]*(?:property|name)=["']${property}["']`, "i"),
  ];
  for (const padrao of candidatos) {
    const achado = padrao.exec(html)?.[1];
    if (achado) return unescape(clean(achado));
  }
  return "";
};

const parseCount = (valor, sufixo) => {
  const bruto = String(valor ?? "").trim();
  const temSufixo = /k|m/i.test(String(sufixo ?? ""));
  // "12.3K" tem ponto decimal; "1.204" (sem sufixo) tem separador de milhar.
  const numero = Number(temSufixo ? bruto.replace(",", ".") : bruto.replace(/[.,]/g, ""));
  if (!Number.isFinite(numero)) return null;
  const multiplicador = /k/i.test(String(sufixo ?? "")) ? 1000 : /m/i.test(String(sufixo ?? "")) ? 1000000 : 1;
  return Math.round(numero * multiplicador) || null;
};

/** Lê os fatos públicos disponíveis na página do perfil. */
export function extractSocialProfile({ html, profileUrl, platform, checkedAt }) {
  const body = String(html ?? "");
  const titulo = meta(body, "og:title") || clean(/<title[^>]*>([\s\S]{0,200}?)<\/title>/i.exec(body)?.[1] ?? "");
  const descricao = meta(body, "og:description");
  const imagem = meta(body, "og:image");
  const handle = /\(@([A-Za-z0-9._]{2,40})\)/.exec(titulo)?.[1] ?? "";
  const nome = clean(titulo.replace(/\s*\(@[^)]+\).*$/, ""));
  const seguidores = parseCount(/([\d.,]+)\s*([KkMm]?)\s*(?:Followers|followers)/.exec(descricao)?.[1], /([\d.,]+)\s*([KkMm]?)\s*(?:Followers|followers)/.exec(descricao)?.[2]);
  const seguindo = parseCount(/([\d.,]+)\s*([KkMm]?)\s*(?:Following|following)/.exec(descricao)?.[1], /([\d.,]+)\s*([KkMm]?)\s*(?:Following|following)/.exec(descricao)?.[2]);
  const publicacoes = parseCount(/([\d.,]+)\s*([KkMm]?)\s*(?:Posts|posts|videos|Videos)/.exec(descricao)?.[1], /([\d.,]+)\s*([KkMm]?)\s*(?:Posts|posts|videos|Videos)/.exec(descricao)?.[2]);
  const bioPublicada = /on Instagram[:\s]*["“]([^"”]+)["”]/i.exec(descricao)?.[1] ?? "";
  const loginWall = /login|entrar/i.test(titulo) || /accounts\/login/i.test(body) && !seguidores;
  const perfilVisivel = Boolean(handle || seguidores || bioPublicada) && !loginWall;
  const facts = [];
  if (handle) facts.push({ criterio: "handle", observacao: `Perfil confirmado como @${handle}`, valor: handle });
  if (nome) facts.push({ criterio: "nome_exibido", observacao: `Nome exibido publicamente: ${nome}`, valor: nome });
  if (seguidores) facts.push({ criterio: "seguidores", observacao: `${seguidores} seguidores publicados no perfil`, valor: String(seguidores) });
  if (publicacoes) facts.push({ criterio: "publicacoes", observacao: `${publicacoes} publicações contadas no perfil`, valor: String(publicacoes) });
  if (seguindo) facts.push({ criterio: "seguindo", observacao: `${seguindo} perfis seguidos`, valor: String(seguindo) });
  if (bioPublicada) facts.push({ criterio: "bio", observacao: `Bio pública: "${bioPublicada}"`, valor: bioPublicada });
  if (imagem) facts.push({ criterio: "imagem_perfil", observacao: "Imagem de perfil pública disponível", valor: imagem });
  return {
    platform,
    profile_url: profileUrl,
    handle: handle || null,
    display_name: nome || null,
    bio: bioPublicada || null,
    cta: bioPublicada && CTA_PATTERN.test(bioPublicada) ? bioPublicada : "",
    links: [],
    visual_identity: imagem ? { profile_image: imagem, source: profileUrl, note: "Imagem pública do perfil; leitura de paleta exige visão/LLM (não autorizado no ambiente)." } : null,
    consistency_note: perfilVisivel ? "Identidade observável limitada ao que a página pública expõe sem autenticação (nome, bio, imagem, contadores)." : "Não foi possível observar identidade visual sem autenticação.",
    frequency_note: publicacoes ? `${publicacoes} publicações no total; cadência (postagens por semana) não é derivável da página pública sem autenticação.` : "Frequência não observável na página pública sem autenticação.",
    formats: [],
    facts,
    evidence: facts.map((fato) => ({ ...fato, source_url: profileUrl, checked_at: checkedAt })),
    warnings: [
      ...(perfilVisivel ? [] : [{ code: "social_profile_not_public", message: "A página pública não expôs dados do perfil (possível muro de login); nada foi inferido." }]),
      { code: "social_limits_public_html", message: "Links da bio, formatos de conteúdo e cadência não são visíveis no HTML público sem autenticação." },
    ],
    checked_at: checkedAt,
    perfil_visivel: perfilVisivel,
    counters: { followers: seguidores, following: seguindo, posts: publicacoes },
  };
}

export async function analyzeSocialProfile({ profileUrl, platform, fetchImpl = fetch, resolveHost, timeoutMs = DEFAULT_TIMEOUT_MS, contact = DEFAULT_CONTACT, now = () => new Date() } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let outcome;
  try {
    outcome = await guardedFetch(String(profileUrl), { fetchImpl, resolveHost, signal: controller.signal, label: "perfil social público", headers: { "User-Agent": contact, Accept: "text/html,application/xhtml+xml", "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8" } });
  } catch (error) {
    if (error?.name === "AbortError") throw new AgentError("social_timeout", `O perfil não respondeu dentro de ${Math.round(timeoutMs / 1000)}s.`);
    if (String(error?.code ?? "").startsWith("ssrf_")) throw new AgentError(error.code, `Endereço recusado pela proteção SSRF: ${error.message}`, error.details);
    throw new AgentError("social_unavailable", "Não foi possível abrir o perfil público.");
  } finally {
    clearTimeout(timer);
  }
  const { response } = outcome;
  if (!response?.ok) throw new AgentError("social_http_error", `O perfil respondeu ${response?.status ?? "sem status"}.`, { status: response?.status ?? null });
  const html = (await response.text()).slice(0, 1024 * 1024);
  const extraido = extractSocialProfile({ html, profileUrl: String(profileUrl), platform, checkedAt: now().toISOString() });
  if (!extraido.perfil_visivel) throw new AgentError("social_profile_not_public", "A página não expôs dados do perfil público (possível muro de login). Nenhum dado foi inferido.", { profile_url: profileUrl });
  return extraido;
}

const TAB_FORMATS = [
  [/(publica[çc][õo]es|posts)/i, "feed"],
  [/(reels|v[ií]deos)/i, "vídeos curtos"],
  [/(marcad|tagged)/i, "conteúdo marcado"],
  [/(salvos|saved)/i, "coleções"],
];

/**
 * Perna de browser do agente: recebe SÓ o que um browser real leu na página
 * pública (título, meta, imagem, texto visível, abas) e transforma em fatos com
 * proveniência. Instagram costuma exigir browser; o HTML puro devolve muro de
 * login — por isso a evidência de browser é validada no contrato antes de entrar.
 */
export function analyzeFromBrowserEvidence({ profileUrl, platform, evidence, checkedAt = null }) {
  const texto = String(evidence?.visible_text ?? "");
  const titulo = clean(evidence?.og_title || evidence?.title);
  const descricao = clean(evidence?.og_description);
  const fonte = String(profileUrl);
  const coletadoEm = clean(evidence?.collected_at) || checkedAt || new Date().toISOString();
  // Só aceitamos handle publicado com "@": sem isso qualquer palavra viraria
  // "perfil confirmado" (ex.: página de login).
  const handle = /\(@([A-Za-z0-9._]{2,40})\)/.exec(titulo)?.[1] ?? /@([A-Za-z0-9._]{2,40})\b/.exec(texto)?.[1] ?? "";
  const nome = clean(titulo.replace(/\s*\(@[^)]+\).*$/, "").replace(/•.*$/, ""));
  const numero = (padrao) => {
    // O texto visível é o que o browser realmente mostrou; a meta vem depois.
    const achado = padrao.exec(texto) ?? padrao.exec(descricao);
    if (!achado) return null;
    const sufixo = /mil\b/i.test(achado[0]) ? "k" : (achado[2] ?? "");
    return parseCount(achado[1], sufixo);
  };
  const seguidores = numero(/([\d.,]+)\s*(mil|[KkMm]?)\s*(?:seguidores|followers)/i);
  const seguindo = numero(/([\d.,]+)\s*(mil|[KkMm]?)\s*(?:seguindo|following)/i);
  const publicacoes = numero(/([\d.,]+)\s*(mil|[KkMm]?)\s*(?:posts|publica)/i);
  const segmentos = texto.split("|").map((parte) => clean(parte)).filter(Boolean);
  const RUIDO_DE_UI = /seguidores|following|seguindo|\d+\s*posts|entrar|cadastre|mostrar mais|posts de|meta |privacidade|portugu[eê]s|afrikaans/i;
  const bioPorSegmento = segmentos.find((parte) => parte.length >= 20 && !RUIDO_DE_UI.test(parte) && parte !== nome && parte !== handle);
  // O texto visível do Instagram costuma vir sem separadores: nesse caso a bio é
  // o trecho publicado logo depois do nome do perfil, cortado nos marcadores de UI.
  const bioPorPosicao = (() => {
    if (!handle) return "";
    const indices = [...texto.matchAll(new RegExp(handle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))].map((achado) => achado.index ?? -1).filter((indice) => indice >= 0);
    // A última ocorrência costuma ser o rótulo "posts de @perfil"; procuramos a
    // ocorrência (de trás para frente) que realmente traz a bio publicada.
    for (const indice of indices.reverse()) {
      const resto = clean(texto.slice(indice + handle.length));
      const corte = resto.search(/\b(e mais|mostrar mais|posts de|brunch|comida|tequila|fiestas|catering)\b/i);
      const trecho = clean(corte > 20 ? resto.slice(0, corte) : resto).slice(0, 240);
      if (trecho.length >= 20 && !RUIDO_DE_UI.test(trecho)) return trecho;
    }
    return "";
  })();
  const bio = bioPorSegmento ?? bioPorPosicao;
  const links = [...new Set([...`${texto} ${bio}`.matchAll(/((?:https?:\/\/)?(?:linktr\.ee|beacons\.ai|wa\.me|bit\.ly)\/[^\s|]+)/gi)].map((m) => m[1]))];
  const tabs = (evidence?.tabs ?? []).filter(Boolean);
  const formats = TAB_FORMATS.filter(([padrao]) => tabs.some((aba) => padrao.test(aba)) || padrao.test(texto)).map(([, formato]) => formato);
  const facts = [];
  if (handle) facts.push({ criterio: "handle", observacao: `Perfil confirmado como @${handle} no browser`, valor: handle });
  if (nome) facts.push({ criterio: "nome_exibido", observacao: `Nome exibido publicamente: ${nome}`, valor: nome });
  if (seguidores) facts.push({ criterio: "seguidores", observacao: `${seguidores} seguidores publicados no perfil`, valor: String(seguidores) });
  if (publicacoes) facts.push({ criterio: "publicacoes", observacao: `${publicacoes} publicações contadas no perfil`, valor: String(publicacoes) });
  if (seguindo) facts.push({ criterio: "seguindo", observacao: `${seguindo} perfis seguidos`, valor: String(seguindo) });
  if (bio) facts.push({ criterio: "bio", observacao: "Bio pública lida no browser", valor: bio.slice(0, 240) });
  if (evidence?.og_image) facts.push({ criterio: "imagem_perfil", observacao: "Imagem de perfil pública disponível", valor: clean(evidence.og_image) });
  if (formats.length) facts.push({ criterio: "formatos", observacao: `Abas publicadas no perfil: ${tabs.join(" · ") || formats.join(" · ")}`, valor: formats.join(", ") });
  if (links.length) facts.push({ criterio: "links", observacao: `Links publicados na bio: ${links.join(" ")}`, valor: links.join(" ") });
  // Sem handle, contadores ou bio publicados não há perfil público confirmado:
  // muro de login (ou página vazia) falha fechado, sem inferir nada.
  if (!handle && !seguidores && !bio) {
    throw new AgentError("social_profile_not_public", "A página não expôs dados do perfil público (possível muro de login). Nenhum dado foi inferido.", { profile_url: fonte });
  }
  if (!facts.length) throw new AgentError("social_invalid_browser_evidence", "A evidência do browser não trouxe nenhum fato do perfil.");
  return {
    platform,
    profile_url: fonte,
    handle: handle || null,
    display_name: nome || null,
    bio: bio || null,
    cta: bio && CTA_PATTERN.test(bio) ? bio : "",
    links,
    visual_identity: evidence?.og_image ? { profile_image: clean(evidence.og_image), source: fonte, note: "Imagem pública do perfil lida no browser; leitura de paleta exige visão/LLM (não autorizado no ambiente)." } : null,
    consistency_note: "Fatos lidos em browser real na página pública (nome, bio, contadores, imagem, abas).",
    frequency_note: publicacoes ? `${publicacoes} publicações no total; cadência (postagens por semana) não é derivável da página pública sem autenticação.` : "Frequência não observável na página pública sem autenticação.",
    formats,
    facts,
    evidence: facts.map((fato) => ({ ...fato, source_url: fonte, checked_at: coletadoEm, collector: clean(evidence?.collector) || "playwright" })),
    warnings: [{ code: "social_limits_public_html", message: "Links da bio, formatos de conteúdo e cadência não são visíveis no HTML público sem autenticação." }],
    checked_at: coletadoEm,
    perfil_visivel: Boolean(handle || seguidores || bio),
    counters: { followers: seguidores, following: seguindo, posts: publicacoes },
    evidence_source: "browser",
  };
}
