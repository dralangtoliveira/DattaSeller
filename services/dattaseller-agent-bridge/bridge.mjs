/**
 * DattaSeller Agent Bridge — ponte HML DattaSeller -> Hermes compartilhado.
 *
 * Expoe POST /v1/dattaseller/jobs (contrato AgentJob/AgentResult), autentica com
 * credencial PROPRIA do DattaSeller, guarda a API_SERVER_KEY do Hermes somente no
 * servidor e devolve AgentResult estruturado. Estado comercial nunca passa aqui.
 */
import http from "node:http";
import { randomUUID } from "node:crypto";
import { createHash, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const BIND_IP = process.env.DS_BIND_IP ?? "172.18.0.1";
const BIND_PORT = Number(process.env.DS_BIND_PORT ?? 8787);
const BEARER = process.env.DS_AGENT_BEARER ?? "";
const HERMES_URL = (process.env.HERMES_URL ?? "http://127.0.0.1:8642").replace(/\/+$/, "");
const HERMES_KEY = process.env.HERMES_API_SERVER_KEY ?? "";
const HERMES_MODEL = process.env.HERMES_MODEL ?? "hermes-agent";
const ALLOWED_TENANTS = (process.env.DS_ALLOWED_TENANTS ?? "hml_001")
  .split(",").map((s) => s.trim()).filter(Boolean);
const TIMEOUT_MS = Number(process.env.DS_JOB_TIMEOUT_MS ?? 300000);
const DATA_DIR = process.env.DS_DATA_DIR ?? "/data";
const RESULTS_DIR = join(DATA_DIR, "results");
const JOB_TYPES = new Set(["BUILD_REDESIGN", "ANALYZE_SOCIAL", "BUILD_SOCIAL_DEMO"]);
const MAX_BODY = 512 * 1024;
const SAFE_ID = /^[A-Za-z0-9_-]{3,128}$/;

mkdirSync(RESULTS_DIR, { recursive: true });

const SKILL = `Voce executa AgentJobs do DattaSeller. A coleta factual ja foi feita
pelo CRM e chega dentro de context/input: trabalhe somente sobre ela.
Regras obrigatorias:
- Use SOMENTE o input e o context fornecidos. Nao navegue na internet, nao abra
  paginas, nao acione navegador, nao use ferramentas de busca e nao invente fato,
  URL, preco, avaliacao, depoimento ou dado de contato.
- Se faltar dado necessario, registre isso em requires_client_input em vez de buscar.
- Nunca acesse Production. Nunca receba, imprima ou devolva segredos.
- Nao envie e-mail, nao publique proposta, nao altere preco, nao crie contrato e
  nao execute pagamento.
- Preserve a proveniencia de cada fato citado (source_url e checked_at vindos do context).
Responda SOMENTE com um objeto JSON valido, sem markdown e sem texto fora do JSON:
{"structured_output":{...},"requires_client_input":[],"evidence":[{"source_url":"...","checked_at":"...","fact":"..."}],"artifacts":[],"errors":[]}`;

const clean = (v) => String(v ?? "").trim();
const digest = (v) => createHash("sha256").update(String(v)).digest();

function bearerOk(presented) {
  if (!BEARER || !presented) return false;
  const a = digest(presented);
  const b = digest(BEARER);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function parseAgentJob(value) {
  if (!value || typeof value !== "object") return { error: "agent_job_invalid" };
  if (!SAFE_ID.test(clean(value.job_id))) return { error: "agent_job_id_invalid" };
  if (!SAFE_ID.test(clean(value.tenant_id))) return { error: "agent_tenant_invalid" };
  if (!JOB_TYPES.has(value.job_type)) return { error: "agent_job_type_invalid" };
  if (!value.input || typeof value.input !== "object" || Array.isArray(value.input)) return { error: "agent_input_invalid" };
  if (!value.context || typeof value.context !== "object" || Array.isArray(value.context)) return { error: "agent_context_invalid" };
  if (ALLOWED_TENANTS.length && !ALLOWED_TENANTS.includes(clean(value.tenant_id))) return { error: "agent_tenant_not_allowed" };
  return {
    job: {
      job_id: clean(value.job_id),
      tenant_id: clean(value.tenant_id),
      job_type: value.job_type,
      input: value.input,
      context: value.context,
      requested_capabilities: Array.isArray(value.requested_capabilities)
        ? value.requested_capabilities.filter((i) => typeof i === "string").slice(0, 20) : [],
      status: "queued",
    },
  };
}

function slotPath(tenant, job) {
  return join(RESULTS_DIR, `${createHash("sha256").update(`${tenant}\0${job}`).digest("hex")}.json`);
}
function readSlot(tenant, job) {
  try {
    const raw = readFileSync(slotPath(tenant, job), "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch { return null; }
}
function writeSlot(tenant, job, payload) {
  const target = slotPath(tenant, job);
  const tmp = `${target}.${randomUUID()}.tmp`;
  writeFileSync(tmp, JSON.stringify(payload), { mode: 0o600 });
  renameSync(tmp, target);
}

export function extractJson(text) {
  const trimmed = clean(text).replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch { /* fallthrough */ }
  const start = trimmed.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < trimmed.length; i += 1) {
    if (trimmed[i] === "{") depth += 1;
    else if (trimmed[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(trimmed.slice(start, i + 1));
          return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
        } catch { return null; }
      }
    }
  }
  return null;
}

async function callHermes(job) {
  const body = {
    model: HERMES_MODEL,
    stream: false,
    messages: [
      { role: "system", content: SKILL },
      {
        role: "user",
        content: JSON.stringify({
          job_type: job.job_type,
          tenant_id: job.tenant_id,
          input: job.input,
          context: job.context,
          requested_capabilities: job.requested_capabilities,
        }),
      },
    ],
  };
  const response = await fetch(`${HERMES_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${HERMES_KEY}`,
      "Idempotency-Key": job.job_id,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await response.text();
  if (!response.ok) {
    const err = new Error("hermes_upstream_error");
    err.status = response.status;
    err.detail = text.slice(0, 300);
    throw err;
  }
  let payload;
  try { payload = JSON.parse(text); } catch { return { content: "", usage: null }; }
  const content = payload?.choices?.[0]?.message?.content;
  return {
    content: typeof content === "string" ? content
      : Array.isArray(content) ? content.map((p) => (typeof p === "string" ? p : p?.text ?? "")).join("")
        : "",
    usage: payload?.usage ?? null,
  };
}

const inflight = new Map();

async function runJob(job) {
  const startedAt = new Date().toISOString();
  try {
    const { content, usage } = await callHermes(job);
    const parsed = extractJson(content);
    if (!parsed) {
      return {
        job_id: job.job_id, status: "failed", structured_output: null,
        evidence: [], artifacts: [],
        errors: [{ code: "agent_output_unparsable", message: "Executor nao devolveu JSON estruturado." }],
        timestamps: { started_at: startedAt, completed_at: new Date().toISOString() },
      };
    }
    return {
      job_id: job.job_id, status: "completed",
      structured_output: parsed.structured_output ?? parsed,
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
      artifacts: Array.isArray(parsed.artifacts) ? parsed.artifacts : [],
      errors: Array.isArray(parsed.errors) ? parsed.errors : [],
      timestamps: { started_at: startedAt, completed_at: new Date().toISOString() },
      executor: { kind: "shared-hermes", model: HERMES_MODEL, usage },
    };
  } catch (error) {
    const timeout = error?.name === "TimeoutError" || error?.name === "AbortError";
    const status = timeout ? "failed" : "failed";
    return {
      job_id: job.job_id, status, structured_output: null,
      evidence: [], artifacts: [],
      errors: [{
        code: timeout ? "agent_executor_timeout" : "agent_executor_unavailable",
        message: timeout ? `Executor excedeu ${TIMEOUT_MS}ms.` : `Falha do executor (${error?.status ?? "sem resposta"}).`,
      }],
      timestamps: { started_at: startedAt, completed_at: new Date().toISOString() },
    };
  }
}

const log = (fields) => console.log(JSON.stringify({ ts: new Date().toISOString(), ...fields }));

function send(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new Error("body_too_large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

const server = http.createServer(async (req, res) => {
  const started = Date.now();
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname;

  if (req.method === "GET" && (path === "/health" || path === "/v1/dattaseller/health")) {
    return send(res, 200, {
      status: "ok",
      service: "dattaseller-agent-bridge",
      hermes_configured: Boolean(HERMES_KEY && HERMES_URL),
      bearer_configured: Boolean(BEARER),
      tenants: ALLOWED_TENANTS.length,
    });
  }

  if (path !== "/v1/dattaseller/jobs") return send(res, 404, { error: { code: "not_found" } });
  if (req.method !== "POST") return send(res, 405, { error: { code: "method_not_allowed" } });

  const presented = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!bearerOk(presented)) {
    log({ event: "auth_rejected", path, status: 401 });
    return send(res, 401, { error: { code: "unauthorized" } });
  }

  let raw;
  try { raw = await readBody(req); }
  catch { return send(res, 413, { error: { code: "agent_request_too_large" } }); }

  let value;
  try { value = JSON.parse(raw); }
  catch { return send(res, 400, { error: { code: "agent_request_invalid_json" } }); }

  const parsed = parseAgentJob(value);
  if (parsed.error) {
    log({ event: "job_rejected", code: parsed.error, status: 400 });
    return send(res, 400, { error: { code: parsed.error } });
  }
  const job = parsed.job;

  const cached = readSlot(job.tenant_id, job.job_id);
  if (cached) {
    log({ event: "job_replayed", job_id: job.job_id, tenant_id: job.tenant_id, status: 200 });
    return send(res, 200, cached);
  }

  const key = `${job.tenant_id}\0${job.job_id}`;
  if (inflight.has(key)) {
    const result = await inflight.get(key);
    return send(res, 200, result);
  }
  const promise = runJob(job).then((result) => {
    writeSlot(job.tenant_id, job.job_id, result);
    return result;
  }).finally(() => inflight.delete(key));
  inflight.set(key, promise);

  const result = await promise;
  log({
    event: "job_finished", job_id: job.job_id, tenant_id: job.tenant_id,
    job_type: job.job_type, status: 200, outcome: result.status,
    ms: Date.now() - started, error_codes: (result.errors ?? []).map((e) => e?.code).filter(Boolean),
  });
  return send(res, 200, result);
});

server.headersTimeout = 10_000;
server.requestTimeout = TIMEOUT_MS + 15_000;

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  server.listen(BIND_PORT, BIND_IP, () => {
    log({
      event: "bridge_started", bind: `${BIND_IP}:${BIND_PORT}`,
      hermes_url: HERMES_URL, model: HERMES_MODEL, tenants: ALLOWED_TENANTS.length,
    });
  });
}

export { server };
