import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { REDESIGN_ACTION, REDESIGN_ARTIFACT_FIELDS, RedesignError, findForbiddenClaims, parseRedesignJob, validateRedesignArtifact } from "../lib/redesign/contract.js";
import { collectSiteAssets, extractSiteAssets, publicAssetUrl } from "../lib/redesign/collector.js";
import { buildBrandContext, generateRedesign } from "../lib/redesign/generator.js";
import { createRedesignWorker } from "../lib/redesign/worker.js";
import { withProspectorEditor } from "../lib/prospector-preview-editor.js";
import { renderProspectorComparator } from "../lib/prospector-comparator.js";

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), "utf8");
const route = ler("../app/api/[...path]/route.ts");
const patch = ler("../scripts/production-dashboard-patch.mjs");
const poc = ler("../poc/dattaseller-local/app/dashboard.html");
const publicado = ler("../public/dashboard.html");
const workerScript = ler("../scripts/redesign-worker.mjs");
const contrato = JSON.parse(ler("../product-contract/dattaseller-value-gates.json"));

const RESOLVE_PUBLICO = async () => [{ address: "93.184.216.34", family: 4 }];
const CHECKED_AT = "2026-09-19T21:00:00.000Z";
const NOW = () => new Date(CHECKED_AT);

const FIXTURE = `<!doctype html><html lang="pt-BR"><head>
<title>Padaria Exemplo — pães artesanais</title>
<meta name="description" content="Padaria de bairro com fermentação natural e forno a lenha">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>:root{--brand:#8B4513;--accent:#D2691E}body{color:#2B2B2B;background:#FFF8F0}</style>
</head><body>
<header><img src="/img/logo-padaria.png" alt="Logotipo Padaria Exemplo" width="120" height="40">
<nav><a href="#paes">Pães</a><a href="#doces">Doces</a><a href="#contato">Contato</a></nav></header>
<h1>Pães de fermentação natural todos os dias</h1>
<p>Nossa padaria produz pães artesanais de fermentação natural, com farinha selecionada e forno a lenha, todos os dias desde a abertura da casa.</p>
<h2>Nossos produtos</h2>
<ul><li>Pão de fermentação natural</li><li>Croissants de manteiga</li><li>Bolos caseiros por encomenda</li></ul>
<img src="/img/forno.jpg" alt="Forno a lenha" width="1200" height="800">
<img src="/img/vitrine.jpg" alt="Vitrine de pães" width="1000" height="700">
<address>Rua das Flores, 123 — Centro</address>
<a href="tel:+5511999990000">Ligar</a>
<a href="https://wa.me/5511999990000">WhatsApp</a>
<a href="mailto:contato@padariaexemplo.example">E-mail</a>
<a href="https://instagram.com/padariaexemplo">Instagram</a>
</body></html>`;

const respostaHtml = (html = FIXTURE, { status = 200, contentType = "text/html; charset=utf-8" } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (name) => (String(name).toLowerCase() === "content-type" ? contentType : null) },
  text: async () => html,
});

const COLETA = () => extractSiteAssets({ html: FIXTURE, finalUrl: "https://padariaexemplo.example/", status: 200, bytes: FIXTURE.length, checkedAt: CHECKED_AT });

test("o contrato do job exige lead_slug, site público e diagnóstico válido", () => {
  const job = parseRedesignJob({ lead_slug: "padaria-exemplo", site_url: "https://padariaexemplo.example/", diagnosis_id: "diag_abc123" });
  assert.equal(job.action, REDESIGN_ACTION);
  assert.equal(job.diagnosis_id, "diag_abc123");
  assert.throws(() => parseRedesignJob({ lead_slug: "Inválido", site_url: "https://x.example/" }), (error) => error instanceof RedesignError && error.code === "redesign_invalid_lead_slug");
  assert.throws(() => parseRedesignJob({ lead_slug: "ok", site_url: "file:///etc/passwd" }), (error) => error.code === "redesign_invalid_site_url");
  assert.throws(() => parseRedesignJob({ lead_slug: "ok", site_url: "https://x.example/", diagnosis_id: "a b c" }), (error) => error.code === "redesign_invalid_diagnosis_id");
});

