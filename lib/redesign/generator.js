/**
 * DS-VALUE-04 — gerador da NOVA VERSÃO da página do cliente.
 *
 * Regra: o HTML é montado somente com o que foi coletado da empresa real
 * (texto, foto, logo, contato, paleta). Rótulos de interface são fixos; toda
 * frase sobre a empresa vem da fonte, com proveniência registrada no artefato.
 * Sem logo real, a marca é composta tipograficamente — nunca inventada.
 */

import { RedesignError, findForbiddenClaims } from "./contract.js";

export const GENERATOR_VERSION = "redesign-generator-1";

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
const hash = (value) => [...String(value ?? "")].reduce((total, character) => (total * 31 + character.charCodeAt(0)) % 100003, 7);
const luminance = (hex) => {
  const value = String(hex ?? "").replace("#", "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  if (!/^[0-9a-f]{6}$/i.test(full)) return 0.5;
  const [r, g, b] = [0, 2, 4].map((index) => parseInt(full.slice(index, index + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const saturation = (hex) => {
  const value = String(hex ?? "").replace("#", "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  if (!/^[0-9a-f]{6}$/i.test(full)) return 0;
  const [r, g, b] = [0, 2, 4].map((index) => parseInt(full.slice(index, index + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
};

/**
 * WhatsApp **sem inventar DDI**. Só monta o link quando o número internacional é
 * comprovado — publicado pelo cliente em `wa.me`/`api.whatsapp.com`, já com DDI no
 * CRM (12+ dígitos), prefixo 1 de EUA/Canadá, ou país comprovadamente Brasil
 * (aí o 55 é o DDI correto). Fora disso, nenhum CTA de WhatsApp é gerado e a
 * página usa o telefone real.
 */
export function whatsappLink(value, { international = false, country = "" } = {}) {
  // Um "+" na frente é o próprio autor declarando o número em formato
  // internacional; nunca inferimos DDI por formato (DDD 11 ≠ código 1 dos EUA).
  const explicito = /^\s*\+/.test(String(value ?? ""));
  const numero = String(value ?? "").replace(/\D/g, "");
  if (numero.length < 10) return "";
  const brasil = /brasil|brazil|\bbr\b/i.test(String(country ?? ""));
  let destino = "";
  if (international || explicito) destino = numero;
  else if (numero.length >= 12) destino = numero;
  else if (brasil && (numero.length === 10 || numero.length === 11)) destino = `55${numero}`;
  if (!destino) return "";
  const message = encodeURIComponent("Olá! Vi a nova versão da sua página preparada pela DattaSeller e quero falar sobre ela.");
  return `https://wa.me/${destino}?text=${message}`;
}

function choosePalette(palette = []) {
  const ordenadas = [...palette].filter((entry) => /^#[0-9a-f]{3,6}$/i.test(entry.color)).sort((a, b) => (saturation(b.color) * 100 + b.count) - (saturation(a.color) * 100 + a.count));
  const primary = ordenadas[0]?.color ?? "#C96D4D";
  const accent = ordenadas.find((entry) => entry.color !== primary && Math.abs(luminance(entry.color) - luminance(primary)) > 0.12)?.color ?? primary;
  const dark = luminance(primary) < 0.45;
  return {
    primary,
    accent,
    ink: dark ? "#F7F4EF" : "#211F1C",
    paper: dark ? "#171512" : "#F7F4EF",
    surface: dark ? "#211E1A" : "#FFFFFF",
    line: dark ? "#3A352E" : "#E3DFD5",
    muted: dark ? "#B6AEA1" : "#6F6B64",
    source: palette.length ? "site publico do lead" : "fallback neutro (sem cor publica no HTML)",
  };
}

export function buildBrandContext({ lead = {}, site = {}, texts = {}, assets = [], palette = [], contacts = {}, diagnosis = null } = {}) {
  const logoAsset = assets.find((asset) => asset.kind === "logo");
  const fotos = assets.filter((asset) => asset.kind === "photo");
  // Nome real da empresa: nome do CRM (fonte mais confiável) ou o primeiro
  // segmento do título publicado — nunca um texto composto por nós.
  const primeiroSegmento = (valor) => clean(String(valor ?? "").split(/[|•·—–]/)[0]);
  const wordmark = clean(lead.nome || primeiroSegmento(texts.headline) || primeiroSegmento(site.title) || texts.headline || site.title || "").slice(0, 60);
  if (!wordmark) throw new RedesignError("redesign_missing_brand", "Sem nome real da empresa não há como gerar a marca.");
  const cores = choosePalette(palette);
  const variantes = logoAsset ? ["hero-editorial", "hero-split", "hero-gallery"] : ["hero-tipografico", "hero-tipografico-split"];
  const layout = variantes[hash(lead.slug || wordmark) % variantes.length];
  let logoKind = "typographic";
  if (logoAsset) logoKind = "image";
  if (!logoAsset && String(lead.nome ?? "").toLowerCase() !== String(texts.headline ?? "").toLowerCase() && texts.headline) logoKind = "typographic-from-headline";
  return {
    name: wordmark,
    logo: logoAsset ? { kind: "image", url: logoAsset.url, source_url: logoAsset.source_url } : { kind: "typographic" },
    wordmark,
    colors: cores,
    theme: luminance(cores.primary) < 0.45 ? "dark" : "light",
    layout,
    photos_available: fotos.length,
    facts: {
      mobile_ready: Boolean(site.viewport),
      diagnosis_id: diagnosis?.id ?? null,
      diagnosis_checked_at: diagnosis?.checked_at ?? null,
      diagnosis_http_status: diagnosis?.fatos?.http_status ?? site.status ?? null,
    },
    note: "Paleta e identidade derivadas das cores públicas do próprio site; nenhum elemento de marca é inventado.",
  };
}

function ctaFor(contacts = {}, { country = "" } = {}) {
  const registro = contacts.whatsapp?.[0];
  const zap = registro?.value ? whatsappLink(registro.value, { international: registro.international === true, country }) : "";
  if (zap) return { href: zap, label: "Fale no WhatsApp", kind: "whatsapp", source: contacts.whatsapp[0] };
  const telefone = contacts.phone?.[0]?.value;
  // `+` só quando a fonte publicou o número em formato internacional.
  if (telefone) return { href: `tel:${contacts.phone[0].international ? "+" : ""}${telefone}`, label: "Ligar agora", kind: "phone", source: contacts.phone[0] };
  const email = contacts.email?.[0]?.value;
  if (email) return { href: `mailto:${email}`, label: "Enviar e-mail", kind: "email", source: contacts.email[0] };
  return null;
}

export function generateRedesign({ lead = {}, site = {}, texts = {}, assets = [], palette = [], contacts = {}, diagnosis = null, collectedAt = null } = {}) {
  const brand = buildBrandContext({ lead, site, texts, assets, palette, contacts, diagnosis });
  const c = brand.colors;
  // País comprovado a partir dos dados reais do lead (cidade/endereço públicos).
  const pais = [lead.cidade, lead.end_cliente, contacts.address?.value].filter(Boolean).join(" · ");
  const cta = ctaFor(contacts, { country: pais });
  const avisos = [];
  if (contacts.whatsapp?.length && !cta?.href?.includes("wa.me")) {
    avisos.push({ code: "redesign_whatsapp_country_unknown", message: "Número de WhatsApp sem DDI comprovado: nenhum link wa.me foi criado (sem inventar código de país)." });
  }
  const fotos = assets.filter((asset) => asset.kind === "photo").slice(0, 6);
  const usados = [];
  const registrar = (campo, origem) => { if (origem) usados.push({ campo, ...origem }); };

  const servicos = (texts.services ?? []).slice(0, 6);
  const listas = (texts.lists ?? []).filter((lista) => lista?.items?.length);
  const titulos = (texts.section_titles ?? []).slice(0, 3);
  const paragrafos = (texts.paragraphs ?? []).slice(0, 3);
  const endereco = contacts.address?.value ?? "";
  const telefone = contacts.phone?.[0]?.value ?? "";
  const email = contacts.email?.[0]?.value ?? "";
  const sociais = Object.entries(contacts.social ?? {}).filter(([, value]) => value?.handle);

  const marca = brand.logo.kind === "image"
    ? `<img class="logo" src="${escapeHtml(brand.logo.url)}" alt="${escapeHtml(brand.wordmark)}" width="56" height="56">`
    : `<span class="wordmark" aria-hidden="true">${escapeHtml(brand.wordmark.slice(0, 2).toUpperCase())}</span>`;
  if (brand.logo.kind === "image") registrar("logo", { value: brand.logo.url, source_url: brand.logo.source_url, source: "site publico do lead" });

  const itensDeNavegacao = (texts.nav?.length ? texts.nav : servicos).slice(0, 4);
  const nav = itensDeNavegacao.map((item, index) => `<a href="#secao-${index + 1}">${escapeHtml(item)}</a>`).join("");
  // Cada lista do cliente mantém o título que ele mesmo publicou; lista sem
  // título não é renderizada (não inventamos rótulo para o conteúdo dele).
  const servicosHtml = listas.length
    ? listas.filter((lista) => lista.title).map((lista, index) => `<section class="painel" id="secao-${index + 1}"><h2>${escapeHtml(lista.title)}</h2><ul class="servicos">${lista.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>`).join("")
    : "";
  listas.forEach((lista) => lista.items.forEach((item) => registrar("lista", { value: item, source_url: site.url, source: "site publico do lead" })));

  const sobreHtml = paragrafos.length
    ? `<section class="painel" id="sobre"><h2>${escapeHtml(titulos[0] || "Sobre")}</h2>${paragrafos.map((texto) => `<p>${escapeHtml(texto)}</p>`).join("")}</section>`
    : "";
  paragrafos.forEach((texto) => registrar("texto", { value: texto, source_url: site.url, source: "site publico do lead" }));

  const galeriaHtml = fotos.length
    ? `<section class="painel" id="galeria"><h2>Galeria</h2><div class="galeria">${fotos.map((foto) => `<img src="${escapeHtml(foto.url)}" alt="${escapeHtml(brand.wordmark)}" loading="lazy">`).join("")}</div></section>`
    : "";
  fotos.forEach((foto) => registrar("foto", { value: foto.url, source_url: foto.source_url, source: "site publico do lead" }));

  const contatoLinhas = [
    endereco ? `<p class="contato-linha"><b>Endereço</b><span>${escapeHtml(endereco)}</span></p>` : "",
    telefone ? `<p class="contato-linha"><b>Telefone</b><a href="tel:${contacts.phone?.[0]?.international ? "+" : ""}${escapeHtml(telefone)}">${escapeHtml(telefone)}</a></p>` : "",
    email ? `<p class="contato-linha"><b>E-mail</b><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>` : "",
    sociais.length ? `<p class="contato-linha"><b>Redes</b>${sociais.map(([rede, dado]) => `<a href="https://${rede}.com/${escapeHtml(rede === "tiktok" ? `@${dado.handle}` : dado.handle)}" target="_blank" rel="noopener">${escapeHtml(rede)}</a>`).join(" ")}</p>` : "",
  ].filter(Boolean).join("");
  if (contacts.address) registrar("endereco", { value: endereco, source_url: contacts.address.source_url, source: contacts.address.source });
  if (contacts.phone?.[0]) registrar("telefone", { value: telefone, source_url: contacts.phone[0].source_url, source: contacts.phone[0].source });
  if (contacts.email?.[0]) registrar("email", { value: email, source_url: contacts.email[0].source_url, source: contacts.email[0].source });
  if (contacts.whatsapp?.[0]) registrar("whatsapp", { value: contacts.whatsapp[0].value, source_url: contacts.whatsapp[0].source_url, source: contacts.whatsapp[0].source });

  const contatoHtml = contatoLinhas
    ? `<section class="painel" id="contato"><h2>Contato</h2>${contatoLinhas}${endereco ? `<a class="botao secundario" href="https://www.google.com/maps/search/${encodeURIComponent(`${brand.name} ${endereco}`)}" target="_blank" rel="noopener">Abrir no mapa</a>` : ""}</section>`
    : "";

  const ctaHtml = cta ? `<a class="botao" href="${escapeHtml(cta.href)}"${cta.kind === "whatsapp" ? ' target="_blank" rel="noopener"' : ""}>${escapeHtml(cta.label)}</a>` : "";
  if (cta) registrar("cta", { value: cta.href, source_url: cta.source?.source_url ?? site.url, source: cta.source?.source ?? "site publico do lead" });
  const headline = clean(texts.headline || site.title || brand.name);
  registrar("headline", { value: headline, source_url: site.url, source: "site publico do lead" });

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(brand.name)} — nova versão</title>
<meta name="description" content="${escapeHtml(clean(texts.subheadline || headline).slice(0, 180))}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Inter:wght@400;600&display=swap">
<style>
*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:${c.paper};color:${c.ink};font-family:Inter,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.6;overflow-x:hidden}
img{max-width:100%;height:auto;display:block}
a{color:inherit}
.topo{display:flex;align-items:center;gap:14px;padding:clamp(14px,3vw,24px) clamp(16px,5vw,48px);border-bottom:1px solid ${c.line};flex-wrap:wrap}
.logo{border-radius:12px;object-fit:contain}
.wordmark{display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:14px;background:${c.primary};color:${c.paper};font-weight:700;letter-spacing:.5px}
.marca{font-family:Fraunces,Georgia,serif;font-size:clamp(18px,3.4vw,24px);font-weight:600}
nav{margin-left:auto;display:flex;gap:clamp(10px,2vw,22px);flex-wrap:wrap;font-size:clamp(13px,1.6vw,15px)}
nav a{text-decoration:none;color:${c.muted}}
.hero{padding:clamp(36px,9vw,96px) clamp(16px,5vw,48px) clamp(28px,6vw,64px)}
.hero-interno{max-width:1120px;margin:0 auto;display:grid;gap:clamp(18px,4vw,36px);align-items:center}
.hero h1{font-family:Fraunces,Georgia,serif;font-size:clamp(30px,6.4vw,64px);line-height:1.08;margin:0 0 14px;max-width:22ch}
.hero p{font-size:clamp(15px,2.1vw,19px);color:${c.muted};max-width:62ch;margin:0 0 22px}
.botao{display:inline-block;background:${c.primary};color:${c.paper};text-decoration:none;font-weight:700;padding:14px 22px;border-radius:14px;font-size:clamp(14px,1.8vw,16px)}
.botao.secundario{background:transparent;color:${c.primary};border:1px solid ${c.primary};margin-top:10px}
.painel{max-width:1120px;margin:0 auto;padding:clamp(22px,4vw,40px) clamp(16px,5vw,48px);border-top:1px solid ${c.line}}
.painel h2{font-family:Fraunces,Georgia,serif;font-size:clamp(21px,3.6vw,32px);margin:0 0 16px}
.servicos{list-style:none;padding:0;margin:0;display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(230px,1fr))}
.servicos li{background:${c.surface};border:1px solid ${c.line};border-radius:14px;padding:16px 18px;font-weight:600}
.galeria{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.galeria img{border-radius:16px;aspect-ratio:4/3;object-fit:cover;border:1px solid ${c.line}}
.contato-linha{display:flex;gap:12px;flex-wrap:wrap;border-bottom:1px solid ${c.line};padding:10px 0;margin:0;font-size:clamp(14px,1.8vw,16px)}
.contato-linha b{min-width:90px;color:${c.muted};font-weight:600}
.rodape{padding:clamp(20px,4vw,36px) clamp(16px,5vw,48px);border-top:1px solid ${c.line};color:${c.muted};font-size:13px;display:flex;gap:10px;flex-wrap:wrap;justify-content:space-between}
.rodape a{color:${c.primary}}
@media (min-width:900px){.hero-interno.duas-colunas{grid-template-columns:1.05fr .95fr}.hero-foto{border-radius:20px;border:1px solid ${c.line}}}
</style>
</head>
<body>
<header class="topo">
${marca}<span class="marca">${escapeHtml(brand.wordmark)}</span>
<nav>${nav}</nav>
</header>
<main>
<section class="hero">
<div class="hero-interno${brand.layout === "hero-split" || brand.layout === "hero-tipografico-split" ? " duas-colunas" : ""}">
<div>
<h1>${escapeHtml(headline)}</h1>
${texts.subheadline ? `<p>${escapeHtml(texts.subheadline)}</p>` : ""}
${ctaHtml}
</div>
${fotos.length && (brand.layout === "hero-split" || brand.layout === "hero-gallery") ? `<img class="hero-foto" src="${escapeHtml(fotos[0].url)}" alt="${escapeHtml(brand.wordmark)}" loading="eager">` : ""}
</div>
</section>
${servicosHtml}
${sobreHtml}
${galeriaHtml}
${contatoHtml}
</main>
<footer class="rodape">
<span>Protótipo preparado por DattaSeller · Ativos originais publicados pelo próprio cliente.</span>
<a href="${escapeHtml(site.url)}" target="_blank" rel="noopener">Ver o site atual</a>
</footer>
</body>
</html>`;

  const invencoes = findForbiddenClaims(html);
  if (invencoes.length) throw new RedesignError("redesign_invented_claim", `O HTML gerado contém afirmação sem fonte: ${invencoes.join(", ")}`, { invencoes });

  return {
    html,
    brand_context: brand,
    used: usados,
    warnings: avisos,
    layout: brand.layout,
  };
}
