import { AgentError, AGENT_ACTIONS } from "./contract.js";

const TYPES = new Set(Object.values(AGENT_ACTIONS));
const clean = (value) => String(value ?? "").trim();
const safeId = (value) => /^[A-Za-z0-9_-]{3,128}$/.test(clean(value));

/** Executor-neutral boundary. Storage and commercial state stay in DattaSeller. */
export function parseAgentJob(value = {}) {
  if (!safeId(value.job_id)) throw new AgentError("agent_job_id_invalid", "job_id inválido.");
  if (!safeId(value.tenant_id)) throw new AgentError("agent_tenant_invalid", "tenant_id inválido.");
  if (!TYPES.has(value.job_type)) throw new AgentError("agent_job_type_invalid", "job_type não suportado.");
  if (!value.input || typeof value.input !== "object" || Array.isArray(value.input)) throw new AgentError("agent_input_invalid", "input estruturado é obrigatório.");
  if (!value.context || typeof value.context !== "object" || Array.isArray(value.context)) throw new AgentError("agent_context_invalid", "context estruturado é obrigatório.");
  return { job_id: clean(value.job_id), tenant_id: clean(value.tenant_id), job_type: value.job_type, input: value.input, context: value.context, requested_capabilities: Array.isArray(value.requested_capabilities) ? value.requested_capabilities.filter((item) => typeof item === "string").slice(0, 20) : [], status: "queued" };
}

export function parseAgentResult(value = {}, expectedJobId) {
  if (!safeId(value.job_id) || value.job_id !== expectedJobId) throw new AgentError("agent_result_job_mismatch", "Resultado não corresponde ao job solicitado.");
  if (!["completed", "failed"].includes(value.status)) throw new AgentError("agent_result_status_invalid", "Status de resultado inválido.");
  if (value.status === "completed" && (!value.structured_output || typeof value.structured_output !== "object")) throw new AgentError("agent_result_output_invalid", "Resultado concluído sem saída estruturada.");
  return { job_id: value.job_id, status: value.status, structured_output: value.structured_output ?? null, evidence: Array.isArray(value.evidence) ? value.evidence : [], artifacts: Array.isArray(value.artifacts) ? value.artifacts : [], errors: Array.isArray(value.errors) ? value.errors : [], timestamps: value.timestamps && typeof value.timestamps === "object" ? value.timestamps : {} };
}

/** Minimal HTTP adapter: a provider may be Hermes today or a tenant worker later. */
export function createAgentJobAdapter({ endpoint = "", bearer = "", fetchImpl = fetch, timeoutMs = 30000 } = {}) {
  const base = clean(endpoint).replace(/\/$/, "");
  if (!/^https:\/\/[A-Za-z0-9.-]+(?::\d+)?$/i.test(base) || !bearer) return { configured: false, async submit() { throw new AgentError("agent_executor_unavailable", "Executor agêntico não configurado."); } };
  return {
    configured: true,
    async submit(raw) {
      const job = parseAgentJob(raw);
      const response = await fetchImpl(`${base}/v1/dattaseller/jobs`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${bearer}` }, body: JSON.stringify(job), signal: AbortSignal.timeout(timeoutMs) });
      const payload = await response.json().catch(() => null);
      // O código estruturado da ponte é preservado: um tenant recusado não pode
      // virar "executor indisponível" e mascarar a causa real.
      if (!response.ok || !payload) {
        const upstream = clean(payload?.error?.code) || clean(payload?.errors?.[0]?.code) || "agent_executor_unavailable";
        const failure = new AgentError(upstream, `Executor respondeu ${response.status}.`);
        failure.status = response.status;
        throw failure;
      }
      return parseAgentResult(payload, job.job_id);
    },
  };
}
