/**
 * DS-VALUE-06 — BUILD_SOCIAL_DEMO: demonstração social visual.
 *
 * Segue o material original (`docs/sources/prospector/OS-5-PROMPTS-SERVICOS-COM-IA-extracted.md`):
 * Nome · O que vende · Público · Tom de voz · O que NUNCA dizer, e para cada peça
 * gancho + legenda + 5 hashtags + sugestão visual.
 *
 * Nenhum fato é inventado: a copy só apresenta elementos reais (serviços, headline,
 * endereço, contatos, fotos) e o que não é observável fica marcado como pendência
 * do cliente. Sem provider de LLM autorizado, a composição é determinística.
 */

import { AgentError } from "./contract.js";

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const slug = (value) => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const hashtag = (value) => { const s = slug(value); return s.length >= 3 ? `#${s}` : ""; };

export const NEVER_SAY = [
  "promessa de resultado ou garantia de retorno",
  "comparação direta com concorrente pelo nome",
  "número, nota ou avaliação que o cliente não publicou",
  "preço, desconto ou prazo que não veio do cliente",
  "urgência artificial (últimas vagas, só hoje) sem fato",
  "depoimento ou cliente que não existe/não autorizou",
];

// Variedade de formatos do material original (dica, bastidor, prova social,
// oferta, pergunta). Prova social e oferta só entram com material do cliente.
const variacoesDeFormato = ["apresentação", "serviço", "bastidor", "prova social", "dica do próprio cliente", "oferta", "contato"];

function toneFromTexts(textos = []) {
  const corpo = textos.join(" ").toLowerCase();
  if (/\b(você|voce|te |sua |seu )\b/.test(corpo)) return { value: "próximo e direto (tratamento por você, como nos textos publicados)", evidence: "textos publicados usam tratamento direto" };
  if (/\bnós|nosso|nossa\b/.test(corpo)) return { value: "institucional em primeira pessoa do plural", evidence: "textos publicados usam 'nós/nosso'" };
  return { value: null, status: "a_confirmar_com_cliente", evidence: "sem sinal suficiente nos textos publicados" };
}

function audienceFromTexts(textos = []) {
  const corpo = textos.join(" ").toLowerCase();
  const achados = ["família", "familias", "crianças", "criancas", "casais", "empresas", "profissionais", "turistas", "estudantes"].filter((t) => corpo.includes(t));
  if (achados.length) return { value: achados.join(", "), evidence: `termos publicados pelo cliente: ${achados.join(", ")}` };
  return { value: null, status: "a_confirmar_com_cliente", evidence: "o site não descreve o público" };
}

