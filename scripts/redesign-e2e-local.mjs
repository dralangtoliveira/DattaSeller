/**
 * Prova real do DS-VALUE-04 pela linha web.
 *
 * Sobe o CRM (Next dev) com um stub Supabase em memória e o Worker Agent real
 * (scripts/redesign-worker.mjs) falando com o CRM por contrato HTTP:
 *   descoberta (DS-VALUE-01) → enriquecimento (02) → diagnóstico (03)
 *   → POST /api/redesign (BUILD_REDESIGN) → artefato persistido em ds_previews
 *   → editor e comparador existentes.
 *
 * Nenhuma base real é tocada. Os sites consultados são os reais do lead.
 *
 * Uso:
 *   node scripts/redesign-e2e-local.mjs                 # roda e encerra
 *   node scripts/redesign-e2e-local.mjs --serve         # mantém no ar para QA visual
 */

import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const USER_ID = "11111111-1111-1111-1111-111111111111";
const APP_PORT = Number(process.env.REDESIGN_E2E_PORT ?? 3991);
const WORKER_PORT = Number(process.env.REDESIGN_E2E_WORKER_PORT ?? 4599);
const NICHO = process.env.REDESIGN_E2E_NICHO ?? "restaurante";
const CIDADE = process.env.REDESIGN_E2E_CIDADE ?? "Orlando, FL";
const QUANTIDADE = Number(process.env.REDESIGN_E2E_QUANTIDADE ?? 12);
const ALVO = process.env.REDESIGN_E2E_LEAD ?? null;
const SEGREDO = "e2e-local-worker-secret";
const TOKEN = "e2e-local-worker-token";
const SERVE = process.argv.includes("--serve");
const ARTIFACTS = resolve(process.env.REDESIGN_E2E_OUT ?? ".redesign-e2e");

function startStub() {
  const tabelas = new Map([["ds_leads", []], ["ds_users", [{ id: USER_ID, role: "admin" }]], ["ds_settings", [{ key: "company_name", value: "STUB DS-VALUE-04" }]], ["ds_site_diagnoses", []], ["ds_previews", []], ["ds_timeline", []]]);
  const linhas = (tabela) => tabelas.get(tabela) ?? (tabelas.set(tabela, []), tabelas.get(tabela));
  const filtradas = (tabela, url) => {
    let resultado = [...linhas(tabela)];
    for (const [campo, valor] of url.searchParams) {
      if (["select", "order", "limit", "on_conflict"].includes(campo)) continue;
      if (valor.startsWith("eq.")) resultado = resultado.filter((linha) => String(linha[campo] ?? "") === valor.slice(3));
      else if (valor === "is.null") resultado = resultado.filter((linha) => linha[campo] === null || linha[campo] === undefined);
      else if (valor.startsWith("like.")) {
        const padrao = `^${valor.slice(5).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*")}$`;
        resultado = resultado.filter((linha) => new RegExp(padrao).test(String(linha[campo] ?? "")));
      }
    }
    const ordem = url.searchParams.get("order");
    if (ordem) {
      const [coluna, direcao] = ordem.split(".");
      resultado.sort((a, b) => String(a[coluna] ?? "").localeCompare(String(b[coluna] ?? "")) * (direcao === "desc" ? -1 : 1));
    }
    const limite = Number(url.searchParams.get("limit") ?? 0);
    return limite ? resultado.slice(0, limite) : resultado;
  };
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    let body = "";
    for await (const chunk of request) body += chunk;
    const send = (payload, status = 200) => {
      response.writeHead(status, { "Content-Type": "application/json" });
      response.end(JSON.stringify(payload));
    };
    if (url.pathname.startsWith("/auth/v1/user")) return send({ id: USER_ID, aud: "authenticated", role: "authenticated", email: "e2e-local@dattaseller.invalid" });
    if (url.pathname.startsWith("/auth/v1/")) return send({ access_token: "stub-access-token", token_type: "bearer", expires_in: 3600, refresh_token: "stub-refresh-token", user: { id: USER_ID, email: "e2e-local@dattaseller.invalid" } });
    const tabela = url.pathname.replace("/rest/v1/", "");
    if (request.method !== "GET") {
      const parsed = JSON.parse(body || "[]");
      const novos = Array.isArray(parsed) ? parsed : [parsed];
      const filtroSlug = url.searchParams.get("slug")?.replace(/^eq\./, "") ?? null;
      const filtroId = url.searchParams.get("id")?.replace(/^eq\./, "") ?? null;
      for (const linha of novos) {
        const chave = linha.slug ?? linha.id ?? filtroSlug ?? filtroId;
        const atual = linhas(tabela).find((item) => (item.slug ?? item.id) === chave);
        if (atual) Object.assign(atual, linha);
        else linhas(tabela).push({ ...linha, slug: linha.slug ?? chave });
      }
      response.writeHead(204);
      response.end();
      return;
    }
    const resultado = filtradas(tabela, url);
    if (String(request.headers.accept ?? "").includes("vnd.pgrst.object")) {
      return resultado.length === 1 ? send(resultado[0]) : send({ code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" }, 406);
    }
    return send(resultado);
  });
  server.listen(0, "127.0.0.1");
  return { server, linhas };
}

