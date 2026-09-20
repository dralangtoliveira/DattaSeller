import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AGENT_ACTIONS, AgentError, parseSocialJob, parseSocialProfileUrl, validateSocialDemoArtifact } from "../lib/agent/contract.js";
import { analyzeSocialProfile, extractSocialProfile } from "../lib/agent/social.js";
import { analyzeFromBrowserEvidence } from "../lib/agent/social.js";
import { buildSocialDemo } from "../lib/agent/social-demo.js";
import { createAgent, resolveLlmProvider } from "../lib/agent/worker.js";
import { browserEvidenceFrom, browserPublicPage } from "../lib/agent/browser.js";
import { createLlmProvider, validateLlmOutput } from "../lib/agent/llm.js";
import { collectSiteAssets } from "../lib/redesign/collector.js";
import { findForbiddenClaims } from "../lib/redesign/contract.js";

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), "utf8");
const route = ler("../app/api/[...path]/route.ts");
const workerScript = ler("../scripts/redesign-worker.mjs");
const patch = ler("../scripts/production-dashboard-patch.mjs");
const publicado = ler("../public/dashboard.html");
const contrato = JSON.parse(ler("../product-contract/dattaseller-value-gates.json"));

const RESOLVE_PUBLICO = async () => [{ address: "93.184.216.34", family: 4 }];
const CHECKED_AT = "2026-09-19T22:00:00.000Z";
const NOW = () => new Date(CHECKED_AT);

const PERFIL_PUBLICO = `<!doctype html><html><head>
<title>Fat Rosie's Taco &amp; Tequila Bar (@fat_rosies) • Instagram photos and videos</title>
<meta property="og:title" content="Fat Rosie's Taco &amp; Tequila Bar (@fat_rosies) • Instagram photos and videos">
<meta property="og:description" content="12.3K Followers, 512 Following, 1,204 Posts - See Instagram photos and videos from Fat Rosie's Taco &amp; Tequila Bar (@fat_rosies)">
<meta property="og:image" content="https://scontent.cdninstagram.com/v/profile-fatrosies.jpg">
</head><body><h1>Fat Rosie's Taco &amp; Tequila Bar</h1></body></html>`;

const PERFIL_COM_BIO = PERFIL_PUBLICO.replace(
  "See Instagram photos and videos from Fat Rosie's Taco &amp; Tequila Bar (@fat_rosies)",
  "Fat Rosie's Taco &amp; Tequila Bar (@fat_rosies) on Instagram: &quot;Peça pelo link da bio e reserve sua mesa&quot;"
);

const MURO_DE_LOGIN = `<!doctype html><html><head><title>Login • Instagram</title>
<meta property="og:title" content="Login • Instagram">
<meta property="og:description" content="Welcome back to Instagram. Sign in to check out what your friends have been capturing.">
</head><body><form action="/accounts/login/"></form></body></html>`;

const SITE_FIXTURE = `<!doctype html><html><head><title>Fat Rosie's</title>
<meta name="description" content="Tacos e tequila em Orlando">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>:root{--brand:#ffc400;--accent:#3a7f20}</style></head><body>
<img src="/img/logo-fatrosies.png" alt="Logo Fat Rosie's" width="120" height="40">
<h1>Orlando's Best Taco &amp; Tequila Bar</h1>
<p>Servimos tacos e tequila em um ambiente festivo, com cardápio completo e atendimento no salão.</p>
<h2>Nosso cardápio</h2><ul><li>Tacos</li><li>Margaritas</li></ul>
<img src="/img/fachada.jpg" alt="Fachada" width="1200" height="800">
<address>N Alafaya Trail, 749 · Orlando, FL · 32828</address>
<a href="tel:6892660444">Ligar</a>
</body></html>`;

const resposta = (html, { status = 200, contentType = "text/html; charset=utf-8" } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (name) => (String(name).toLowerCase() === "content-type" ? contentType : null) },
  text: async () => html,
});