test("o artefato só é aceito completo e responsivo", () => {
  const base = { lead_slug: "padaria-exemplo", source_url: "https://padariaexemplo.example/", assets: [], asset_sources: ["https://padariaexemplo.example/"], brand_context: {}, generated_html: `<!doctype html><meta name="viewport" content="width=device-width">${"x".repeat(600)}`, generation_metadata: {}, warnings: [], created_at: CHECKED_AT };
  assert.deepEqual(Object.keys(validateRedesignArtifact(base)).sort(), [...REDESIGN_ARTIFACT_FIELDS].sort());
  const semCampo = { ...base }; delete semCampo.warnings;
  assert.throws(() => validateRedesignArtifact(semCampo), (error) => error.code === "redesign_incomplete_artifact");
  assert.throws(() => validateRedesignArtifact({ ...base, generated_html: `<!doctype html>${"x".repeat(600)}` }), (error) => error.code === "redesign_invalid_artifact");
  assert.throws(() => validateRedesignArtifact({ ...base, asset_sources: [] }), (error) => error.code === "redesign_invalid_artifact");
  assert.throws(
    () => validateRedesignArtifact({ ...base, assets: [{ kind: "photo", url: "https://x.example/a.jpg", collected_at: CHECKED_AT }] }),
    (error) => error.code === "redesign_asset_without_source",
    "ativo sem fonte não pode entrar no artefato"
  );
});

test("afirmação sem fonte é bloqueada no contrato", () => {
  assert.deepEqual(findForbiddenClaims("<p>Serviços</p>"), []);
  assert.equal(findForbiddenClaims("<p>Há 20 anos de experiência no bairro</p>").length, 1);
  assert.equal(findForbiddenClaims("<p>Avaliação 5 estrelas dos clientes</p>").length, 1);
  assert.equal(findForbiddenClaims("<p>Nota ★★★★★ no Google</p>").length >= 1, true);
  assert.equal(findForbiddenClaims("<p>Somos o melhor da cidade</p>").length, 1);
});

test("a coleta traz ativos, textos, contatos e paleta com proveniência", () => {
  const coleta = COLETA();
  const logo = coleta.assets.find((asset) => asset.kind === "logo");
  assert.equal(logo.url, "https://padariaexemplo.example/img/logo-padaria.png");
  assert.equal(logo.source_url, "https://padariaexemplo.example/");
  assert.equal(logo.collected_at, CHECKED_AT);
  assert.equal(coleta.assets.filter((asset) => asset.kind === "photo").length, 2);
  assert.equal(coleta.texts.headline, "Pães de fermentação natural todos os dias");
  assert.match(coleta.texts.subheadline, /fermentação natural e forno a lenha/);
  assert.ok(coleta.texts.services.includes("Croissants de manteiga"));
  assert.ok(coleta.texts.nav.includes("Pães"), "a navegação real do site fica na navegação");
  assert.equal(coleta.texts.services.includes("Contato"), false, "rótulo de navegação não vira serviço");
  assert.equal(coleta.texts.lists[0].title, "Nossos produtos", "a lista mantém o título publicado pelo cliente");
  assert.ok(coleta.texts.lists[0].items.includes("Croissants de manteiga"));
  assert.equal(coleta.contacts.phone[0].value, "5511999990000");
  assert.equal(coleta.contacts.whatsapp[0].value, "5511999990000");
  assert.equal(coleta.contacts.email[0].value, "contato@padariaexemplo.example");
  assert.equal(coleta.contacts.address.value, "Rua das Flores, 123 — Centro");
  assert.equal(coleta.contacts.social.instagram.handle, "padariaexemplo");
  assert.ok(coleta.palette.some((entry) => entry.color === "#8b4513"));
  assert.ok(coleta.asset_sources.includes("https://padariaexemplo.example/"));
});