export function buildSocialDemo({ lead = {}, analysis = null, brand = {}, texts = {}, contacts = {}, diagnosis = null, now = () => new Date(), copyOverrides = null } = {}) {
  const nome = clean(lead.nome || brand.wordmark);
  if (!nome) throw new AgentError("social_missing_brand", "Sem nome real da empresa não há demonstração social.");
  // Rótulos de navegação/localização não viram "serviço" na peça.
  const ROTULO_DE_NAVEGACAO = /^(all locations?|locations?|home|in[ií]cio|menu|hours|contact|contato|blog)$/i;
  const servicos = (texts.services ?? []).map((item) => clean(item)).filter((item) => item && item.length <= 40 && !ROTULO_DE_NAVEGACAO.test(item)).slice(0, 6);
  const headline = clean(texts.headline || texts.title || nome);
  const paragrafos = (texts.paragraphs ?? []).filter(Boolean);
  const endereco = clean(contacts.address?.value);
  const telefone = clean(contacts.phone?.[0]?.value);
  const email = clean(contacts.email?.[0]?.value);
  const whatsappUrl = contacts.whatsapp?.[0]?.international ? `https://wa.me/${String(contacts.whatsapp[0].value).replace(/\D/g, "")}` : "";
  const contatoReal = whatsappUrl || (telefone ? `tel:${contacts.phone[0].international ? "+" : ""}${telefone}` : (email ? `mailto:${email}` : ""));
  const contatoLabel = whatsappUrl ? "Fale no WhatsApp" : telefone ? "Ligar agora" : email ? "Enviar e-mail" : "";
  const fotos = (brand.photos ?? []).slice(0, 4);
  const cidade = clean(lead.cidade); const nicho = clean(lead.nicho);
  const baseTags = [hashtag(nome), hashtag(cidade), hashtag(nicho), hashtag(servicos[0]), hashtag(`${nome}${cidade}`)].filter(Boolean);
  const completarTags = (extra) => [...new Set([extra, ...baseTags, "#novidade"].filter(Boolean))].slice(0, 5);
  const ctaTexto = contatoLabel ? `${contatoLabel}${endereco ? ` · ${endereco}` : ""}` : "Salve este post e acompanhe as novidades";
  const semProvaSocial = !analysis?.counters?.followers;
  const pendentes = [];
  if (semProvaSocial) pendentes.push("prova social (avaliações/depoimentos) exige material do cliente");

  const fonteDica = paragrafos[0] ?? "";
  const pecas = [
    { id: "feed-1", formato: "apresentação", hook: headline, caption: `${headline}${endereco ? ` · ${endereco}` : ""}${contatoReal ? `\n${contatoLabel}` : ""}`, tagsFonte: nome },
    { id: "feed-2", formato: "serviço", hook: servicos[0] ?? headline, caption: `${servicos[0] ? `${servicos[0]} — ` : ""}publicado por ${nome}${servicos[1] ? ` · também ${servicos.slice(1, 3).join(" · ")}` : ""}.${contatoReal ? `\n${contatoLabel}` : ""}`, tagsFonte: servicos[0] ?? nome },
    { id: "feed-3", formato: fonteDica ? "dica do próprio cliente" : "localização", hook: fonteDica ? clean(fonteDica).slice(0, 120) : (endereco || headline), caption: fonteDica ? `"${clean(fonteDica).slice(0, 240)}" — ${nome}${contatoReal ? `\n${contatoLabel}` : ""}` : `${endereco || nome}${contatoReal ? `\n${contatoLabel}` : ""}`, tagsFonte: cidade || nome },
  ];
  const overrides = copyOverrides && Array.isArray(copyOverrides.hooks) ? copyOverrides : null;
  const feed_pieces = pecas.map((peca, indice) => ({
    id: peca.id,
    format: peca.formato,
    hook: clean(overrides?.hooks?.[indice] ?? peca.hook),
    caption: clean(overrides?.captions?.[indice] ?? peca.caption),
    hashtags: completarTags(hashtag(peca.tagsFonte)),
    visual: fotos.length ? { suggestion: `Foto real do cliente (${fotos[0].slice(0, 80)}…) com o gancho em tipografia da marca.`, asset: fotos[0], source: "site publico do lead" } : { suggestion: "Composição tipográfica com a paleta real do cliente (sem foto pública disponível).", asset: null, source: "paleta publicada pelo cliente" },
    source_note: overrides ? "Copy revisada por LLM autorizado e validada pelo código (apenas fatos reais do cliente)." : "Copy montada apenas com elementos reais do cliente (headline, serviços, endereço, contato, fotos).",
  }));

  const calendar = variacoesDeFormato.map((formato, index) => {
    const peca = feed_pieces[index % feed_pieces.length];
    const precisaCliente = ["prova social", "oferta"].includes(formato);
    return {
      day: index + 1,
      format: formato,
      theme: formato === "dica do próprio cliente" ? "conteúdo publicado pelo cliente" : formato,
      hook: precisaCliente ? null : peca.hook,
      caption: precisaCliente ? null : peca.caption,
      hashtags: precisaCliente ? [] : peca.hashtags,
      visual: precisaCliente ? "aguardando material do cliente" : peca.visual.suggestion,
      requires_client_input: precisaCliente,
      note: precisaCliente ? "Prova social/oferta só entram com material e preço fornecidos pelo cliente (regra do material original)." : "Pronto para revisão humana antes de publicar.",
    };
  });

  const stories = fotos.slice(0, 3).map((foto, index) => ({
    id: `story-${index + 1}`,
    hook: index === 0 ? headlineshort(headline) : index === 1 ? (servicos[0] ?? "Nos bastidores") : (endereco ? "Onde estamos" : "Fale com a gente"),
    support: index === 0 ? nome : index === 1 ? (servicos.slice(0, 2).join(" · ") || nome) : (endereco || nome),
    cta: contatoLabel || "Acompanhe o perfil",
    asset: foto,
    source: "site publico do lead",
  }));
  while (stories.length < 3) {
    stories.push({ id: `story-${stories.length + 1}`, hook: stories.length === 0 ? headline : nome, support: endereco || servicos[0] || nome, cta: contatoLabel || "Acompanhe o perfil", asset: null, source: "tipografia com paleta real" });
  }

  const direction = {
    palette: brand.colors ?? null,
    typography: { heading: "serifada elegante", body: "sans limpa", note: "escolha de design, não afirmação sobre o cliente" },
    composition: ["1 ideia por peça", "elemento real (foto/logo) sempre presente", "CTA único por peça", "respiro generoso e leitura no celular"],
    never_say: NEVER_SAY,
    assets_origin: "logo, fotos, textos, endereço e contatos publicados pelo próprio cliente",
    copy_source: overrides ? "llm-validado" : "deterministico",
  };

  const brandContext = {
    name: nome,
    logo: brand.logo ?? (brand.logoUrl ? { kind: "image", url: brand.logoUrl } : { kind: "typographic" }),
    colors: brand.colors ?? null,
    photos: fotos,
    brand_block: {
      nome,
      o_que_vende: servicos.length ? servicos.join(" · ") : headline,
      publico: audienceFromTexts([headline, ...paragrafos]),
      tom_de_voz: toneFromTexts([headline, ...paragrafos]),
      o_que_nunca_dizer: NEVER_SAY,
    },
    social_analysis: analysis ? { handle: analysis.handle, bio: analysis.bio, cta: analysis.cta, counters: analysis.counters, checked_at: analysis.checked_at } : null,
    diagnosis: diagnosis ? { id: diagnosis.id ?? null, http_status: diagnosis.fatos?.http_status ?? null } : null,
  };

  const warnings = [];
  if (!analysis) warnings.push({ code: "social_demo_without_analysis", message: "Demonstração gerada sem análise social (perfil ainda não analisado)." });
  if (!fotos.length) warnings.push({ code: "social_demo_without_photo", message: "Sem foto pública do cliente: peças usam composição tipográfica com a paleta real." });
  if (semProvaSocial) warnings.push({ code: "social_demo_proof_pending", message: "Sem prova social pública: nenhum depoimento ou nota foi criado." });
  if (!contatoReal) warnings.push({ code: "social_demo_without_contact", message: "Sem contato confirmado: peças saem sem CTA de contato." });

  const html = renderDemoHtml({ nome, brand: brandContext, direction, calendar, feed_pieces, stories, warnings, contatoReal, contatoLabel });
  return { brand_context: brandContext, direction, calendar, feed_pieces, stories, warnings, html, pending: pendentes };
}