async function gerarDemo({ analise = null } = {}) {
  const coleta = await collectSiteAssets({ siteUrl: "https://www.fatrosies.com/location/waterford-lakes/", fetchImpl: async () => resposta(SITE_FIXTURE), resolveHost: RESOLVE_PUBLICO, now: NOW });
  const demo = buildSocialDemo({
    lead: { slug: "fat-rosie-s-taco-tequila-bar", nome: "Fat Rosie's Taco & Tequila Bar", cidade: "Orlando, FL", nicho: "restaurante" },
    analysis: analise,
    brand: {
      wordmark: "Fat Rosie's Taco & Tequila Bar",
      colors: { primary: "#ffc400", accent: "#3a7f20", ink: "#211F1C", paper: "#F7F4EF", surface: "#FFFFFF", line: "#E3DFD5", muted: "#6F6B64" },
      logo: { kind: "image", url: coleta.assets.find((asset) => asset.kind === "logo")?.url ?? "" },
      photos: coleta.assets.filter((asset) => asset.kind === "photo").map((asset) => asset.url),
    },
    texts: { headline: coleta.texts.headline, services: coleta.texts.services, paragraphs: coleta.texts.paragraphs },
    contacts: coleta.contacts,
    now: NOW,
  });
  return { demo, coleta };
}

test("o contrato social só aceita perfil público de Instagram/TikTok", () => {
  assert.deepEqual(parseSocialProfileUrl("https://www.instagram.com/fat_rosies/"), { platform: "instagram", handle: "fat_rosies", url: "https://www.instagram.com/fat_rosies/" });
  assert.equal(parseSocialProfileUrl("https://www.tiktok.com/@fatrosies").platform, "tiktok");
  for (const hostil of ["https://evil.example/fat_rosies", "https://www.instagram.com/explore/tags/tacos/", "http://127.0.0.1:3997/perfil", "file:///tmp/perfil", "instagram.com", ""]) {
    assert.throws(() => parseSocialProfileUrl(hostil), (error) => error instanceof AgentError, `${hostil} precisa ser recusado`);
  }
  assert.throws(() => parseSocialJob({ action: "ANALYZE_SOCIAL", lead_slug: "ok" }), (error) => error.code === "social_profile_required");
  assert.throws(() => parseSocialJob({ action: "APAGAR_TUDO", lead_slug: "ok" }), (error) => error.code === "social_invalid_action");
  assert.throws(() => parseSocialJob({ action: "ANALYZE_SOCIAL", lead_slug: "Inválido", profile_url: "https://www.instagram.com/x/" }), (error) => error.code === "social_invalid_lead_slug");
  const job = parseSocialJob({ action: AGENT_ACTIONS.socialDemo, lead_slug: "ok", context_url: "/api/worker/context?lead_slug=ok" });
  assert.equal(job.action, "BUILD_SOCIAL_DEMO");
  assert.equal(job.profile_url, null);
});

test("a análise social registra fatos observados com evidência", () => {
  const analise = extractSocialProfile({ html: PERFIL_COM_BIO, profileUrl: "https://www.instagram.com/fat_rosies/", platform: "instagram", checkedAt: CHECKED_AT });
  assert.equal(analise.handle, "fat_rosies");
  assert.equal(analise.perfil_visivel, true);
  assert.equal(analise.counters.followers, 12300);
  assert.equal(analise.counters.posts, 1204);
  assert.match(analise.bio, /link da bio/i);
  assert.match(analise.cta, /link da bio|reserve/i);
  assert.equal(analise.visual_identity.profile_image, "https://scontent.cdninstagram.com/v/profile-fatrosies.jpg");
  assert.ok(analise.evidence.length >= 5);
  assert.ok(analise.evidence.every((item) => item.source_url === "https://www.instagram.com/fat_rosies/" && item.checked_at === CHECKED_AT));
  assert.match(analise.frequency_note, /não é derivável/i);
  assert.deepEqual(analise.formats, []);
  assert.ok(analise.warnings.some((aviso) => aviso.code === "social_limits_public_html"));
});

test("perfil com muro de login falha fechado e nada é inferido", async () => {
  let chamadas = 0;
  const fetch = async () => { chamadas += 1; return resposta(MURO_DE_LOGIN); };
  await assert.rejects(
    () => analyzeSocialProfile({ profileUrl: "https://www.instagram.com/perfil_privado/", platform: "instagram", fetchImpl: fetch, resolveHost: RESOLVE_PUBLICO, now: NOW }),
    (error) => error instanceof AgentError && error.code === "social_profile_not_public"
  );
  assert.equal(chamadas, 1, "a página pública foi consultada uma vez e nada foi inventado");
  assert.equal(extractSocialProfile({ html: MURO_DE_LOGIN, profileUrl: "https://www.instagram.com/x/", platform: "instagram", checkedAt: CHECKED_AT }).perfil_visivel, false);
});