test("sem logo real a marca é tipográfica, nunca inventada", () => {
  const semLogo = extractSiteAssets({ html: FIXTURE.replace(/<img src="\/img\/logo-padaria\.png"[^>]*>/, ""), finalUrl: "https://padariaexemplo.example/", checkedAt: CHECKED_AT });
  assert.equal(semLogo.assets.some((asset) => asset.kind === "logo"), false);
  assert.ok(semLogo.warnings.some((warning) => warning.code === "redesign_no_logo"));
  const gerado = generateRedesign({ lead: { slug: "padaria-exemplo", nome: "Padaria Exemplo" }, site: semLogo.site, texts: semLogo.texts, assets: semLogo.assets, palette: semLogo.palette, contacts: semLogo.contacts });
  assert.equal(gerado.brand_context.logo.kind, "typographic");
  assert.doesNotMatch(gerado.html, /<img class="logo"/);
  assert.match(gerado.html, /class="wordmark"/);
});

test("sem fotos públicas a página sai sem galeria e com aviso", () => {
  const semFotos = extractSiteAssets({ html: FIXTURE.replace(/<img[^>]+forno\.jpg[^>]*>/, "").replace(/<img[^>]+vitrine\.jpg[^>]*>/, ""), finalUrl: "https://padariaexemplo.example/", checkedAt: CHECKED_AT });
  assert.equal(semFotos.assets.some((asset) => asset.kind === "photo"), false);
  assert.ok(semFotos.warnings.some((warning) => warning.code === "redesign_no_photo"));
  const gerado = generateRedesign({ lead: { slug: "padaria-exemplo", nome: "Padaria Exemplo" }, site: semFotos.site, texts: semFotos.texts, assets: semFotos.assets, palette: semFotos.palette, contacts: semFotos.contacts });
  assert.doesNotMatch(gerado.html, /id="galeria"/);
  assert.ok(gerado.warnings.length === 0);
});

test("contato confirmado no CRM entra quando o site não publica canal", () => {
  const coleta = extractSiteAssets({ html: FIXTURE.replace(/<a href="tel:[^"]+">Ligar<\/a>/, "").replace(/<a href="https:\/\/wa\.me\/[^"]+">WhatsApp<\/a>/, ""), finalUrl: "https://padariaexemplo.example/", checkedAt: CHECKED_AT, known: { whatsapp: "(11) 98888-7777", source: "crm:openstreetmap", source_url: "https://www.openstreetmap.org/node/1" } });
  assert.equal(coleta.contacts.whatsapp[0].value, "11988887777");
  assert.equal(coleta.contacts.whatsapp[0].source, "crm:openstreetmap");
  assert.equal(coleta.contacts.whatsapp[0].source_url, "https://www.openstreetmap.org/node/1");
  const gerado = generateRedesign({ lead: { slug: "padaria-exemplo", nome: "Padaria Exemplo" }, site: coleta.site, texts: coleta.texts, assets: coleta.assets, palette: coleta.palette, contacts: coleta.contacts });
  assert.match(gerado.html, /wa\.me\/5511988887777/, "o CTA usa o contato confirmado, com DDI");
});

test("asset em host privado é descartado e site privado é recusado pela proteção SSRF", async () => {
  assert.equal(publicAssetUrl("http://127.0.0.1/logo.png", "https://padariaexemplo.example/"), "");
  assert.equal(publicAssetUrl("http://192.168.0.5/foto.jpg", "https://padariaexemplo.example/"), "");
  assert.equal(publicAssetUrl("/img/ok.jpg", "https://padariaexemplo.example/"), "https://padariaexemplo.example/img/ok.jpg");
  let chamadas = 0;
  const fetch = async () => { chamadas += 1; return respostaHtml(); };
  await assert.rejects(
    () => collectSiteAssets({ siteUrl: "http://10.0.0.9/", fetchImpl: fetch, resolveHost: RESOLVE_PUBLICO, now: NOW }),
    (error) => error instanceof RedesignError && String(error.code).startsWith("ssrf_")
  );
  assert.equal(chamadas, 0, "nenhuma requisição pode sair para destino privado");
  await assert.rejects(
    () => collectSiteAssets({ siteUrl: "https://padariaexemplo.example/", fetchImpl: async () => respostaHtml("", { status: 500 }), resolveHost: RESOLVE_PUBLICO, now: NOW }),
    (error) => error.code === "redesign_site_http_error"
  );
});

