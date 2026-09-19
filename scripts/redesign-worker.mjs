/**
 * DattaSeller Worker Agent — servidor HTTP do executor de redesign.
 *
 * Roda fora da Vercel (VPS/local), com contrato separado da implementação:
 *   POST /jobs/redesign  { lead_slug, site_url, diagnosis_id } → { job_id, status }
 *   GET  /jobs/:id       → { status, artifact? , error? }
 *   GET  /health         → { status, action }
 *
 * O CRM não fica com requisição longa aberta. Segurança: proteção SSRF do
 * PR #18 (via coletor), segredo compartilhado opcional e bind local por padrão.
 *
 * Uso:
 *   node scripts/redesign-worker.mjs                 # servidor (127.0.0.1:4599)
 *   node scripts/redesign-worker.mjs --host 0.0.0.0 --port 4599
 *   node scripts/redesign-worker.mjs --once --lead-slug x --site-url https://... --out artefato.json
 */

import { createServer } from "node:http";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { REDESIGN_ACTION, RedesignError, parseRedesignJob, resolveContextUrl } from "../lib/redesign/contract.js";
import { createRedesignWorker, runRedesignOnce } from "../lib/redesign/worker.js";

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] && !args[index + 1].startsWith("--") ? args[index + 1] : fallback;
};
const has = (name) => args.includes(`--${name}`);

const HOST = flag("host", process.env.DATTASELLER_WORKER_HOST ?? "127.0.0.1");
const PORT = Number(flag("port", process.env.DATTASELLER_WORKER_PORT ?? 4599));
const SECRET = process.env.DATTASELLER_WORKER_SECRET ?? "";
const API_URL = (process.env.DATTASELLER_API_URL ?? "").replace(/\/$/, "");
const API_TOKEN = process.env.DATTASELLER_WORKER_TOKEN ?? "";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost", "127.0.0.2"]);
const isLoopback = (host) => LOOPBACK_HOSTS.has(String(host ?? "").toLowerCase().trim());

// VPS/exposto: sem segredo o worker não inicia (não subimos servidor inseguro).
if (!isLoopback(HOST) && !SECRET) {
  console.error("WORKER_CONFIG_INVALID: bind externo exige DATTASELLER_WORKER_SECRET.");
  process.exit(2);
}
// Operação com o CRM configurada exige token: sem ele o contexto obrigatório não
// pode ser autenticado e o redesign comercial seria inválido.
if (API_URL && !API_TOKEN) {
  console.error("WORKER_CONFIG_INVALID: DATTASELLER_API_URL exige DATTASELLER_WORKER_TOKEN.");
  process.exit(2);
}

/**
 * Contexto do CRM: o destino é montado apenas como caminho relativo sobre a
 * origem confiável configurada — nunca um endereço arbitrário do job.
 */
async function contextProvider(contextPath) {
  const url = resolveContextUrl(contextPath, API_URL);
  const response = await fetch(url, { headers: { "x-dattaseller-worker-token": API_TOKEN } });
  if (!response.ok) throw new RedesignError("redesign_context_unavailable", `CRM respondeu ${response.status} ao pedir o contexto.`);
  return response.json();
}

if (has("once")) {
  const lead_slug = flag("lead-slug");
  const site_url = flag("site-url");
  const diagnosis_id = flag("diagnosis-id");
  try {
    const job = parseRedesignJob({ lead_slug, site_url, diagnosis_id, requested_by: "cli" });
    const artifact = await runRedesignOnce(job, { contextProvider: API_URL ? contextProvider : null, requireContext: Boolean(API_URL) });
    const destino = flag("out");
    if (destino) {
      const caminho = resolve(destino);
      writeFileSync(caminho, JSON.stringify(artifact, null, 2), "utf8");
      writeFileSync(caminho.replace(/\.json$/, ".html"), artifact.generated_html, "utf8");
      console.log(`ARTEFATO: ${caminho}`);
    } else {
      console.log(JSON.stringify({ lead_slug: artifact.lead_slug, assets: artifact.assets.length, warnings: artifact.warnings.length, created_at: artifact.created_at }, null, 2));
    }
  } catch (error) {
    console.error(`FALHA: ${error?.code ?? error?.name ?? "erro"} — ${error?.message ?? error}`);
    process.exitCode = 1;
  }
} else {
  const worker = createRedesignWorker({ contextProvider: API_URL ? contextProvider : null, requireContext: Boolean(API_URL) });

  const json = (response, payload, status = 200) => {
    response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(payload));
  };

  const server = createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host ?? "127.0.0.1"}`);
    if (request.method === "GET" && url.pathname === "/health") {
      return json(response, { status: "ok", action: REDESIGN_ACTION, worker: "dattaseller-worker-agent" });
    }
    // Em modo exposto (ou com segredo configurado) o segredo é obrigatório nas
    // rotas de job; sem ele, 401.
    if (SECRET && request.headers["x-worker-secret"] !== SECRET) {
      return json(response, { error: "unauthorized_worker" }, 401);
    }
    if (request.method === "POST" && url.pathname === "/jobs/redesign") {
      let body = "";
      for await (const chunk of request) body += chunk;
      try {
        const payload = JSON.parse(body || "{}");
        const resultado = worker.submit(payload);
        return json(response, resultado, 202);
      } catch (error) {
        const code = error instanceof RedesignError ? error.code : "redesign_invalid_job";
        return json(response, { error: code, message: error?.message ?? "job inválido" }, 400);
      }
    }
    const jobMatch = /^\/jobs\/([A-Za-z0-9_-]+)$/.exec(url.pathname);
    if (request.method === "GET" && jobMatch) {
      const estado = worker.status(jobMatch[1]);
      if (!estado) return json(response, { error: "job_not_found" }, 404);
      return json(response, estado);
    }
    return json(response, { error: "route_not_found", action: REDESIGN_ACTION }, 404);
  });

  server.listen(PORT, HOST, () => {
    const porta = server.address()?.port ?? PORT;
    console.log(`DATTASELLER_WORKER_OK: http://${HOST}:${porta} (ação ${REDESIGN_ACTION})`);
  });
}
