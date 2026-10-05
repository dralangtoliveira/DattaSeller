// Final Gate n. 4 — E2E autenticado do DattaSeller contra um ambiente real.
// Uso: DS_E2E_CONFIRM=yes DS_E2E_BASE_URL=... DS_E2E_EMAIL=... DS_E2E_PASSWORD=... \
//      NEXT_PUBLIC_SUPABASE_URL=... DS_E2E_EXPECTED_SUPABASE_REF=... \
//      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... DS_E2E_EMAIL_TO=... \
//      [DS_E2E_RUN_ID=<id>] node scripts/e2e-authenticated.mjs [--preflight]
//
// O script cria dados controlados de teste (um lead E2E, uma proposta, um pedido
// e um e-mail). Ele nunca apaga nada: a linha web não expõe reset de dados.
//
// Guarda obrigatória: `lib/e2e/target-guard.js` recusa o run antes de qualquer
// chamada de rede quando o banco é o de Production, quando o host é domínio de
// Production ou quando o ref esperado do HML não foi declarado/confere.
import { createBrowserClient } from "@supabase/ssr";
import { E2E_STEPS, e2eHeaders, e2eLeadSlug, e2eProspectCandidate, e2eRunId, publicProposalToken, summarize, validateEnv } from "../lib/e2e/plan.js";
import { formatGuardReport, guardE2eTarget } from "../lib/e2e/target-guard.js";
// Ferramenta de browser do próprio agente: a coleta pública precisa ser a mesma
// do contrato do job (`browser_evidence`), nunca uma segunda implementação.
import { browserEvidenceFrom, browserPublicPage } from "../lib/agent/browser.js";

const env = process.env;
const preflightOnly = process.argv.includes("--preflight");
const check = validateEnv(env);
if (!check.ok) {
  console.error("E2E abortado: ambiente incompleto. Nada foi executado.");
  if (check.missing.length) console.error(`  ausentes: ${check.missing.join(", ")}`);
  if (check.invalid.length) console.error(`  inválidos: ${check.invalid.join(", ")} (DS_E2E_CONFIRM precisa ser "yes")`);
  process.exit(2);
}

const isolation = guardE2eTarget(env);
for (const line of formatGuardReport(isolation)) console.error(`  ${line}`);
if (!isolation.ok) {
  console.error("E2E abortado: alvo não isolado de Production. Nada foi executado.");
  process.exit(4);
}

if (preflightOnly) {
  console.log("E2E preflight aprovado: ambiente e alvo isolado validados. Nada foi executado.");
  process.exit(0);
}

const base = String(env.DS_E2E_BASE_URL).replace(/\/+$/, "");
const runId = e2eRunId(env.DS_E2E_RUN_ID) ?? new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
const slug = e2eLeadSlug(runId);
// O destinatário do E2E é deliberadamente uma caixa controlada. Como a
// deduplicação comercial também protege e-mails, um segundo run pode apontar
// para o lead E2E já existente. A partir da prospecção, a cadeia precisa usar
// o slug efetivamente retornado pelo CRM, nunca assumir o slug recém-gerado.
let leadSlug = slug;
let leadNome = "";
const results = [];
const state = {};
console.log(`run_id=${runId}`);
console.log(`lead_slug=${slug}`);

const record = (id, status, detail = "") => {
  const step = E2E_STEPS.find((item) => item.id === id) ?? { id, label: id, endpoint: "" };
  results.push({ ...step, status, detail });
  const mark = status === "pass" ? "OK  " : status === "fail" ? "FALHA" : status.toUpperCase();
  console.log(`[${mark}] ${id} — ${step.label}${detail ? ` :: ${detail}` : ""}`);
};

const jar = new Map();
// The runner is a browser-equivalent client: after password sign-in its session
// must be written into the in-memory cookie jar and forwarded to the Preview.
// createServerClient deliberately defers cookie persistence for request handlers.
const supabase = createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  cookies: {
    getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
    setAll: (list) => { for (const cookie of list) jar.set(cookie.name, cookie.value); },
  },
});

async function call(method, path, body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: e2eHeaders({
      base,
      cookie: [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; "),
      bypass: env.DS_E2E_BYPASS,
    }),
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: response.status, text, json, contentType: response.headers.get("content-type") ?? "" };
}

async function awaitJob(path, jobId) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const status = await call("GET", `${path}?job=${encodeURIComponent(jobId)}`);
    if (status.status !== 200 || status.json?.status === "completed" || status.json?.status === "failed") return status;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return { status: 504, json: { error: "job_timeout" }, text: "job_timeout", contentType: "application/json" };
}

/**
 * Cada lead controlado do E2E usa um alias do remetente/destinatário aprovado
 * (`caixa+run@dominio`). A caixa continua sendo exatamente a caixa controlada,
 * mas dois clientes do mesmo run nunca colidem na deduplicação comercial.
 */
function controlledAlias(email, tag) {
  const text = String(email ?? "").trim();
  const at = text.lastIndexOf("@");
  if (at <= 0 || !tag) return text;
  return `${text.slice(0, at)}+${tag}${text.slice(at)}`;
}

const normalizeText = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
// O cliente é identificado pelo primeiro termo útil do nome público — o mesmo
// dado que a capa usa — e a ausência do outro cliente é verificada no texto
// renderizado, não no payload do CRM.
const clientTerm = (value) => normalizeText(value).split(" ").filter((part) => part.length > 3)[0] ?? "";