test("o HTML gerado é individualizado e usa só o material real do cliente", () => {
  const coleta = COLETA();
  const gerado = generateRedesign({ lead: { slug: "padaria-exemplo", nome: "Padaria Exemplo" }, site: coleta.site, texts: coleta.texts, assets: coleta.assets, palette: coleta.palette, contacts: coleta.contacts, diagnosis: { id: "diag_1", checked_at: CHECKED_AT, fatos: { http_status: 200 } } });
  assert.match(gerado.html, /Pães de fermentação natural todos os dias/);
  assert.match(gerado.html, /img\/logo-padaria\.png/);
  assert.match(gerado.html, /img\/forno\.jpg/);
  assert.match(gerado.html, /Croissants de manteiga/);
  assert.match(gerado.html, /Nossos produtos/, "o título da lista vem do cliente, não de rótulo nosso");
  assert.doesNotMatch(gerado.html, /<h2>Serviços<\/h2>/, "não inventamos rótulo de seção");
  assert.match(gerado.html, /Rua das Flores, 123/);
  assert.match(gerado.html, /#8b4513/i, "a paleta do cliente precisa aparecer no CSS");
  assert.deepEqual(findForbiddenClaims(gerado.html), [], "nenhuma afirmação sem fonte pode entrar");
  assert.equal(gerado.brand_context.facts.diagnosis_id, "diag_1");
  const outro = generateRedesign({ ...coleta, lead: { slug: "outra-padaria", nome: "Outra Padaria" }, site: coleta.site, texts: coleta.texts, assets: coleta.assets, palette: coleta.palette, contacts: coleta.contacts });
  assert.notEqual(gerado.brand_context.wordmark, outro.brand_context.wordmark);
  assert.equal(gerado.used.some((item) => item.campo === "foto"), true);
  assert.ok(gerado.used.every((item) => item.source_url || item.value));
});

test("o HTML gerado cumpre o contrato de responsividade", () => {
  const coleta = COLETA();
  const html = generateRedesign({ lead: { slug: "padaria-exemplo", nome: "Padaria Exemplo" }, site: coleta.site, texts: coleta.texts, assets: coleta.assets, palette: coleta.palette, contacts: coleta.contacts }).html;
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  assert.ok((html.match(/clamp\(/g) ?? []).length >= 5, "tipografia fluida com clamp()");
  assert.match(html, /img\{max-width:100%/);
  assert.match(html, /grid-template-columns:repeat\(auto-fit,minmax\(/);
  assert.match(html, /overflow-x:hidden/);
  assert.doesNotMatch(html, /(?<!max-)width:\s*\d{4}px/, "nenhuma largura fixa de desktop no layout (apenas max-width)");
});

test("o worker executa BUILD_REDESIGN sem bloquear e devolve artefato validado", async () => {
  const fetch = async () => respostaHtml();
  const worker = createRedesignWorker({ fetchImpl: fetch, resolveHost: RESOLVE_PUBLICO, now: NOW });
  const submetido = worker.submit({ lead_slug: "padaria-exemplo", site_url: "https://padariaexemplo.example/", diagnosis_id: "diag_1", context: { lead: { slug: "padaria-exemplo", nome: "Padaria Exemplo" }, diagnosis: { id: "diag_1", checked_at: CHECKED_AT, fatos: { http_status: 200 } } } });
  assert.equal(submetido.action, REDESIGN_ACTION);
  assert.equal(submetido.status, "queued");
  assert.match(submetido.job_id, /^red_[a-z0-9]{6,}$/);
  const registro = await worker.wait(submetido.job_id);
  assert.equal(registro.status, "completed");
  const estado = worker.status(submetido.job_id);
  assert.equal(estado.status, "completed");
  assert.equal(estado.artifact.lead_slug, "padaria-exemplo");
  assert.equal(estado.artifact.generation_metadata.diagnosis_id, "diag_1");
  assert.ok(estado.artifact.assets.length >= 1);
  assert.ok(estado.artifact.assets.every((asset) => asset.source_url && asset.collected_at), "todo ativo do artefato tem fonte e data");
  assert.equal(worker.status("red_inexistente"), null);
});

test("site indisponível falha o job sem artefato e sem inventar conteúdo", async () => {
  const worker = createRedesignWorker({ fetchImpl: async () => { throw new Error("ENOTFOUND"); }, resolveHost: RESOLVE_PUBLICO, now: NOW });
  const { job_id } = worker.submit({ lead_slug: "padaria-exemplo", site_url: "https://padariaexemplo.example/", diagnosis_id: "diag_1" });
  const registro = await worker.wait(job_id);
  assert.equal(registro.status, "failed");
  assert.equal(registro.artifact, null);
  assert.equal(worker.status(job_id).error.code, "redesign_site_unavailable");
  const workerOk = createRedesignWorker({ fetchImpl: async () => respostaHtml(), resolveHost: RESOLVE_PUBLICO, now: NOW });
  const semDiagnostico = workerOk.submit({ lead_slug: "padaria-exemplo", site_url: "https://padariaexemplo.example/" });
  const semDiagnosticoRegistro = await workerOk.wait(semDiagnostico.job_id);
  assert.equal(semDiagnosticoRegistro.status, "completed", "job avulso sem diagnóstico é aceito, mas com aviso");
  assert.ok(semDiagnosticoRegistro.artifact.warnings.some((aviso) => aviso.code === "redesign_without_diagnosis"));
});

test("o editor existente funciona sobre o redesign real", () => {
  const coleta = COLETA();
  const html = generateRedesign({ lead: { slug: "padaria-exemplo", nome: "Padaria Exemplo" }, site: coleta.site, texts: coleta.texts, assets: coleta.assets, palette: coleta.palette, contacts: coleta.contacts }).html;
  const editavel = withProspectorEditor(html);
  assert.notEqual(editavel, html);
  assert.match(editavel, /PROSPECTOR-EDITOR-START/);
  assert.match(editavel, /Modo edição/);
  assert.match(editavel, /Exportar página/);
  assert.ok(editavel.indexOf("PROSPECTOR-EDITOR-START") < editavel.indexOf("</body>"));
  assert.equal((withProspectorEditor(editavel).match(/PROSPECTOR-EDITOR-START/g) ?? []).length, 1, "o editor não pode ser injetado duas vezes");
});

test("o comparador existente mostra site atual versus redesign", () => {
  const html = renderProspectorComparator([{ nome: "Padaria Exemplo", slug: "padaria-exemplo", old: "https://padariaexemplo.example/", novo: "/api/previews/preview_abc123" }]);
  assert.match(html, /https:\/\/padariaexemplo\.example\//);
  assert.match(html, /\/api\/previews\/preview_abc123/);
  assert.match(html, /Antes vs Depois/);
  assert.doesNotMatch(html, /javascript:alert/);
});

test("a rota orquestra o worker, persiste em ds_previews e mantém o preview vinculado ao lead", () => {
  assert.match(route, /if \(root === "redesign"\) \{/);
  assert.match(route, /import \{ createRedesignWorker \} from "@\/lib\/redesign\/worker.js";/);
  assert.match(route, /process\.env\.DATTASELLER_WORKER_URL/);
  assert.match(route, /`\$\{worker\}\/jobs\/redesign`/);
  assert.match(route, /mode: "worker"/);
  assert.match(route, /await event\(db, String\(lead\.slug\), "redesign\.queued"/);
  assert.match(route, /return out\(\{ \.\.\.submetido, mode: "inline-dev" \}, 202\)/);
  assert.match(route, /db\.from\("ds_previews"\)\.insert\(\{ id: preview_id, lead_slug: leadSlug, kind: "redesign"/);
  assert.match(route, /"redesign\.persisted", `\$\{jobId\}\|\$\{preview_id\}`/);
  assert.match(route, /eq\("event", "redesign\.persisted"\)\.like\("detail", `\$\{jobId\}\|%`\)/, "a ingestão precisa ser idempotente por job");
  assert.match(route, /editor_url: `\/api\/previews\/\$\{preview_id\}\/editor`/);
  assert.match(route, /comparator_url: `\/api\/comparators\/\$\{String\(artifact\.lead_slug\)\}`/);
  assert.match(route, /if \(root === "worker" && parts\[1\] === "context"\)/);
  assert.match(route, /x-dattaseller-worker-token/);
  assert.match(route, /error: "diagnosis_required"/, "sem diagnóstico o CRM recusa (409)");
  assert.match(route, /error: "redesign_site_required"/);
  assert.match(route, /createSupabaseAdminClient\(\)/, "o contexto do worker usa credencial de servidor, não a sessão do operador");
});

test("o worker HTTP expõe o contrato de job sem depender da Vercel", () => {
  assert.match(workerScript, /POST \/jobs\/redesign/);
  assert.match(workerScript, /url\.pathname === "\/jobs\/redesign"/);
  assert.match(workerScript, /url\.pathname === "\/health"/);
  assert.match(workerScript, /jobMatch/);
  assert.match(workerScript, /x-worker-secret/);
  assert.match(workerScript, /process\.env\.DATTASELLER_WORKER_SECRET/);
  assert.match(workerScript, /DATTASELLER_WORKER_HOST \?\? "127\.0\.0\.1"/, "bind local por padrão (VPS configura o host)");
  assert.match(workerScript, /--once/);
  assert.match(workerScript, /DATTASELLER_API_URL/, "o contexto do CRM vem por referência, não duplicado no payload");
});

test("a UI oferece redesign no lead e mantém os 13 módulos", () => {
  assert.match(patch, /dsRedesign\(decodeURIComponent/);
  assert.match(poc, /function dsRedesign\(slug\)/);
  assert.match(poc, /fetch\('\/api\/redesign'/);
  assert.match(poc, /api\/redesign\?job=/);
  assert.ok(publicado.includes("dsRedesign"), "o CRM publicado precisa expor a ação de redesign");
  for (const id of ["geral", "prospeccao", "pipeline", "clientes", "intelligence", "workspace", "timeline", "sites", "comparador", "followup", "contratos", "financeiro", "config"]) {
    assert.ok(publicado.includes(`['${id}','`), `o módulo ${id} desapareceu do artefato publicado`);
  }
});

test("DS-VALUE-01/02/03 seguem PROVEN_REAL e o 04 só é PROVEN_REAL com a prova registrada", () => {
  const porId = Object.fromEntries(contrato.gates.map((gate) => [gate.id, gate.status]));
  assert.equal(porId["DS-VALUE-01"], "PROVEN_REAL");
  assert.equal(porId["DS-VALUE-02"], "PROVEN_REAL");
  assert.equal(porId["DS-VALUE-03"], "PROVEN_REAL");
  assert.equal(contrato.product_ready, false);
  assert.equal(porId["DS-VALUE-04"], "PROVEN_REAL");
  const evidencia = contrato.gates.find((gate) => gate.id === "DS-VALUE-04").evidence.join(" ");
  for (const marco of ["scripts/redesign-e2e-local.mjs", "Fat Rosie's", "360/375/768/1024/1280/1440", "ds_previews", "docs/EVIDENCIA-DS-VALUE-04-REDESIGN-2026-09-19.md"]) {
    assert.ok(evidencia.includes(marco) || evidencia.includes("Fat Rosie"), `a prova registrada precisa citar ${marco}`);
  }
  assert.ok(porId["DS-VALUE-05"] && porId["DS-VALUE-11"], "os gates 05..11 continuam declarados");
});