test("a análise social respeita o guard SSRF do PR #18", async () => {
  let chamadas = 0;
  const fetch = async () => { chamadas += 1; return resposta(PERFIL_PUBLICO); };
  await assert.rejects(
    () => analyzeSocialProfile({ profileUrl: "http://169.254.169.254/latest/meta-data/", platform: "instagram", fetchImpl: fetch, resolveHost: RESOLVE_PUBLICO, now: NOW }),
    (error) => error instanceof AgentError && String(error.code).startsWith("ssrf_")
  );
  assert.equal(chamadas, 0, "nenhuma requisição para destino privado");
});

test("a evidência do browser produz a mesma análise com proveniência e sem inventar", () => {
  const evidencia = {
    url: "https://www.instagram.com/fat_rosies/",
    collected_at: CHECKED_AT,
    title: "Fat Rosie's Taco & Tequila Bar (@fat_rosies) • Fotos e vídeos do Instagram",
    og_title: "Fat Rosie's Taco & Tequila Bar (@fat_rosies) • Fotos e vídeos do Instagram",
    og_description: "37K seguidores, seguindo 111, 1,752 posts",
    og_image: "https://scontent.cdninstagram.com/v/perfil.jpg",
    visible_text: "Entrar | Cadastre-se | fat_rosies | 37,2 mil seguidores | 98 seguindo | Fat Rosie's Taco & Tequila Bar | Chicagoland e Orlando desde 2015, com cardápio completo e festas | linktr.ee/fatrosiestacoandtequila | Publicações | Reels | Marcadas",
    tabs: ["Publicações", "Reels", "Marcadas"],
    collector: "playwright",
  };
  const analise = analyzeFromBrowserEvidence({ profileUrl: "https://www.instagram.com/fat_rosies/", platform: "instagram", evidence: evidencia });
  assert.equal(analise.handle, "fat_rosies");
  assert.equal(analise.counters.followers, 37200);
  assert.equal(analise.counters.posts, 1752);
  assert.equal(analise.evidence_source, "browser");
  assert.ok(analise.bio.length > 20);
  assert.ok(analise.links.includes("linktr.ee/fatrosiestacoandtequila"));
  assert.deepEqual(analise.formats, ["feed", "vídeos curtos", "conteúdo marcado"]);
  assert.ok(analise.evidence.every((item) => item.source_url === "https://www.instagram.com/fat_rosies/" && item.checked_at === CHECKED_AT && item.collector === "playwright"));
  assert.throws(() => analyzeFromBrowserEvidence({ profileUrl: "https://www.instagram.com/x/", platform: "instagram", evidence: { url: "https://www.instagram.com/x/", collected_at: CHECKED_AT, visible_text: "" } }), (error) => ["social_invalid_browser_evidence", "social_profile_not_public"].includes(error.code));
  assert.throws(() => parseSocialJob({ action: "ANALYZE_SOCIAL", lead_slug: "ok", profile_url: "https://www.instagram.com/ok/", browser_evidence: { url: "https://www.instagram.com/outro/", collected_at: CHECKED_AT, visible_text: "conteúdo público suficiente" } }), (error) => error.code === "social_invalid_browser_evidence");
});

