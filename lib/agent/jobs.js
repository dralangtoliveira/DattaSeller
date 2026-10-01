import { AGENT_ACTIONS } from "./contract.js";

/**
 * Executor neutro (DS-AGENT-01).
 *
 * O CRM escolhe o executor pelo fluxo já existente: quando a ponte HTTPS do
 * Hermes está configurada o job sai por ela; quando não está, nada é inventado e
 * o fluxo continua no worker do próprio repositório pelas rotas de capacidade
 * existentes. Esta função não substitui nem desativa o worker atual.
 */
export function selectAgentExecutor({ endpoint = "", bearer = "" } = {}) {
  const url = String(endpoint ?? "").trim().replace(/\/+$/, "");
  const token = String(bearer ?? "").trim();
  if (/^https:\/\/[A-Za-z0-9.-]+(?::\d+)?$/i.test(url) && token) {
    return { kind: "shared-hermes", remote: true, endpoint: url };
  }
  return { kind: "inline-worker", remote: false, endpoint: "" };
}

const SAFE_ID = /^[A-Za-z0-9_-]{3,128}$/;
const JOB_TYPES = new Set(Object.values(AGENT_ACTIONS));
const TERMINAL = new Set(["completed", "failed"]);
const clean = (value) => String(value ?? "").trim();
const plainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

/** Valida e normaliza o pedido de job antes de qualquer efeito. */
export function normalizeAgentJobRequest(body = {}, { fallbackJobId = "" } = {}) {
  const jobId = clean(body.job_id) || clean(fallbackJobId);
  if (!SAFE_ID.test(jobId)) return { error: "agent_job_id_invalid" };
  const tenantId = clean(body.tenant_id);
  if (!SAFE_ID.test(tenantId)) return { error: "agent_tenant_invalid" };
  const jobType = clean(body.job_type);
  if (!JOB_TYPES.has(jobType)) return { error: "agent_job_type_invalid" };
  if (!plainObject(body.input)) return { error: "agent_input_invalid" };
  if (!plainObject(body.context)) return { error: "agent_context_invalid" };
  const leadSlug = clean(body.lead_slug ?? body.input.lead_slug);
  return {
    job: {
      job_id: jobId,
      tenant_id: tenantId,
      job_type: jobType,
      input: body.input,
      context: body.context,
      requested_capabilities: Array.isArray(body.requested_capabilities)
        ? body.requested_capabilities.filter((item) => typeof item === "string").slice(0, 20)
        : [],
      lead_slug: leadSlug || null,
    },
  };
}

export const isTerminalAgentJob = (row) => TERMINAL.has(clean(row?.status));

/** Linha persistida antes da execução: o estado do job nunca vive só na memória. */
export function agentJobRow({ job, executor, userId = null, timestamp }) {
  const at = timestamp ?? new Date().toISOString();
  return {
    id: job.job_id,
    tenant_id: job.tenant_id,
    lead_slug: job.lead_slug,
    job_type: job.job_type,
    executor: executor?.kind ?? "inline-worker",
    status: "queued",
    request: { input: job.input, context: job.context, requested_capabilities: job.requested_capabilities },
    result: null,
    evidence: [],
    artifacts: [],
    errors: [],
    error_code: null,
    requested_by: userId,
    attempts: 1,
    started_at: at,
    completed_at: null,
    created_at: at,
    updated_at: at,
  };
}

/** Patch do resultado de sucesso: estado, resultado, evidências e artefatos. */
export function applyAgentResult(result, timestamp) {
  const at = timestamp ?? new Date().toISOString();
  const errors = Array.isArray(result?.errors) ? result.errors : [];
  const completed = result?.status === "completed";
  // Um job que não concluiu nunca fica sem código de erro: fail-closed.
  const code = errors.length ? clean(errors[0]?.code) || "agent_executor_error" : completed ? null : "agent_executor_error";
  return {
    status: completed ? "completed" : "failed",
    result: result?.structured_output ?? null,
    evidence: Array.isArray(result?.evidence) ? result.evidence : [],
    artifacts: Array.isArray(result?.artifacts) ? result.artifacts : [],
    errors,
    error_code: code,
    completed_at: at,
    updated_at: at,
  };
}

/** Patch de falha estruturada: nunca grava segredo nem payload bruto do erro. */
export function failedAgentJobPatch(code, timestamp) {
  const at = timestamp ?? new Date().toISOString();
  const safe = clean(code) || "agent_executor_unavailable";
  return { status: "failed", errors: [{ code: safe }], error_code: safe, completed_at: at, updated_at: at };
}

/** Resposta pública: nada de segredo, nada de contexto comercial bruto. */
export function agentJobView(row = {}) {
  return {
    job_id: row.id,
    tenant_id: row.tenant_id,
    lead_slug: row.lead_slug ?? null,
    job_type: row.job_type,
    executor: row.executor,
    status: row.status,
    result: row.result ?? null,
    evidence: Array.isArray(row.evidence) ? row.evidence : [],
    artifacts: Array.isArray(row.artifacts) ? row.artifacts : [],
    errors: Array.isArray(row.errors) ? row.errors : [],
    error_code: row.error_code ?? null,
    attempts: Number(row.attempts ?? 0),
    created_at: row.created_at ?? null,
    completed_at: row.completed_at ?? null,
  };
}