function headlineshort(headline) { return clean(headline).split(/[.·|—–]/)[0].slice(0, 60); }

function renderDemoHtml({ nome, brand, direction, calendar, feed_pieces, stories, warnings, contatoReal, contatoLabel }) {
  const c = brand.colors ?? { primary: "#C96D4D", accent: "#8B4513", ink: "#211F1C", paper: "#F7F4EF", surface: "#FFFFFF", line: "#E3DFD5", muted: "#6F6B64" };
  const marca = brand.logo?.kind === "image" ? `<img class="logo" src="${escapeHtml(brand.logo.url)}" alt="${escapeHtml(nome)}">` : `<span class="wordmark">${escapeHtml(nome.slice(0, 2).toUpperCase())}</span>`;
  const peca = (p) => `<article class="peca"><div class="visual"${p.visual?.asset ? ` style="background-image:url('${escapeHtml(p.visual.asset)}')"` : ""}><span class="tag">${escapeHtml(p.format)}</span><h3>${escapeHtml(p.hook)}</h3></div><p class="legenda">${escapeHtml(p.caption).replace(/\n/g, "<br>")}</p><p class="tags">${p.hashtags.map((t) => escapeHtml(t)).join(" ")}</p><p class="fonte">${escapeHtml(p.visual?.suggestion ?? "")}</p></article>`;
  const story = (s) => `<article class="story"${s.asset ? ` style="background-image:url('${escapeHtml(s.asset)}')"` : ""}><div class="story-conteudo"><h4>${escapeHtml(s.hook)}</h4><p>${escapeHtml(s.support)}</p><span class="cta">${escapeHtml(s.cta)}</span></div></article>`;
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(nome)} — demonstração social</title>
<style>
*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:${c.paper};color:${c.ink};font-family:Inter,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.55;overflow-x:hidden}
img{max-width:100%;display:block}
.topo{display:flex;align-items:center;gap:12px;padding:clamp(14px,3vw,22px) clamp(16px,5vw,44px);border-bottom:1px solid ${c.line}}
.logo{width:44px;height:44px;object-fit:contain;border-radius:12px}
.wordmark{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:12px;background:${c.primary};color:${c.paper};font-weight:700}
h1{font-size:clamp(18px,3vw,24px);margin:0}
.selo{margin-left:auto;font-size:12px;color:${c.muted}}
main{max-width:1120px;margin:0 auto;padding:clamp(18px,4vw,36px) clamp(16px,5vw,44px) 60px}
h2{font-size:clamp(18px,3.2vw,26px);margin:clamp(20px,4vw,36px) 0 12px}
.painel{background:${c.surface};border:1px solid ${c.line};border-radius:16px;padding:clamp(14px,3vw,22px)}
.grade{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.paleta{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 0;padding:0;list-style:none}
.paleta li{font-size:12px;padding:6px 10px;border-radius:999px;border:1px solid ${c.line}}
.tabela-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
table{width:100%;min-width:560px;border-collapse:collapse;font-size:14px;table-layout:fixed}
th,td{text-align:left;padding:10px;border-bottom:1px solid ${c.line};vertical-align:top;word-break:break-word}
th{font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:${c.muted}}
.peca{background:${c.surface};border:1px solid ${c.line};border-radius:18px;overflow:hidden;display:flex;flex-direction:column}
.visual{aspect-ratio:1/1;background:linear-gradient(140deg,${c.primary},${c.accent});background-size:cover;background-position:center;display:flex;flex-direction:column;justify-content:flex-end;padding:18px;color:${c.paper}}
.visual h3{margin:8px 0 0;font-size:clamp(17px,2.4vw,22px);line-height:1.2;text-shadow:0 1px 8px #0009}
.tag{font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;background:#00000055;align-self:flex-start;padding:4px 10px;border-radius:999px}
.legenda{margin:14px 16px 6px;font-size:14px}
.tags{margin:0 16px;color:${c.primary};font-size:13px;word-break:break-word}
.fonte{margin:8px 16px 16px;color:${c.muted};font-size:11.5px;word-break:break-word}
.stories{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(140px,1fr))}
.story{aspect-ratio:9/16;border-radius:18px;background:linear-gradient(160deg,${c.accent},${c.primary});background-size:cover;background-position:center;display:flex;align-items:flex-end;padding:14px;color:${c.paper}}
.story-conteudo{background:#00000055;border-radius:14px;padding:12px}
.story h4{margin:0 0 6px;font-size:16px}
.story p{margin:0 0 8px;font-size:13px}
.cta{display:inline-block;background:${c.paper};color:${c.ink};font-weight:700;font-size:12px;padding:6px 12px;border-radius:999px}
.aviso{font-size:12.5px;color:${c.muted};margin:8px 0 0}
.nunca{margin:8px 0 0;padding-left:18px;font-size:13.5px}
.rodape{margin-top:28px;color:${c.muted};font-size:12px;border-top:1px solid ${c.line};padding-top:14px}
</style></head>
<body>
<header class="topo">${marca}<h1>${escapeHtml(nome)} — demonstração social</h1><span class="selo">Protótipo DattaSeller · sujeito a aprovação</span></header>
<main>
<section class="painel"><h2>Direção visual</h2>
<p>Paleta derivada das cores publicadas pelo cliente. Tipografia serifada nos títulos e sans no corpo. 1 ideia por peça, elemento real sempre presente e CTA único.</p>
<ul class="paleta">${Object.entries(c).filter(([k]) => ["primary", "accent", "ink", "paper", "surface", "line", "muted"].includes(k)).map(([k, v]) => `<li>${escapeHtml(k)}: ${escapeHtml(String(v))}</li>`).join("")}</ul>
<p class="aviso">Ativos originais do cliente: ${escapeHtml(direction.assets_origin)}.</p></section>

<h2>Calendário de 7 dias</h2>
<div class="painel tabela-wrap"><table><thead><tr><th>Dia</th><th>Formato</th><th>Gancho</th><th>Legenda</th><th>Hashtags</th><th>Visual</th></tr></thead><tbody>
${calendar.map((dia) => `<tr><td>Dia ${dia.day}</td><td>${escapeHtml(dia.format)}${dia.requires_client_input ? " <b>(aguarda cliente)</b>" : ""}</td><td>${escapeHtml(dia.hook ?? "—")}</td><td>${escapeHtml((dia.caption ?? "—")).slice(0, 220)}</td><td>${escapeHtml((dia.hashtags ?? []).join(" ")) || "—"}</td><td>${escapeHtml(dia.visual)}</td></tr>`).join("")}
</tbody></table></div>

<h2>3 peças de feed</h2>
<div class="grade">${feed_pieces.map(peca).join("")}</div>

<h2>3 stories</h2>
<div class="stories">${stories.map(story).join("")}</div>

<section class="painel"><h2>O que NUNCA dizer</h2><ul class="nunca">${direction.never_say.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>

${warnings.length ? `<section class="painel"><h2>Avisos desta geração</h2><ul class="nunca">${warnings.map((aviso) => `<li>${escapeHtml(aviso.message)}</li>`).join("")}</ul></section>` : ""}

<p class="rodape">Demonstração preparada pelo DattaSeller Agent com dados públicos reais do cliente${contatoReal ? ` · CTA: ${escapeHtml(contatoLabel)}` : ""}. Nada é publicado automaticamente: publicação exige aprovação humana.</p>
</main></body></html>`;
}