test("a demonstração social entrega o escopo do material original", async () => {
  const { demo } = await gerarDemo({ analise: extractSocialProfile({ html: PERFIL_COM_BIO, profileUrl: "https://www.instagram.com/fat_rosies/", platform: "instagram", checkedAt: CHECKED_AT }) });
  assert.equal(demo.calendar.length, 7);
  assert.equal(demo.feed_pieces.length, 3);
  assert.equal(demo.stories.length, 3);
  for (const peca of demo.feed_pieces) {
    assert.ok(peca.hook && peca.caption && peca.visual);
    assert.equal(peca.hashtags.length, 5, "cada peça precisa das 5 hashtags do material original");
    assert.ok(peca.hashtags.every((tag) => tag.startsWith("#")));
  }
  assert.ok(demo.calendar.some((dia) => dia.requires_client_input), "prova social/oferta ficam pendentes do cliente");
  assert.ok(demo.direction.never_say.length >= 5);
  assert.equal(demo.brand_context.brand_block.nome, "Fat Rosie's Taco & Tequila Bar");
  assert.match(demo.html, /<meta name="viewport"/);
  assert.match(demo.html, /class="painel tabela-wrap"/, "o calendário precisa de contêiner rolável (responsividade)");
  assert.match(demo.html, /ffc400/i, "o artefato usa a paleta real do cliente");
  assert.match(demo.html, /logo-fatrosies/, "o artefato usa o logo real do cliente");
  assert.deepEqual(findForbiddenClaims(demo.html), [], "nenhuma afirmação sem fonte");
  const validado = validateSocialDemoArtifact({ lead_slug: "x", source_profile_url: null, brand_context: demo.brand_context, direction: demo.direction, calendar: demo.calendar, feed_pieces: demo.feed_pieces, stories: demo.stories, generated_html: demo.html, generation_metadata: {}, warnings: [], created_at: CHECKED_AT });
  assert.equal(validado.calendar.length, 7);
  assert.throws(() => validateSocialDemoArtifact({ lead_slug: "x", source_profile_url: null, brand_context: {}, direction: {}, calendar: demo.calendar.slice(0, 5), feed_pieces: demo.feed_pieces, stories: demo.stories, generated_html: demo.html, generation_metadata: {}, warnings: [], created_at: CHECKED_AT }), (error) => error.code === "social_invalid_artifact");
});

test("demonstração sem análise não inventa prova social", async () => {
  const { demo } = await gerarDemo({ analise: null });
  assert.ok(demo.warnings.some((aviso) => aviso.code === "social_demo_without_analysis"));
  assert.ok(demo.warnings.some((aviso) => aviso.code === "social_demo_proof_pending"));
  assert.doesNotMatch(demo.html, /nota \d|[★⭐]/i, "nenhuma nota/estrela fabricada no artefato");
  assert.match(demo.html, /Sem prova social pública/, "a ausência de prova social é registrada como aviso");
});

test("o agente mantém BUILD_REDESIGN e acrescenta as duas ações sociais", async () => {
  const fetch = async (url) => (String(url).includes("instagram") ? resposta(PERFIL_COM_BIO) : resposta(SITE_FIXTURE));
  const agente = createAgent({ fetchImpl: fetch, resolveHost: RESOLVE_PUBLICO, now: NOW });
  const contexto = { lead: { slug: "fat-rosie-s-taco-tequila-bar", nome: "Fat Rosie's Taco & Tequila Bar", cidade: "Orlando, FL", site_antigo: "https://www.fatrosies.com/location/waterford-lakes/" } };
  const analise = agente.submit({ action: AGENT_ACTIONS.socialAnalysis, lead_slug: "fat-rosie-s-taco-tequila-bar", profile_url: "https://www.instagram.com/fat_rosies/", context: contexto });
  assert.equal(analise.action, "ANALYZE_SOCIAL");
  assert.equal(analise.status, "queued");
  const registro = await agente.wait(analise.job_id);
  assert.equal(registro.status, "completed");
  assert.equal(agente.status(analise.job_id).artifact.handle, "fat_rosies");
  const demo = agente.submit({ action: AGENT_ACTIONS.socialDemo, lead_slug: "fat-rosie-s-taco-tequila-bar", context: { ...contexto, social_audit: { url: "https://www.instagram.com/fat_rosies/", username: "fat_rosies", bio: "Peça pelo link da bio", counters: { followers: 12300 } } } });
  const registroDemo = await agente.wait(demo.job_id);
  assert.equal(registroDemo.status, "completed");
  assert.equal(registroDemo.artifact.calendar.length, 7);
  assert.equal(registroDemo.artifact.generation_metadata.llm.authorized, false, "sem provider autorizado o artefato registra composição determinística");
  const redesign = agente.submit({ lead_slug: "fat-rosie-s-taco-tequila-bar", site_url: "https://www.fatrosies.com/location/waterford-lakes/", diagnosis_id: "diag_1", context: { lead: { slug: "x", nome: "Fat Rosie's Taco & Tequila Bar" }, diagnosis: { id: "diag_1" } } });
  assert.equal(redesign.action, "BUILD_REDESIGN", "BUILD_REDESIGN continua preservado");
  const registroRedesign = await agente.wait(redesign.job_id);
  assert.equal(registroRedesign.status, "completed");
  // Sem perfil confirmado o contrato recusa o job (fail-closed no submit).
  assert.throws(
    () => agente.submit({ action: AGENT_ACTIONS.socialAnalysis, lead_slug: "sem-perfil", context: { lead: { slug: "sem-perfil", nome: "Sem Perfil" } } }),
    (error) => error instanceof AgentError && error.code === "social_profile_required"
  );
  const jobValido = agente.submit({ action: AGENT_ACTIONS.socialAnalysis, lead_slug: "sem-perfil-crm", profile_url: "https://www.instagram.com/fat_rosies/", context: { lead: { slug: "sem-perfil-crm", nome: "Sem Perfil" } } });
  const concluido = await agente.wait(jobValido.job_id);
  assert.equal(concluido.status, "completed");
});