async function waitFor(url, attempts = 90) {
  for (let tentativa = 0; tentativa < attempts; tentativa += 1) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) return true;
    } catch { /* subindo */ }
    await delay(1000);
  }
  return false;
}

const stub = startStub();
await once(stub.server, "listening");
const stubUrl = `http://127.0.0.1:${stub.server.address().port}`;
const cookie = (() => {
  const session = { access_token: "stub-access-token", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "stub-refresh-token", user: { id: USER_ID, aud: "authenticated", role: "authenticated", email: "e2e-local@dattaseller.invalid" } };
  return `sb-127-auth-token=base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
})();

const worker = spawn(process.execPath, ["scripts/redesign-worker.mjs", "--port", String(WORKER_PORT)], {
  cwd: process.cwd(),
  env: { ...process.env, DATTASELLER_WORKER_SECRET: SEGREDO, DATTASELLER_API_URL: `http://127.0.0.1:${APP_PORT}`, DATTASELLER_WORKER_TOKEN: TOKEN },
  stdio: ["ignore", "pipe", "pipe"],
});
const app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", String(APP_PORT)], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: stubUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "stub-publishable-key",
    SUPABASE_SECRET_KEY: "stub-secret-key",
    DATTASELLER_WORKER_URL: `http://127.0.0.1:${WORKER_PORT}`,
    DATTASELLER_WORKER_SECRET: SEGREDO,
    DATTASELLER_WORKER_TOKEN: TOKEN,
    NEXT_TELEMETRY_DISABLED: "1",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let log = "";
for (const processo of [worker, app]) {
  processo.stdout.on("data", (chunk) => { log += chunk.toString(); });
  processo.stderr.on("data", (chunk) => { log += chunk.toString(); });
}

const encerrar = () => {
  for (const processo of [worker, app]) { try { processo.kill(); } catch { /* encerrado */ } }
  try { stub.server.close(); } catch { /* encerrado */ }
};