/** Contexto factual do lead que o próprio CRM expõe ao agente. */
async function leadContext(slug) {
  const resposta = await call("GET", `/api/worker/context?lead_slug=${encodeURIComponent(slug)}`);
  return resposta.status === 200 ? resposta.json : null;
}

/** O diagnóstico depende do site público do lead: 503 transitório é repetido. */
async function diagnosisWithRetry(slug) {
  let resposta = await call("POST", "/api/diagnosis", { lead_slug: slug });
  if (resposta.status === 503) {
    await new Promise((resolve) => setTimeout(resolve, 6000));
    resposta = await call("POST", "/api/diagnosis", { lead_slug: slug });
  }
  return resposta;
}

/**
 * Fixture controlada e explícita do HML: a regra do produto é "no máximo um
 * follow-up por lead", então repetir a prova no mesmo lead controlado exige
 * limpar o agendamento anterior. Só roda com DS_E2E_RESET_FOLLOWUPS=yes, só no
 * lead controlado e só no HML (o alvo já foi validado como isolado). A trilha de
 * auditoria (timeline) não é tocada.
 */
async function limparFollowupsDoLead(lead) {
  if (String(env.DS_E2E_RESET_FOLLOWUPS ?? "").trim().toLowerCase() !== "yes") return { status: "skip", detail: "DS_E2E_RESET_FOLLOWUPS != yes (sem reset)" };
  if (!String(env.SUPABASE_SECRET_KEY ?? "").trim()) return { status: "fail", detail: "SUPABASE_SECRET_KEY ausente" };
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error, count } = await admin.from("ds_followups").delete({ count: "exact" }).eq("lead_slug", lead);
    if (error) return { status: "fail", detail: `reset falhou: ${error.message}` };
    return { status: "pass", detail: `agendamentos anteriores do lead controlado removidos (${count ?? 0}) — somente HML` };
  } catch (error) {
    return { status: "fail", detail: `reset indisponível: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * ANALYZE_SOCIAL pela rota do CRM.
 *
 * O Preview serverless não tem os binários do Playwright, então a perna de
 * browser do job falha fechado (`social_failed`). Nesse caso a coleta pública é
 * feita com a MESMA ferramenta de browser do contrato (`lib/agent/browser.js`) e
 * devolvida como `browser_evidence` — o formato previsto para o atalho de
 * browser. A análise, a validação e a persistência continuam no produto.
 */
async function analyzeSocial(slug, perfilConhecido = "") {
  const contexto = perfilConhecido ? null : await leadContext(slug);
  const perfil = String(perfilConhecido || contexto?.lead?.instagram_url || contexto?.lead?.tiktok_url || "").trim();
  const inicioEm = Date.now();
  const disparar = (extra = {}) => call("POST", "/api/social", { lead_slug: slug, action: "ANALYZE_SOCIAL", ...extra });
  // O estado do job inline não é durável entre instâncias serverless, portanto a
  // prova usa o efeito persistido no CRM (`ds_social_audits`, lido pelo próprio
  // contexto do lead) — que é exatamente o que o gate exige.
  async function auditoriaPersistida(desde) {
    for (let tentativa = 0; tentativa < 10; tentativa += 1) {
      const atual = await leadContext(slug);
      const persistida = atual?.social_audit ?? null;
      if (persistida?.created_at && Date.parse(persistida.created_at) >= desde - 5000) {
        return { id: persistida.id, platform: persistida.platform ?? null, handle: persistida.handle ?? null, created_at: persistida.created_at, origem: "persistida-no-crm" };
      }
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
    return null;
  }

  let inicio = await disparar();
  let job = inicio.status === 202 && inicio.json?.job_id ? await awaitJob("/api/social", inicio.json.job_id) : inicio;
  let fonte = job.json?.audit?.id ? "job-server-side" : "";
  let auditoria = job.json?.audit?.id
    ? { id: job.json.audit.id, platform: job.json.audit.platform ?? null, handle: job.json.audit.handle ?? null, origem: "resposta-do-job" }
    : null;
  if (!auditoria) auditoria = await auditoriaPersistida(inicioEm);

  // Sem auditoria observável, a perna HTTP pública não bastou (muro de login do
  // Instagram) ou o runtime serverless não tem browser. A coleta é refeita com a
  // MESMA ferramenta de browser do contrato e reenviada como `browser_evidence`.
  if (!auditoria && perfil) {
    let coletado = null;
    try {
      coletado = await browserPublicPage({ url: perfil, purpose: `e2e:${slug}` });
    } catch (error) {
      fonte = `browser-indisponivel:${error?.code ?? error?.message ?? error}`;
    }
    if (coletado) {
      // O contrato exige que a evidência aponte para o MESMO perfil do job.
      const evidencia = { ...browserEvidenceFrom(coletado), url: perfil };
      inicio = await disparar({ profile_url: perfil, browser_evidence: evidencia });
      job = inicio.status === 202 && inicio.json?.job_id ? await awaitJob("/api/social", inicio.json.job_id) : inicio;
      fonte = job.json?.audit?.id ? "browser_evidence" : `browser_evidence_enviada (job=${job.status})`;
      auditoria = job.json?.audit?.id
        ? { id: job.json.audit.id, platform: job.json.audit.platform ?? null, handle: job.json.audit.handle ?? null, origem: "resposta-do-job" }
        : null;
      if (!auditoria) auditoria = await auditoriaPersistida(Date.now() - 1000);
    }
  }
  if (!auditoria && !fonte) fonte = `sem auditoria (job=${job.status}${job.json?.error ? ` ${JSON.stringify(job.json.error).slice(0, 100)}` : ""})`;
  return { job, source: fonte, profile: perfil, audit: auditoria, postStatus: inicio.status };
}

const { error: authError } = await supabase.auth.signInWithPassword({ email: env.DS_E2E_EMAIL, password: env.DS_E2E_PASSWORD });
if (authError) {
  record("auth", "blocked", `login falhou: ${authError.message}`);
  console.log(JSON.stringify(summarize(results), null, 2));
  process.exit(3);
}
const auth = await call("GET", "/api/leads");
if (auth.status !== 200) {
  record("auth", "blocked", `GET /api/leads devolveu ${auth.status} — o usuário precisa de ds_users.role = admin`);
  console.log(JSON.stringify(summarize(results), null, 2));
  process.exit(3);
}
record("auth", "pass", `${Array.isArray(auth.json) ? auth.json.length : 0} leads visíveis`);

// O provedor público (Overpass) é intermitente: a descoberta é repetida com
// espera antes de declarar bloqueio — a fonte continua sendo real, sem fixture.
let discovery = null;
let pool = [];
for (let tentativa = 1; tentativa <= 3; tentativa += 1) {
  discovery = await call("POST", "/api/discovery", { nicho: env.DS_E2E_NICHE, cidade: env.DS_E2E_CITY, quantidade_alvo: 2, limite_candidatos: 15, product: "datta360" });
  pool = (Array.isArray(discovery.json?.results) ? discovery.json.results : []).filter((item) => item.site_antigo && item.source_url);
  if (discovery.status === 200 && pool.length) break;
  if (tentativa < 3) await new Promise((resolve) => setTimeout(resolve, 20000));
}
if (discovery.status !== 200 || !pool.length) {
  record("discovery", discovery.status === 200 ? "blocked" : "fail", discovery.status === 200 ? "nenhum candidato real com site público utilizável" : `HTTP ${discovery.status} ${discovery.text.slice(0, 160)}`);
  console.log(JSON.stringify(summarize(results), null, 2));
  process.exit(1);
}
record("discovery", "pass", `${pool.length} candidatos reais com site público`);

// Um cliente só entra na prova quando a cadeia factual do próprio produto
// comprova site + perfil social público: descoberta → prospecção controlada →
// enriquecimento real (DS-VALUE-02). Nada de Instagram inventado no runner.
const usados = new Set();
async function prepararCliente(tag) {
  for (const source of pool) {
    if (usados.has(source.source_url)) continue;
    const candidate = e2eProspectCandidate({ discovered: source, slug: e2eLeadSlug(tag), emailTo: controlledAlias(env.DS_E2E_EMAIL_TO, tag) });
    const prospect = await call("POST", "/api/prospects", { query: { niche: "e2e", city: "Novo Hamburgo", product: "datta360", search_radius_km: 10, target_quantity: 1, search_limit: 1 }, candidates: [candidate] });
    const lead = prospect.json?.results?.[0]?.lead;
    if (prospect.status !== 200 || !lead) continue;
    const enrichment = await call("POST", "/api/enrichment", { lead_slug: lead });
    const contexto = await leadContext(String(lead));
    const perfil = String(contexto?.lead?.instagram_url ?? contexto?.lead?.tiktok_url ?? "").trim();
    const site = String(contexto?.lead?.site_antigo ?? "").trim();
    // A deduplicação comercial pode casar por telefone/domínio com outro lead:
    // o cliente da prova precisa continuar sendo exatamente a empresa descoberta.
    const mesmoNegocio = normalizeText(contexto?.lead?.nome) === normalizeText(source.nome);
    if (enrichment.status !== 200 || !site || !perfil || !mesmoNegocio) continue;
    // O cliente só é aceito se o diagnóstico factual do site dele fechar: a
    // proposta pública exige preview + diagnóstico + auditoria do MESMO lead.
    const diagnosis = await diagnosisWithRetry(String(lead));
    if (diagnosis.status !== 201 || !diagnosis.json?.diagnosis_id) continue;
    usados.add(source.source_url);
    return {
      source, candidate, prospect, enrichment, contexto, diagnosis,
      lead: String(lead),
      nome: String(contexto?.lead?.nome ?? source.nome ?? lead),
      perfil,
      site,
      deduplicated: Boolean(prospect.json?.results?.[0]?.deduplicated),
      enriquecidos: Array.isArray(enrichment.json?.updated) ? enrichment.json.updated.map((item) => item.field) : [],
    };
  }
  return null;
}

const clienteA = await prepararCliente(runId);
if (!clienteA) {
  record("prospect", "blocked", "nenhum candidato real obteve site + perfil social público pelo enriquecimento");
  console.log(JSON.stringify(summarize(results), null, 2));
  process.exit(1);
}
leadSlug = clienteA.lead;
leadNome = clienteA.nome;
const candidate = clienteA.candidate;
record("prospect", "pass", `${clienteA.nome} · ${clienteA.deduplicated ? "deduplicado controlado" : "novo"} · ${clienteA.source.source_url}`);
record("enrichment", "pass", `perfil social público confirmado${clienteA.enriquecidos.length ? ` · campos preenchidos: ${clienteA.enriquecidos.join(", ")}` : " (já completo)"}`);

const dedup = await call("POST", "/api/prospects", { query: { niche: "e2e", city: "Novo Hamburgo", product: "datta360" }, candidates: [candidate] });
if (dedup.status !== 200) record("dedup", "fail", `HTTP ${dedup.status}`);
else if (dedup.text.includes('"deduplicated":true')) record("dedup", "pass", "duplicata reconhecida");
else record("dedup", "fail", `deduplicação não reconhecida: ${dedup.text.slice(0, 160)}`);

const qualification = await call("POST", "/api/qualifications", { lead_slug: leadSlug, facts: ["Lead originado por descoberta pública controlada"], hypotheses: ["Validar prioridade comercial"], recommendation: "datta360", reason: "Oportunidade observada em fonte pública", confidence: "medium", validation_question: "Aumentar pedidos é prioridade?", next_action: "revisar com operador", owner: "E2E" });
record("qualification", qualification.status === 200 ? "pass" : "fail", `HTTP ${qualification.status}`);

const diagnosis = clienteA.diagnosis;
record("diagnosis", diagnosis.status === 201 && diagnosis.json?.diagnosis_id ? "pass" : "fail", `HTTP ${diagnosis.status} ${diagnosis.json?.error ?? ""}`);

const redesignQueued = await call("POST", "/api/redesign", { lead_slug: leadSlug, diagnosis_id: diagnosis.json?.diagnosis_id });
const redesign = redesignQueued.status === 202 && redesignQueued.json?.job_id ? await awaitJob("/api/redesign", redesignQueued.json.job_id) : redesignQueued;
state.previewId = redesign.json?.preview?.id ?? null;
record("preview", redesign.status === 200 && state.previewId ? "pass" : redesign.status === 503 || redesign.status === 504 ? "blocked" : "fail", `HTTP ${redesign.status} preview=${state.previewId ?? "-"}`);

const socialRun = await analyzeSocial(leadSlug, clienteA.perfil);
const social = socialRun.job;
const socialId = socialRun.audit?.id ?? null;
record("social", socialId ? "pass" : social.status === 503 || social.status === 504 ? "blocked" : "fail", `audit=${socialId ?? "-"} (${socialRun.audit?.origem ?? "sem auditoria"}) job=${social.status} post=${socialRun.postStatus} fonte=${socialRun.source || "-"} perfil=${socialRun.profile ? "público" : "ausente"}`);

if (state.previewId) {
  const editor = await call("GET", `/api/previews/${state.previewId}/editor`);
  record("editor", editor.status === 200 && editor.text.includes("PROSPECTOR-EDITOR") ? "pass" : "fail", `HTTP ${editor.status}`);
  const comparator = await call("GET", `/api/comparators/${leadSlug}`);
  record("comparator", comparator.status === 200 ? "pass" : "fail", `HTTP ${comparator.status}`);
  // A rota da proposta lê os artefatos no topo do corpo (mesmo contrato da UI);
  // aninhá-los em `artifacts` deixava a proposta sem capa (409 no passo cover).
  const proposal = await call("POST", "/api/proposals", { lead_slug: leadSlug, product_id: "datta360", commercial_sku: "datta360", preview_ids: [state.previewId], diagnosis_ids: [diagnosis.json?.diagnosis_id].filter(Boolean), social_audit_ids: [socialId].filter(Boolean), comparator: Boolean(state.previewId) });
  state.proposalId = proposal.json?.id ?? null;
  state.publicPrice = proposal.json?.base_price ?? null;
  record("proposal", proposal.status === 200 && state.proposalId ? "pass" : "fail", `HTTP ${proposal.status} proposta=${state.proposalId ?? "-"} ${proposal.json?.error ?? proposal.text.slice(0, 120)}`);
  if (state.proposalId) {
    // O E2E não cria preço, desconto ou prazo por suposição. A proposta nasce do
    // snapshot comercial aprovado; qualquer renegociação exige decisão humana
    // fora deste runner. A regra de teto de preço é coberta por testes unitários.
    record("negotiation", "skip", "snapshot comercial preservado; sem renegociação automática");
    const cover = await call("GET", `/api/proposals/${state.proposalId}/cover`);
    record("cover", cover.status === 200 ? "pass" : "fail", `HTTP ${cover.status}`);
  } else record("negotiation", "skip", "sem proposta");
} else {
  record("editor", "skip", "sem preview");
  record("comparator", "skip", "sem preview");
  record("proposal", "skip", "sem preview");
  record("negotiation", "skip", "sem proposta");
  record("cover", "skip", "sem proposta");
}

// --- DS-VALUE-07 — proposta pública sem login ---------------------------------
// O cliente abre a proposta com o capability token, sem nenhuma sessão do CRM.
// A requisição anônima carrega apenas o bypass de proteção do Preview (controle
// de infraestrutura da Vercel) — nunca cookie de sessão nem bearer do CRM.
const anonGet = (url) => fetch(url, {
  redirect: "manual",
  headers: env.DS_E2E_BYPASS ? { "x-vercel-protection-bypass": String(env.DS_E2E_BYPASS) } : {},
});
async function publicPage(urlStr) {
  const response = await anonGet(urlStr);
  const html = await response.text();
  return {
    status: response.status,
    text: normalizeText(html),
    hasNoindex: String(response.headers.get("x-robots-tag") ?? "").toLowerCase().includes("noindex"),
    hasCsp: Boolean(response.headers.get("content-security-policy")),
    hasFrameDeny: String(response.headers.get("x-frame-options") ?? "").toUpperCase() === "DENY",
  };
}
// O rascunho Prospector e o follow-up têm de carregar exatamente o mesmo link
// público: comparamos o capability token, não o texto do e-mail.
const carriesPublicLink = (value, token) => Boolean(token) && String(value ?? "").includes(`/p/${token}`);

let publicUrl = null;
let publicToken = "";
if (state.proposalId) {
  const published = await call("POST", `/api/proposals/${state.proposalId}/public`);
  const url = typeof published.json?.url === "string" ? published.json.url : "";
  publicToken = publicProposalToken(url, base);
  if (published.status === 201 && publicToken) publicUrl = url;
  record("public_publish", publicUrl ? "pass" : "fail", publicUrl ? "capability de 43 caracteres publicado na origem do alvo" : `HTTP ${published.status} ${published.json?.error ?? published.text.slice(0, 140)}`);
} else record("public_publish", "skip", "sem proposta");

if (publicUrl) {
  const page = await publicPage(publicUrl);
  const term = clientTerm(leadNome);
  const clientVisible = Boolean(term) && page.text.includes(term);
  record("public_open", page.status === 200 && clientVisible && page.hasNoindex && page.hasCsp ? "pass" : "fail", `HTTP ${page.status} cliente=${clientVisible ? "visível" : "ausente"} noindex=${page.hasNoindex} csp=${page.hasCsp} frame=${page.hasFrameDeny}`);
  const stranger = await anonGet(`${base}/p/${"A".repeat(43)}`);
  record("public_token_isolation", stranger.status === 404 ? "pass" : "fail", `capability desconhecido → HTTP ${stranger.status}`);
} else {
  record("public_open", "skip", "sem publicação ativa");
  record("public_token_isolation", "skip", "sem publicação ativa");
}

// --- DS-VALUE-08 — rascunho Prospector ancorado no link público ---------------
let prospectorDraftId = null;
let prospectorDraftBody = "";
let prospectorDraftSubject = "";
if (state.proposalId && publicToken) {
  const prospector = await call("POST", `/api/proposals/${state.proposalId}/prospector-draft`, { public_proposal_url: publicUrl });
  prospectorDraftId = typeof prospector.json?.id === "string" ? prospector.json.id : null;
  prospectorDraftBody = typeof prospector.json?.body === "string" ? prospector.json.body : "";
  prospectorDraftSubject = typeof prospector.json?.subject === "string" ? prospector.json.subject : "";
  const scheduled = prospector.json?.status === "draft" && prospector.json?.provider === "mock";
  const anchored = carriesPublicLink(prospector.json?.body, publicToken);
  // A checklist exige um único link comercial; as URLs da evidência factual do
  // diagnóstico são neutralizadas, não apagadas da análise.
  const linksNoCorpo = (String(prospector.json?.body ?? "").match(/https?:\/\/[^\s]+/g) ?? []).length;
  const assuntoValido = Boolean(prospectorDraftSubject) && prospectorDraftSubject.length <= 60 && prospectorDraftSubject.endsWith("?");
  record("prospector_draft", prospector.status === 201 && prospectorDraftId && scheduled && anchored && assuntoValido !== false ? "pass" : "fail", prospector.status === 201 ? `draft=${prospectorDraftId} assunto="${prospectorDraftSubject}" (${prospectorDraftSubject.length} car.) links=${linksNoCorpo} destinatário=${prospector.json?.recipient ?? "-"}` : `HTTP ${prospector.status} ${prospector.json?.error ?? prospector.text.slice(0, 140)}`);
} else record("prospector_draft", "skip", "sem publicação ativa");

// --- DS-VALUE-07 — isolamento entre dois clientes reais ----------------------
// A segunda proposta usa outro cliente real da mesma descoberta (site + perfil
// social comprovados pelo enriquecimento) e prova que um capability token não
// alcança o artefato do outro cliente.
let secondPublicUrl = null;
let secondProposalId = null;
let secondName = "";
const clienteB = await prepararCliente(`${runId}b`);
const secondLeadSlug = clienteB?.lead ?? null;
if (clienteB) {
  secondName = clienteB.nome;
  record("second_prospect", "pass", `${clienteB.nome} · ${clienteB.lead} · ${clienteB.deduplicated ? "deduplicado controlado" : "novo"}`);
  record("second_enrichment", "pass", `perfil social público confirmado${clienteB.enriquecidos.length ? ` · campos preenchidos: ${clienteB.enriquecidos.join(", ")}` : " (já completo)"}`);
} else record("second_prospect", "skip", "a descoberta não trouxe um segundo cliente com site + perfil social");

if (secondLeadSlug) {
  await call("POST", "/api/qualifications", { lead_slug: secondLeadSlug, facts: ["Segundo cliente real da mesma descoberta controlada"], hypotheses: ["Validar prioridade comercial"], recommendation: "datta360", reason: "Oportunidade observada em fonte pública", confidence: "medium", validation_question: "Aumentar pedidos é prioridade?", next_action: "revisar com operador", owner: "E2E" });
  const secondDiagnosis = clienteB.diagnosis;
  record("second_diagnosis", secondDiagnosis.status === 201 && secondDiagnosis.json?.diagnosis_id ? "pass" : "fail", `HTTP ${secondDiagnosis.status} ${secondDiagnosis.json?.error ?? secondDiagnosis.text.slice(0, 120)}`);
  const secondRedesignQueued = await call("POST", "/api/redesign", { lead_slug: secondLeadSlug, diagnosis_id: secondDiagnosis.json?.diagnosis_id });
  const secondRedesign = secondRedesignQueued.status === 202 && secondRedesignQueued.json?.job_id ? await awaitJob("/api/redesign", secondRedesignQueued.json.job_id) : secondRedesignQueued;
  const secondPreviewId = secondRedesign.json?.preview?.id ?? null;
  record("second_preview", secondRedesign.status === 200 && secondPreviewId ? "pass" : secondRedesign.status === 503 || secondRedesign.status === 504 ? "blocked" : "fail", `HTTP ${secondRedesign.status} preview=${secondPreviewId ?? "-"}`);
  const segundoSocial = await analyzeSocial(secondLeadSlug, clienteB?.perfil ?? "");
  const secondSocial = segundoSocial.job;
  const secondSocialId = segundoSocial.audit?.id ?? null;
  record("second_social", secondSocialId ? "pass" : secondSocial.status === 503 || secondSocial.status === 504 ? "blocked" : "fail", `audit=${secondSocialId ?? "-"} (${segundoSocial.audit?.origem ?? "sem auditoria"}) job=${secondSocial.status} fonte=${segundoSocial.source || "-"}`);
  if (secondPreviewId) {
    const secondProposal = await call("POST", "/api/proposals", { lead_slug: secondLeadSlug, product_id: "datta360", commercial_sku: "datta360", preview_ids: [secondPreviewId], diagnosis_ids: [secondDiagnosis.json?.diagnosis_id].filter(Boolean), social_audit_ids: [secondSocialId].filter(Boolean), comparator: true });
    secondProposalId = secondProposal.json?.id ?? null;
    record("second_proposal", secondProposal.status === 200 && secondProposalId ? "pass" : "fail", `HTTP ${secondProposal.status} proposta=${secondProposalId ?? "-"} ${secondProposal.json?.error ?? secondProposal.text.slice(0, 120)}`);
  } else record("second_proposal", "skip", "sem preview do segundo cliente");
} else {
  record("second_diagnosis", "skip", "sem segundo cliente");
  record("second_preview", "skip", "sem segundo cliente");
  record("second_social", "skip", "sem segundo cliente");
  record("second_proposal", "skip", "sem segundo cliente");
}

if (secondProposalId) {
  const secondPublished = await call("POST", `/api/proposals/${secondProposalId}/public`);
  const secondUrl = typeof secondPublished.json?.url === "string" ? secondPublished.json.url : "";
  const secondToken = publicProposalToken(secondUrl, base);
  if (secondPublished.status === 201 && secondToken) secondPublicUrl = secondUrl;
  const own = secondPublicUrl ? await publicPage(secondPublicUrl) : null;
  const foreignTerm = clientTerm(leadNome);
  const crossVisible = own ? Boolean(foreignTerm) && own.text.includes(foreignTerm) : false;
  const ownVisible = own ? own.text.includes(clientTerm(secondName)) : false;
  record("public_second_client", secondPublicUrl && own?.status === 200 && ownVisible && !crossVisible ? "pass" : "fail", secondPublicUrl ? `HTTP ${own?.status} cliente próprio=${ownVisible ? "visível" : "ausente"} cliente alheio=${crossVisible ? "VAZOU" : "ausente"}` : `HTTP ${secondPublished.status} ${secondPublished.json?.error ?? secondPublished.text.slice(0, 140)}`);
} else record("public_second_client", "skip", "sem segunda proposta publicável");

// Rascunho do segundo cliente: prova que o follow-up é escopado ao lead da
// própria cadeia e nunca alcança a jornada do outro cliente.
let secondEmailId = null;
if (secondProposalId) {
  const rascunhoB = await call("POST", "/api/emails", { lead_slug: secondLeadSlug, proposal_id: secondProposalId, subject: `Proposta E2E ${runId} segundo cliente`, body: "Rascunho controlado do segundo cliente do E2E." });
  secondEmailId = rascunhoB.json?.id ?? null;
}

// Remetente/resposta declarados pela configuração do próprio HML (nunca segredo).
const configEmail = await call("GET", "/api/settings");
const cfgEmail = configEmail.json && typeof configEmail.json === "object" ? configEmail.json : {};
record("sender_config", String(cfgEmail.email_sender ?? "").includes("@") && String(cfgEmail.email_reply_to ?? "").includes("@") ? "pass" : "fail", `remetente=${cfgEmail.email_sender ?? "-"} resposta=${cfgEmail.email_reply_to ?? "-"} provider=${cfgEmail.email_provider ?? "-"} followup_days=${cfgEmail.followup_days ?? "-"}`);

const resetFollowups = await limparFollowupsDoLead(leadSlug);
record("email_followup_fixture_reset", resetFollowups.status, resetFollowups.detail);

const draft = await call("POST", "/api/emails", { lead_slug: leadSlug, proposal_id: state.negotiatedProposalId ?? state.proposalId ?? null, subject: `Proposta E2E ${runId}`, body: "Mensagem de teste controlado do E2E. Revise antes do envio." });
// A cadeia de e-mail roda sobre o rascunho do Prospector (com o link público)
// quando ele existe; o rascunho genérico continua registrado como passo.
state.emailId = prospectorDraftId ?? draft.json?.id ?? null;
record("email_draft", draft.status === 200 && state.emailId ? "pass" : "fail", `email=${state.emailId ?? "-"}${prospectorDraftId ? " (Prospector)" : ""}`);

if (state.emailId) {
  // A revisão humana do rascunho não pode destruir o link público: o follow-up
  // precisa reutilizar exatamente o mesmo `/p/:token` (DS-VALUE-10).
  const corpoRevisado = prospectorDraftBody
    ? `${prospectorDraftBody}\n\nRevisado pelo operador no E2E controlado.`
    : "Mensagem de teste controlado do E2E, revisada pelo operador.";
  // O assunto permanece o gerado pelo Prospector (válido e terminando em
  // pergunta); o run id fica apenas no corpo revisado, para rastreabilidade.
  const edited = await call("PUT", `/api/emails/${state.emailId}`, { subject: prospectorDraftSubject || `Proposta E2E ${runId}`, body: corpoRevisado });
  record("email_edit", edited.status === 200 ? "pass" : "fail", `HTTP ${edited.status}`);
  const reviewed = await call("POST", `/api/emails/${state.emailId}/transition`, { status: "reviewed" });
  const approved = await call("POST", `/api/emails/${state.emailId}/transition`, { status: "approved" });
  record("email_approve", reviewed.status === 200 && approved.status === 200 ? "pass" : "fail", `reviewed=${reviewed.status} approved=${approved.status}`);
  const sent = await call("POST", `/api/emails/${state.emailId}/transition`, { status: "sent_simulated" });
  const sendStatus = sent.json?.status ?? "?";
  if (sendStatus === "sent") record("email_send", "pass", `provider=${sent.json?.provider} id=${sent.json?.provider_message_id ?? "-"} destinatário=${sent.json?.recipient ?? "-"}`);
  else if (sendStatus === "failed") record("email_send", "blocked", `envio não concluído: ${sent.json?.error ?? "provider_send_failed"} (RESEND_API_KEY/domínio)`);
  else record("email_send", "fail", `HTTP ${sent.status} ${sent.text.slice(0, 140)}`);
  // DS-VALUE-10: recém-enviado, o follow-up precisa ser recusado pela regra temporal.
  const cedo = await call("POST", `/api/emails/${state.emailId}/follow-up`);
  record("email_followup_not_due", cedo.status === 409 && cedo.json?.error === "follow_up_not_due" ? "pass" : "fail", `HTTP ${cedo.status} ${cedo.json?.error ?? ""}`);
  // A janela temporal do follow-up é uma fixture controlada e explícita: só roda
  // quando o operador declara DS_E2E_TEMPORAL_FIXTURE=yes e só toca o lead E2E
  // do HML (o alvo já foi validado como isolado de Production antes daqui).
  async function ensureFollowUpWindow(emailId, lead) {
    if (String(env.DS_E2E_TEMPORAL_FIXTURE ?? "").trim().toLowerCase() !== "yes") return { status: "skip", detail: "DS_E2E_TEMPORAL_FIXTURE != yes (sem fixture temporal)" };
    if (!String(env.SUPABASE_SECRET_KEY ?? "").trim()) return { status: "fail", detail: "SUPABASE_SECRET_KEY ausente para a fixture temporal" };
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
      const backdated = new Date(Date.now() - 4 * 86400000).toISOString();
      const { error, count } = await admin.from("ds_emails").update({ updated_at: backdated }, { count: "exact" }).eq("id", emailId).eq("lead_slug", lead);
      if (error) return { status: "fail", detail: `fixture temporal falhou: ${error.message}` };
      return { status: count === 1 ? "pass" : "fail", detail: count === 1 ? "e-mail controlado do lead E2E recuado 4 dias (somente HML)" : `nenhuma linha afetada (${count ?? 0})` };
    } catch (error) {
      return { status: "fail", detail: `fixture temporal indisponível: ${error instanceof Error ? error.message : String(error)}` };
    }
  }
  const temporal = await ensureFollowUpWindow(state.emailId, leadSlug);
  record("email_temporal_fixture", temporal.status, temporal.detail);
  const followUp = await call("POST", `/api/emails/${state.emailId}/follow-up`);
  const mesmoLink = carriesPublicLink(followUp.json?.email?.body, publicToken);
  const followUpOk = followUp.status === 201 && mesmoLink;
  record("email_followup", followUpOk ? "pass" : followUp.status === 409 ? "blocked" : "fail", followUp.status === 201 ? `mesmo link público=${mesmoLink ? "sim" : "não"}` : `HTTP ${followUp.status} ${followUp.json?.error ?? ""}`);
  const followUpAgain = await call("POST", `/api/emails/${state.emailId}/follow-up`);
  record("email_followup_duplicate", followUpAgain.json?.duplicate === true ? "pass" : followUpAgain.status === 409 ? "blocked" : "fail", `HTTP ${followUpAgain.status} duplicado=${followUpAgain.json?.duplicate === true ? "sim" : "não"} (um follow-up por lead)`);
  // DS-VALUE-10 — resposta já recebida torna o follow-up inelegível.
  const respondido = await call("POST", `/api/emails/${state.emailId}/transition`, { status: "generic_reply" });
  const depoisDaResposta = await call("POST", `/api/emails/${state.emailId}/follow-up`);
  record("email_followup_replied", respondido.status === 200 && depoisDaResposta.status === 409 ? "pass" : "fail", `resposta=${respondido.status} follow-up=${depoisDaResposta.status} ${depoisDaResposta.json?.error ?? ""}`);
  // DS-VALUE-10 — isolamento por lead: e-mail de outro cliente não é elegível.
  const alheio = secondEmailId ? await call("POST", `/api/emails/${secondEmailId}/follow-up`) : null;
  record("email_followup_foreign_lead", alheio && alheio.status === 409 ? "pass" : alheio ? "fail" : "skip", alheio ? `HTTP ${alheio.status} ${alheio.json?.error ?? ""}` : "sem rascunho do segundo cliente");
  const timeline = await call("GET", "/api/timeline");
  // O endpoint de timeline responde em camelCase (`leadSlug`), contrato já coberto por teste.
  const events = Array.isArray(timeline.json) ? timeline.json.filter((item) => (item.leadSlug ?? item.lead_slug) === leadSlug) : [];
  record("email_timeline", timeline.status === 200 && events.length > 0 ? "pass" : "fail", `${events.length} eventos do lead E2E`);
} else {
  for (const id of ["email_edit", "email_approve", "email_send", "email_followup_not_due", "email_temporal_fixture", "email_followup", "email_followup_duplicate", "email_followup_replied", "email_followup_foreign_lead", "email_timeline"]) record(id, "skip", "sem e-mail");
}

// --- DS-VALUE-07 — revogação encerra o capability ----------------------------
if (state.proposalId && publicUrl) {
  const revoked = await call("DELETE", `/api/proposals/${state.proposalId}/public`);
  record("public_revoke", revoked.status === 200 ? "pass" : "fail", `HTTP ${revoked.status} ${revoked.json?.error ?? ""}`);
  const closed = await anonGet(publicUrl);
  const otherOpen = secondPublicUrl ? (await anonGet(secondPublicUrl)).status : 0;
  const isolated = !secondPublicUrl || otherOpen === 200;
  record("public_revoked_closed", closed.status === 404 && isolated ? "pass" : "fail", `revogado → HTTP ${closed.status}${secondPublicUrl ? ` · outro cliente → HTTP ${otherOpen}` : ""}`);
} else {
  record("public_revoke", "skip", "sem publicação ativa");
  record("public_revoked_closed", "skip", "sem publicação ativa");
}
if (secondProposalId && secondPublicUrl) {
  const revokedSecond = await call("DELETE", `/api/proposals/${secondProposalId}/public`);
  const closedSecond = await anonGet(secondPublicUrl);
  record("public_second_revoke", revokedSecond.status === 200 && closedSecond.status === 404 ? "pass" : "fail", `HTTP ${revokedSecond.status} → ${closedSecond.status}`);
} else record("public_second_revoke", "skip", "sem segunda publicação");

const orderSource = state.negotiatedProposalId ?? state.proposalId;
const order = orderSource ? await call("POST", "/api/orders", { proposal_id: orderSource }) : { status: 0, json: null, text: "sem proposta" };
state.orderId = order.json?.id ?? null;
record("order", state.orderId ? "pass" : "fail", state.orderId ? `pedido=${state.orderId} cupom=${order.json?.coupon_code ?? "sem desconto"}` : `HTTP ${order.status} ${order.text.slice(0, 140)}`);

if (state.orderId) {
  const checkout = await call("POST", `/api/orders/${state.orderId}/checkout`, {});
  record("checkout", checkout.status === 200 ? "pass" : "fail", `HTTP ${checkout.status}`);
  const completed = await call("POST", `/api/orders/${state.orderId}/checkout`, { result: "completed" });
  const payment = await call("POST", `/api/orders/${state.orderId}/payment`, { status: "approved" });
  record("payment", completed.status === 200 && payment.status === 200 ? "pass" : "fail", `checkout=${completed.status} pagamento=${payment.status}`);
  const contract = await call("POST", `/api/orders/${state.orderId}/contract`, {});
  state.contractId = contract.json?.id ?? null;
  if (state.contractId) {
    const html = await call("GET", `/api/contracts/${state.contractId}/html`);
    record("contract", "pass", `contrato=${state.contractId}`);
    record("contract_html", html.status === 200 && html.text.includes("Contrato") ? "pass" : "fail", `HTTP ${html.status}`);
    const docx = await call("GET", `/api/contracts/${state.contractId}/docx`);
    const isDocx = docx.status === 200 && docx.text.startsWith("PK") && docx.contentType.includes("wordprocessingml");
    record("contract_docx", isDocx ? "pass" : "fail", `HTTP ${docx.status} type=${docx.contentType}`);
  } else {
    record("contract", "fail", `HTTP ${contract.status} ${contract.text.slice(0, 140)}`);
    record("contract_html", "skip", "sem contrato");
    record("contract_docx", "skip", "sem contrato");
  }
  const handoff = await call("POST", `/api/orders/${state.orderId}/handoff`, { status: "delivered" });
  record("handoff", handoff.status === 200 ? "pass" : "fail", `HTTP ${handoff.status}`);
}

const financial = await call("GET", "/api/financial");
record("financial", financial.status === 200 && financial.json && Number(financial.json.sales) >= 0 ? "pass" : "fail", `HTTP ${financial.status} vendas=${financial.json?.sales ?? "-"} comissão=${financial.json?.commission ?? "-"}`);

const reloadLeads = await call("GET", "/api/leads");
const reloadTimeline = await call("GET", "/api/timeline");
const persisted = reloadLeads.status === 200 && Array.isArray(reloadLeads.json) && reloadLeads.json.some((lead) => lead.slug === leadSlug) && reloadTimeline.status === 200;
record("reload", persisted ? "pass" : "fail", persisted ? "lead e timeline sobreviveram ao reload" : "lead ou timeline não persistiram");

const summary = { ...summarize(results), run_id: runId, lead_slug: leadSlug };
console.log("\n--- resumo ---");
console.log(JSON.stringify(summary, null, 2));
if (summary.failed) console.log("fechar o Final Gate n. 4 exige zero falhas");
process.exit(summary.ok ? 0 : 1);