test("o provider de LLM é interface abstrata e não há integração inventada", () => {
  const semProvider = resolveLlmProvider({});
  assert.equal(semProvider.authorized, false);
  assert.equal(semProvider.id, "deterministic-template");
  assert.match(semProvider.note, /Nenhum provider de LLM autorizado/);
  const comProvider = resolveLlmProvider({ DATTASELLER_LLM_PROVIDER: "openai", DATTASELLER_LLM_API_KEY: "chave-no-ambiente" });
  assert.equal(comProvider.authorized, true);
  const codigo = ler("../lib/agent/worker.js");
  assert.doesNotMatch(codigo, /sk-[A-Za-z0-9]{10,}/, "nenhum segredo pode estar no código");
  assert.match(codigo, /DATTASELLER_LLM_PROVIDER/);
  assert.match(codigo, /DATTASELLER_LLM_API_KEY/);
});

test("a rota social orquestra o agente e persiste nas tabelas existentes", () => {
  assert.match(route, /if \(root === "social"\) \{/);
  assert.match(route, /parseSocialJob\(\{ action: body\.action \?\? AGENT_ACTIONS\.socialAnalysis/);
  assert.match(route, /const rota = payload\.action === AGENT_ACTIONS\.socialDemo \? "\/jobs\/social-demo" : "\/jobs\/social-analysis"/);
  assert.match(route, /db\.from\("ds_social_audits"\)\.insert\(row\)/);
  assert.match(route, /eq\("event", "social\.analysis\.persisted"\)\.like\("detail", `\$\{jobId\}\|%`\)/);
  assert.match(route, /kind: "social_demo"/);
  assert.match(route, /eq\("event", "social\.demo\.persisted"\)\.like\("detail", `\$\{jobId\}\|%`\)/);
  assert.match(route, /social_audit: socialAudit \?\? null/);
  assert.match(workerScript, /"\/jobs\/social-analysis": AGENT_ACTIONS\.socialAnalysis/);
  assert.match(workerScript, /"\/jobs\/social-demo": AGENT_ACTIONS\.socialDemo/);
  assert.match(workerScript, /llm: agent\.llm\(\)/);
});

test("a UI oferece as ações sociais e os 13 módulos continuam", () => {
  assert.match(patch, /dsSocialAnalise\(decodeURIComponent/);
  assert.match(patch, /dsSocialDemo\(decodeURIComponent/);
  assert.ok(publicado.includes("function dsSocialAnalise(slug)"));
  assert.ok(publicado.includes("function dsSocialDemo(slug)"));
  assert.ok(publicado.includes("fetch('/api/social'"));
  for (const id of ["geral", "prospeccao", "pipeline", "clientes", "intelligence", "workspace", "timeline", "sites", "comparador", "followup", "contratos", "financeiro", "config"]) {
    assert.ok(publicado.includes(`['${id}','`), `o módulo ${id} desapareceu`);
  }
});

test("DS-VALUE-01 a 04 seguem PROVEN_REAL com o agente social", () => {
  const porId = Object.fromEntries(contrato.gates.map((gate) => [gate.id, gate.status]));
  assert.equal(porId["DS-VALUE-01"], "PROVEN_REAL");
  assert.equal(porId["DS-VALUE-02"], "PROVEN_REAL");
  assert.equal(porId["DS-VALUE-03"], "PROVEN_REAL");
  assert.equal(porId["DS-VALUE-04"], "PROVEN_REAL");
  assert.equal(contrato.product_ready, false);
});

test("a ferramenta de browser do agente coleta página pública sem evidência manual", async () => {
  const chamadas = [];
  const browserFalso = async () => ({
    launch: async () => ({
      newContext: async () => ({
        newPage: async () => ({
          goto: async (url) => { chamadas.push(url); return { status: () => 200 }; },
          waitForTimeout: async () => {},
          url: () => "https://www.instagram.com/fat_rosies/",
          evaluate: async () => ({ title: "Fat Rosie's Taco & Tequila Bar (@fat_rosies) • Fotos e vídeos do Instagram", meta: { og_title: "Fat Rosie's Taco & Tequila Bar (@fat_rosies) • Fotos e vídeos do Instagram", og_description: "37K seguidores, seguindo 111, 1,752 posts", og_image: "https://scontent.cdninstagram.com/v/perfil.jpg", description: "" }, visible_text: "Entrar Cadastre-se fat_rosies 37,2 mil seguidores 98 seguindo Fat Rosie's Taco & Tequila Bar fat_rosies Chicagoland and Orlando desde 2015 linktr.ee/fatrosiestacoandtequila_ e mais 2 Brunch Comida", links: ["https://linktr.ee/fatrosiestacoandtequila_"], tabs: ["Publicações", "Reels"], images_public: ["https://scontent.cdninstagram.com/v/perfil.jpg"] }),
        }),
      }),
      close: async () => {},
    }),
  });
  const coletado = await browserPublicPage({ url: "https://www.instagram.com/fat_rosies/", purpose: "social:fat-rosie", resolveHost: RESOLVE_PUBLICO, now: NOW, browserFactory: browserFalso });
  assert.equal(coletado.status, 200);
  assert.equal(coletado.final_url, "https://www.instagram.com/fat_rosies/");
  assert.equal(coletado.collector, "playwright");
  assert.ok(coletado.links.includes("https://linktr.ee/fatrosiestacoandtequila_"));
  assert.equal(coletado.tabs.length, 2);
  assert.equal(coletado.collected_at, CHECKED_AT);
  // O agente executa a ferramenta sozinho: job SEM browser_evidence.
  const fetch = async (url) => { if (String(url).includes("instagram")) throw new Error("login wall"); return resposta(SITE_FIXTURE); };
  const agente = createAgent({ fetchImpl: fetch, resolveHost: RESOLVE_PUBLICO, now: NOW, browserTool: (opcoes) => browserPublicPage({ ...opcoes, browserFactory: browserFalso }) });
  const job = agente.submit({ action: AGENT_ACTIONS.socialAnalysis, lead_slug: "fat-rosie-s-taco-tequila-bar", profile_url: "https://www.instagram.com/fat_rosies/", context: { lead: { slug: "fat-rosie-s-taco-tequila-bar", nome: "Fat Rosie's Taco & Tequila Bar" } } });
  const registro = await agente.wait(job.job_id);
  assert.equal(registro.status, "completed", "o agente precisa coletar sozinho, sem evidência manual");
  assert.equal(registro.artifact.handle, "fat_rosies");
  assert.equal(registro.artifact.evidence_source, "browser");
  assert.ok(registro.artifact.browser_tool, "o artefato registra a coleta do browser do agente");
  assert.ok(registro.artifact.warnings.some((aviso) => String(aviso.code).startsWith("social_http")));
});

test("a ferramenta de browser recusa destino privado e redirect para rede privada", async () => {
  let abriu = false;
  const browserFalso = async () => { abriu = true; return { launch: async () => ({ close: async () => {} }) }; };
  await assert.rejects(
    () => browserPublicPage({ url: "http://127.0.0.1:3999/dashboard.html", resolveHost: RESOLVE_PUBLICO, browserFactory: browserFalso }),
    (error) => error instanceof AgentError && String(error.code).startsWith("ssrf_")
  );
  assert.equal(abriu, false, "nenhum browser abre para destino privado");
  await assert.rejects(
    () => browserPublicPage({ url: "http://169.254.169.254/latest/meta-data/", resolveHost: RESOLVE_PUBLICO, browserFactory: browserFalso }),
    (error) => String(error.code).startsWith("ssrf_")
  );
  const browserComRedirectPrivado = async () => ({
    launch: async () => ({
      newContext: async () => ({
        newPage: async () => ({
          goto: async () => ({ status: () => 200 }),
          waitForTimeout: async () => {},
          url: () => "http://10.0.0.7/interno",
          evaluate: async () => ({}),
        }),
      }),
      close: async () => {},
    }),
  });
  await assert.rejects(
    () => browserPublicPage({ url: "https://publico.example/", resolveHost: RESOLVE_PUBLICO, browserFactory: browserComRedirectPrivado }),
    (error) => error instanceof AgentError && String(error.code).startsWith("ssrf_"),
    "redirect público → privado precisa ser recusado depois da navegação"
  );
  const browserComTimeout = async () => ({
    launch: async () => ({
      newContext: async () => ({ newPage: async () => ({ goto: async () => { throw new Error("Timeout 30000ms exceeded"); }, waitForTimeout: async () => {}, url: () => "https://x.example/", evaluate: async () => ({}) }) }),
      close: async () => {},
    }),
  });
  await assert.rejects(
    () => browserPublicPage({ url: "https://publico.example/", resolveHost: RESOLVE_PUBLICO, browserFactory: browserComTimeout }),
    (error) => error.code === "agent_browser_timeout",
    "timeout falha fechado"
  );
});

test("muro de login não é contornado: o agente registra a limitação", async () => {
  const browserComMuro = async () => ({
    launch: async () => ({
      newContext: async () => ({
        newPage: async () => ({
          goto: async () => ({ status: () => 200 }),
          waitForTimeout: async () => {},
          url: () => "https://www.instagram.com/perfil_privado/",
          evaluate: async () => ({ title: "Login • Instagram", meta: {}, visible_text: "Entrar Cadastre-se", links: [], tabs: [], images_public: [] }),
        }),
      }),
      close: async () => {},
    }),
  });
  const coletado = await browserPublicPage({ url: "https://www.instagram.com/perfil_privado/", resolveHost: RESOLVE_PUBLICO, now: NOW, browserFactory: browserComMuro });
  assert.ok(coletado.warnings.some((aviso) => aviso.code === "agent_browser_login_wall"));
  assert.throws(() => analyzeFromBrowserEvidence({ profileUrl: "https://www.instagram.com/perfil_privado/", platform: "instagram", evidence: browserEvidenceFrom(coletado) }), (error) => ["social_invalid_browser_evidence", "social_profile_not_public"].includes(error.code), "muro de login não vira perfil confirmado");
});

test("o provider de LLM é contrato real e sem provider autorizado não há chamada", async () => {
  let chamou = false;
  const semProvider = createLlmProvider({ env: {}, fetchImpl: async () => { chamou = true; return resposta("{}", { contentType: "application/json" }); } });
  assert.equal(semProvider.configured, false);
  assert.match(semProvider.describe().note, /LLM_PROVIDER_REQUIRED/);
  await assert.rejects(() => semProvider.generate({ action: "BUILD_SOCIAL_DEMO" }), (error) => error.code === "llm_provider_required");
  assert.equal(chamou, false, "sem provider não pode haver chamada");
  const corpo = [];
  const comProvider = createLlmProvider({
    env: { DATTASELLER_LLM_PROVIDER: "openai-compatible", DATTASELLER_LLM_BASE_URL: "https://llm.example/v1", DATTASELLER_LLM_MODEL: "modelo-teste", DATTASELLER_LLM_API_KEY: "chave-no-ambiente" },
    fetchImpl: async (url, init) => { corpo.push({ url, init }); return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify({ hooks: ["Gancho real do cliente"], captions: ["Legenda com o serviço real"] }) } }], usage: { total_tokens: 10 } }) }; },
    now: NOW,
  });
  const saida = await comProvider.generate({ action: "BUILD_SOCIAL_DEMO", system_contract: "contrato", context: { lead: { nome: "Fat Rosie's" } }, source_facts: ["Gancho real do cliente", "Legenda com o serviço real"], constraints: ["sem promessa"] });
  assert.equal(saida.ok, true);
  assert.equal(corpo[0].url, "https://llm.example/v1/chat/completions");
  assert.match(String(corpo[0].init.headers.Authorization), /^Bearer /);
  const enviado = JSON.parse(corpo[0].init.body);
  assert.match(enviado.messages[0].content, /REGRAS INEGOCIÁVEIS/);
  assert.match(enviado.messages[1].content, /Fat Rosie's/);
  assert.doesNotMatch(JSON.stringify(comProvider.describe()), /chave-no-ambiente/);
  assert.doesNotMatch(JSON.stringify(saida), /chave-no-ambiente/);
});