const resumo = { base: stubUrl, app: `http://127.0.0.1:${APP_PORT}`, worker: `http://127.0.0.1:${WORKER_PORT}`, nicho: NICHO, cidade: CIDADE };
try {
  if (!(await waitFor(`http://127.0.0.1:${APP_PORT}/login`))) throw new Error("o CRM local não subiu");
  if (!(await waitFor(`http://127.0.0.1:${WORKER_PORT}/health`))) throw new Error("o worker não subiu");

  const chamar = async (caminho, init = {}) => {
    const response = await fetch(`http://127.0.0.1:${APP_PORT}${caminho}`, {
      ...init,
      redirect: "manual",
      headers: { Cookie: cookie, ...(init.body ? { "Content-Type": "application/json" } : {}), ...(init.headers ?? {}) },
    });
    const texto = await response.text();
    let json = null;
    try { json = JSON.parse(texto); } catch { /* resposta não JSON */ }
    return { status: response.status, json, texto };
  };

  resumo.etapa = "guarda de isolamento";
  const settings = await chamar("/api/settings");
  if (settings.status !== 200 || settings.json?.company_name !== "STUB DS-VALUE-04") throw new Error("o CRM local não está isolado no stub");
  if ((await chamar("/api/leads")).json.length !== 0) throw new Error("a base do teste não está vazia — abortado sem escrever");

  resumo.etapa = "descoberta (DS-VALUE-01)";
  const descoberta = await chamar("/api/discovery", { method: "POST", body: JSON.stringify({ nicho: NICHO, cidade: CIDADE, quantidade: QUANTIDADE, limite_candidatos: QUANTIDADE }) });
  if (descoberta.status !== 200 || !descoberta.json?.results?.length) throw new Error(`descoberta falhou (${descoberta.status}: ${descoberta.json?.error ?? descoberta.texto.slice(0, 160)})`);
  const comSite = descoberta.json.results.filter((item) => item.site_antigo);
  const escolhido = (ALVO ? comSite.find((item) => item.slug === ALVO) : null) ?? comSite[0];
  if (!escolhido) throw new Error("nenhum resultado real com site público para o redesign");
  resumo.lead = { slug: escolhido.slug, nome: escolhido.nome, cidade: escolhido.cidade, site: escolhido.site_antigo, fonte: escolhido.source_url };

  resumo.etapa = "persistência + enriquecimento (DS-VALUE-02)";
  const prospects = await chamar("/api/prospects", { method: "POST", body: JSON.stringify({ query: { niche: NICHO, city: CIDADE, product: "", target_quantity: QUANTIDADE, search_limit: 25 }, candidates: [escolhido] }) });
  if (prospects.status !== 200) throw new Error(`prospecção falhou (${prospects.status})`);
  const enriquecimento = await chamar("/api/enrichment", { method: "POST", body: JSON.stringify({ lead_slug: escolhido.slug }) });
  if (enriquecimento.status !== 200) throw new Error(`enriquecimento falhou (${enriquecimento.status}: ${enriquecimento.json?.error})`);
  resumo.enriquecimento = { atualizados: (enriquecimento.json.updated ?? []).map((campo) => campo.field), preservados: (enriquecimento.json.ignored ?? []).map((campo) => campo.field) };

  resumo.etapa = "diagnóstico factual (DS-VALUE-03)";
  const diagnostico = await chamar("/api/diagnosis", { method: "POST", body: JSON.stringify({ lead_slug: escolhido.slug }) });
  if (diagnostico.status !== 201) throw new Error(`diagnóstico falhou (${diagnostico.status}: ${diagnostico.json?.error})`);
  resumo.diagnostico = { id: diagnostico.json.diagnosis_id, http_status: diagnostico.json.fatos?.http_status, titulo: diagnostico.json.fatos?.titulo, evidencias: (diagnostico.json.evidencias ?? []).length };

  resumo.etapa = "redesign (DS-VALUE-04)";
  const inicio = Date.now();
  const job = await chamar("/api/redesign", { method: "POST", body: JSON.stringify({ lead_slug: escolhido.slug }) });
  if (job.status !== 202 || !job.json?.job_id) throw new Error(`job não aceito (${job.status}: ${job.json?.error ?? job.texto.slice(0, 160)})`);
  resumo.job = { id: job.json.job_id, mode: job.json.mode, status: job.json.status };
  let resultado = null;
  for (let tentativa = 0; tentativa < 40; tentativa += 1) {
    await delay(3000);
    const estado = await chamar(`/api/redesign?job=${encodeURIComponent(job.json.job_id)}`);
    if (estado.status !== 200) throw new Error(`acompanhamento falhou (${estado.status})`);
    if (estado.json.status === "failed") throw new Error(`redesign falhou: ${estado.json.error?.code} — ${estado.json.error?.message}`);
    if (estado.json.status === "completed") { resultado = estado.json; break; }
  }
  if (!resultado) throw new Error("o redesign não concluiu no tempo do teste");
  resumo.redesign = { duracao_s: Math.round((Date.now() - inicio) / 1000), preview: resultado.preview, artifact: resultado.artifact };

  resumo.etapa = "artefato, editor e comparador";
  const estadoWorker = await fetch(`${resumo.worker}/jobs/${job.json.job_id}`, { headers: { "x-worker-secret": SEGREDO } }).then((r) => r.json());
  const artifact = estadoWorker.artifact;
  if (!artifact) throw new Error("o worker não devolveu o artefato");
  resumo.artefato = {
    assets: artifact.assets.map((asset) => ({ kind: asset.kind, url: asset.url, source_url: asset.source_url, collected_at: asset.collected_at })),
    brand_context: { logo: artifact.brand_context.logo.kind, layout: artifact.brand_context.layout, cores: artifact.brand_context.colors, wordmark: artifact.brand_context.wordmark },
    warnings: artifact.warnings.map((aviso) => aviso.code),
    usados: artifact.used_assets.length,
    html_bytes: artifact.generated_html.length,
  };
  const editor = await chamar(resultado.preview.editor_url);
  if (editor.status !== 200 || !editor.texto.includes("PROSPECTOR-EDITOR-START")) throw new Error(`editor não abriu (${editor.status})`);
  const comparador = await chamar(resultado.preview.comparator_url);
  if (comparador.status !== 200 || !comparador.texto.includes(String(escolhido.site_antigo).replace(/\/$/, "")) || !comparador.texto.includes(resultado.preview.url)) {
    throw new Error(`comparador não abriu com site atual + redesign (${comparador.status})`);
  }
  resumo.editor = { status: editor.status, bytes: editor.texto.length, tem_editor: editor.texto.includes("PROSPECTOR-EDITOR-START") };
  resumo.comparador = { status: comparador.status, bytes: comparador.texto.length, site_atual: escolhido.site_antigo, redesign: resultado.preview.url };
  const preview = await chamar(resultado.preview.url);
  resumo.preview = { status: preview.status, bytes: preview.texto.length };

  mkdirSync(ARTIFACTS, { recursive: true });
  writeFileSync(resolve(ARTIFACTS, "artifact.json"), JSON.stringify(artifact, null, 2), "utf8");
  writeFileSync(resolve(ARTIFACTS, "redesign.html"), artifact.generated_html, "utf8");
  writeFileSync(resolve(ARTIFACTS, "editor.html"), editor.texto, "utf8");
  writeFileSync(resolve(ARTIFACTS, "comparador.html"), comparador.texto, "utf8");

  // DS-VALUE-05/06 — análise social pública e demonstração social do mesmo lead.
  if (process.env.REDESIGN_E2E_SKIP_SOCIAL === "1") {
    resumo.etapa = "social ignorado nesta execução (REDESIGN_E2E_SKIP_SOCIAL=1)";
  } else {
  resumo.etapa = "análise social (DS-VALUE-05)";
  const perfil = (await chamar("/api/leads")).json.find((linha) => linha.slug === escolhido.slug)?.instagram_url ?? "";
  if (!perfil) throw new Error("o lead não tem perfil social público registrado para a análise");
  // Perna de browser: quando o ambiente fornece a evidência lida em browser real
  // (Instagram bloqueia HTML puro), ela entra validada pelo contrato do agente.
  let evidenciaBrowser = null;
  if (process.env.REDESIGN_E2E_BROWSER_EVIDENCE) {
    try {
      evidenciaBrowser = JSON.parse(readFileSync(process.env.REDESIGN_E2E_BROWSER_EVIDENCE, "utf8"));
    } catch (error) {
      throw new Error(`evidência de browser inválida: ${error.message}`);
    }
  }
  const analiseJob = await chamar("/api/social", { method: "POST", body: JSON.stringify({ lead_slug: escolhido.slug, action: "ANALYZE_SOCIAL", profile_url: perfil, browser_evidence: evidenciaBrowser }) });
  if (analiseJob.status !== 202) throw new Error(`análise social não enfileirada (${analiseJob.status}: ${analiseJob.json?.error})`);
  let analise = null;
  for (let tentativa = 0; tentativa < 20; tentativa += 1) {
    await delay(3000);
    const estado = await chamar(`/api/social?job=${encodeURIComponent(analiseJob.json.job_id)}`);
    if (estado.json?.status === "failed") throw new Error(`análise social falhou: ${estado.json.error?.code} — ${estado.json.error?.message}`);
    if (estado.json?.status === "completed") { analise = estado.json; break; }
  }
  if (!analise) throw new Error("a análise social não concluiu no tempo do teste");
  const auditoria = await fetch(`${resumo.worker}/jobs/${analiseJob.json.job_id}`, { headers: { "x-worker-secret": SEGREDO } }).then((r) => r.json());
  resumo.analise_social = {
    perfil,
    handle: auditoria.artifact.handle,
    contadores: auditoria.artifact.counters,
    bio: auditoria.artifact.bio || null,
    cta: auditoria.artifact.cta || null,
    imagem: auditoria.artifact.visual_identity?.profile_image ?? null,
    evidencias: auditoria.artifact.evidence.length,
    avisos: auditoria.artifact.warnings.map((aviso) => aviso.code),
    auditoria_id: analise.audit?.id ?? null,
  };

  resumo.etapa = "demonstração social (DS-VALUE-06)";
  const demoJob = await chamar("/api/social", { method: "POST", body: JSON.stringify({ lead_slug: escolhido.slug, action: "BUILD_SOCIAL_DEMO" }) });
  if (demoJob.status !== 202) throw new Error(`demonstração social não enfileirada (${demoJob.status}: ${demoJob.json?.error})`);
  let demo = null;
  for (let tentativa = 0; tentativa < 20; tentativa += 1) {
    await delay(3000);
    const estado = await chamar(`/api/social?job=${encodeURIComponent(demoJob.json.job_id)}`);
    if (estado.json?.status === "failed") throw new Error(`demonstração social falhou: ${estado.json.error?.code} — ${estado.json.error?.message}`);
    if (estado.json?.status === "completed") { demo = estado.json; break; }
  }
  if (!demo) throw new Error("a demonstração social não concluiu no tempo do teste");
  const artefatoSocial = await fetch(`${resumo.worker}/jobs/${demoJob.json.job_id}`, { headers: { "x-worker-secret": SEGREDO } }).then((r) => r.json());
  resumo.demo_social = {
    preview: demo.preview,
    dias: artefatoSocial.artifact.calendar.length,
    pendentes_de_cliente: artefatoSocial.artifact.calendar.filter((dia) => dia.requires_client_input).map((dia) => dia.format),
    pecas: artefatoSocial.artifact.feed_pieces.map((peca) => ({ id: peca.id, format: peca.format, hook: peca.hook, hashtags: peca.hashtags.length, visual: peca.visual.asset ? "foto real" : "tipografia + paleta" })),
    stories: artefatoSocial.artifact.stories.length,
    nunca_dizer: artefatoSocial.artifact.direction.never_say.length,
    llm: artefatoSocial.artifact.generation_metadata.llm,
    avisos: artefatoSocial.artifact.warnings.map((aviso) => aviso.code),
  };
  const demoPreview = await chamar(demo.preview.url);
  if (demoPreview.status !== 200 || !demoPreview.texto.includes("demonstração social")) throw new Error(`o artefato visual da demonstração não abriu (${demoPreview.status})`);
  writeFileSync(resolve(ARTIFACTS, "social-analysis.json"), JSON.stringify(auditoria.artifact, null, 2), "utf8");
  writeFileSync(resolve(ARTIFACTS, "social-demo.html"), artefatoSocial.artifact.generated_html, "utf8");
  resumo.demo_social.preview_bytes = demoPreview.texto.length;
  }
  writeFileSync(resolve(ARTIFACTS, "resumo.json"), JSON.stringify(resumo, null, 2), "utf8");
  resumo.arquivos = { pasta: ARTIFACTS, redesign: resolve(ARTIFACTS, "redesign.html"), editor: resolve(ARTIFACTS, "editor.html"), comparador: resolve(ARTIFACTS, "comparador.html") };
  resumo.etapa = "ok";
  console.log(JSON.stringify(resumo, null, 2));
  console.error("RESULTADO: descobrir → enriquecer → diagnosticar → BUILD_REDESIGN → preview/editor/comparador com dados reais.");

  if (SERVE) {
    console.error(`SERVE: CRM em ${resumo.app} · worker em ${resumo.worker} · preview ${resultado.preview.url} · cookie ${cookie}`);
    console.error("Encerre com Ctrl+C quando terminar a validação visual.");
    process.on("SIGINT", () => { encerrar(); process.exit(0); });
    await new Promise(() => {});
  }
} catch (error) {
  console.log(JSON.stringify({ ...resumo, erro: error?.message ?? String(error) }, null, 2));
  console.error(`FALHA: ${error?.message ?? error}`);
  console.error(log.split("\n").filter((linha) => /error|Error|⨯/.test(linha)).slice(-8).join("\n"));
  process.exitCode = 1;
} finally {
  if (!SERVE) encerrar();
}