test("saída de LLM fora do schema ou com fato inventado é recusada pelo código", async () => {
  assert.equal(validateLlmOutput({ hooks: ["ok"], captions: ["ok"] }, { allowedFacts: ["ok"] }).ok, true);
  assert.equal(validateLlmOutput({ hooks: ["ok"] }, { allowedFacts: ["ok"] }).ok, false);
  assert.equal(validateLlmOutput({ hooks: ["Temos 20 anos de experiência"], captions: ["ok"] }, { allowedFacts: ["ok"] }).errors.some((erro) => erro.startsWith("forbidden_claim")), true);
  const comNumeroInventado = validateLlmOutput({ hooks: ["Atendemos 5.000 clientes"], captions: ["ok"] }, { allowedFacts: ["ok"] });
  assert.equal(comNumeroInventado.ok, false);
  assert.ok(comNumeroInventado.errors.some((erro) => erro.startsWith("unsupported_number")));
  const provider = createLlmProvider({
    env: { DATTASELLER_LLM_PROVIDER: "openai-compatible", DATTASELLER_LLM_BASE_URL: "https://llm.example/v1", DATTASELLER_LLM_MODEL: "m", DATTASELLER_LLM_API_KEY: "k" },
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify({ hooks: ["Somos o melhor da cidade"], captions: ["ok"] }) } }] }) }),
  });
  await assert.rejects(() => provider.generate({ action: "BUILD_SOCIAL_DEMO", system_contract: "c", context: {}, source_facts: ["ok"], allowedFacts: ["ok"] }), (error) => error.code === "llm_invalid_output");
  const providerQuebrado = createLlmProvider({
    env: { DATTASELLER_LLM_PROVIDER: "openai-compatible", DATTASELLER_LLM_BASE_URL: "https://llm.example/v1", DATTASELLER_LLM_MODEL: "m", DATTASELLER_LLM_API_KEY: "k" },
    fetchImpl: async () => { throw new Error("rede caiu"); },
  });
  await assert.rejects(() => providerQuebrado.generate({ action: "BUILD_SOCIAL_DEMO", system_contract: "c", context: {}, source_facts: ["ok"] }), (error) => error.code === "llm_provider_error");
});

test("falha de LLM não destrói a demonstração: o código mantém a copy determinística", async () => {
  const fetch = async () => resposta(SITE_FIXTURE);
  const agente = createAgent({
    fetchImpl: fetch,
    resolveHost: RESOLVE_PUBLICO,
    now: NOW,
    llmProvider: { configured: true, describe: () => ({ id: "openai-compatible", model: "m", configured: true, authorized: true }), generate: async () => { throw new AgentError("llm_provider_error", "provider fora do ar"); } },
  });
  const job = agente.submit({ action: AGENT_ACTIONS.socialDemo, lead_slug: "fat-rosie-s-taco-tequila-bar", context: { lead: { slug: "fat-rosie-s-taco-tequila-bar", nome: "Fat Rosie's Taco & Tequila Bar", cidade: "Orlando, FL", site_antigo: "https://www.fatrosies.com/location/waterford-lakes/" } } });
  const registro = await agente.wait(job.job_id);
  assert.equal(registro.status, "completed", "falha do LLM não pode destruir a demonstração");
  assert.equal(registro.artifact.calendar.length, 7);
  assert.equal(registro.artifact.feed_pieces.length, 3);
  assert.ok(registro.artifact.warnings.some((aviso) => aviso.code === "llm_provider_error"));
  assert.equal(registro.artifact.generation_metadata.llm.used, false);
  assert.equal(registro.artifact.direction.copy_source, "deterministico");
});
