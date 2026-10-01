import test from "node:test";
import assert from "node:assert/strict";
import { agentJobRow, agentJobView, applyAgentResult, failedAgentJobPatch, isTerminalAgentJob, normalizeAgentJobRequest, selectAgentExecutor } from "../lib/agent/jobs.js";
import { createAgentJobAdapter } from "../lib/agent/job-interface.js";

const TENANT = "hml_001";
const base = {
  job_id: "job_abc123",
  tenant_id: TENANT,
  job_type: "ANALYZE_SOCIAL",
  lead_slug: "fat-rosies-orlando",
  input: { lead_slug: "fat-rosies-orlando" },
  context: { lead: { slug: "fat-rosies-orlando" } },
  requested_capabilities: ["structured_reasoning"],
};
const okResult = {
  job_id: "job_abc123",
  status: "completed",
  structured_output: { summary: "ok" },
  evidence: [{ source_url: "https://example.test/p", checked_at: "2026-10-01", fact: "f" }],
  artifacts: [{ kind: "html" }],
  errors: [],
  timestamps: { started_at: "a", completed_at: "b" },
};

test("executor neutro: ponte HTTPS leva o job; sem configuração nada é inventado", () => {
  assert.equal(selectAgentExecutor().remote, false);
  assert.equal(selectAgentExecutor().kind, "inline-worker");
  assert.equal(selectAgentExecutor({ endpoint: "http://insecure.local", bearer: "x" }).remote, false);
  assert.equal(selectAgentExecutor({ endpoint: "https://bridge.example", bearer: "" }).remote, false);
  const escolhido = selectAgentExecutor({ endpoint: "https://bridge.example/", bearer: "server-only" });
  assert.equal(escolhido.remote, true);
  assert.equal(escolhido.kind, "shared-hermes");
  assert.equal(escolhido.endpoint, "https://bridge.example");
});

test("job criado é validado e normalizado antes de qualquer efeito", () => {
  const criado = normalizeAgentJobRequest(base, { fallbackJobId: "job_fallback" });
  assert.equal(criado.error, undefined);
  assert.equal(criado.job.job_id, "job_abc123");
  assert.equal(criado.job.lead_slug, "fat-rosies-orlando");

  const gerado = normalizeAgentJobRequest({ ...base, job_id: undefined }, { fallbackJobId: "job_gerado123" });
  assert.equal(gerado.job.job_id, "job_gerado123");

  assert.equal(normalizeAgentJobRequest({ ...base, job_id: "xy" }).error, "agent_job_id_invalid");
  assert.equal(normalizeAgentJobRequest({ ...base, tenant_id: "" }).error, "agent_tenant_invalid");
  assert.equal(normalizeAgentJobRequest({ ...base, job_type: "DROP_TABLES" }).error, "agent_job_type_invalid");
  assert.equal(normalizeAgentJobRequest({ ...base, input: [] }).error, "agent_input_invalid");
  assert.equal(normalizeAgentJobRequest({ ...base, context: "texto" }).error, "agent_context_invalid");
});

test("estado do job é persistido antes da execução e o resultado depois", () => {
  const job = normalizeAgentJobRequest(base).job;
  const executores = selectAgentExecutor({ endpoint: "https://bridge.example", bearer: "x" });
  const row = agentJobRow({ job, executor: executores, userId: "user-1", timestamp: "2026-10-01T00:00:00.000Z" });
  assert.equal(row.status, "queued");
  assert.equal(row.executor, "shared-hermes");
  assert.equal(row.requested_by, "user-1");
  assert.equal(row.attempts, 1);
  assert.equal(row.result, null);
  assert.equal(row.completed_at, null);

  const patch = applyAgentResult(okResult, "2026-10-01T00:00:05.000Z");
  assert.equal(patch.status, "completed");
  assert.deepEqual(patch.result, { summary: "ok" });
  assert.equal(patch.evidence.length, 1);
  assert.equal(patch.artifacts.length, 1);
  assert.equal(patch.error_code, null);

  const salvo = agentJobView({ ...row, ...patch });
  assert.equal(salvo.job_id, "job_abc123");
  assert.equal(salvo.status, "completed");
  assert.equal(salvo.executor, "shared-hermes");
  assert.equal(salvo.evidence.length, 1);
  assert.equal(JSON.stringify(salvo).includes("context"), false);
});

test("resultado parcial/falho continua terminal e nunca promove para completed", () => {
  const parcial = applyAgentResult({ ...okResult, status: "failed", errors: [{ code: "agent_executor_timeout" }] });
  assert.equal(parcial.status, "failed");
  assert.equal(parcial.error_code, "agent_executor_timeout");
  assert.equal(isTerminalAgentJob(parcial), true);

  const semErro = applyAgentResult({ ...okResult, status: "failed", errors: [] });
  assert.equal(semErro.status, "failed");
  assert.equal(semErro.error_code, "agent_executor_error");
  assert.equal(isTerminalAgentJob({ status: "running" }), false);
});

test("falha estruturada nunca grava segredo nem payload bruto", () => {
  const patch = failedAgentJobPatch("agent_executor_unavailable");
  assert.equal(patch.status, "failed");
  assert.deepEqual(patch.errors, [{ code: "agent_executor_unavailable" }]);
  assert.equal(JSON.stringify(patch).includes("Bearer"), false);
  assert.equal(failedAgentJobPatch("").error_code, "agent_executor_unavailable");
});

test("adapter: bearer ausente, bridge indisponível e retorno inválido falham fechado", async () => {
  await assert.rejects(() => createAgentJobAdapter().submit(base), /não configurado|Executor/i);

  await assert.rejects(
    () => createAgentJobAdapter({ endpoint: "https://bridge.example", bearer: "b", fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({ error: { code: "x" } }) }) }).submit(base),
    /Executor respondeu 503/,
  );

  // O código estruturado da ponte não pode ser achatado em "executor indisponível".
  await assert.rejects(
    () => createAgentJobAdapter({ endpoint: "https://bridge.example", bearer: "b", fetchImpl: async () => ({ ok: false, status: 400, json: async () => ({ error: { code: "agent_tenant_not_allowed" } }) }) }).submit(base),
    (error) => error.code === "agent_tenant_not_allowed" && error.status === 400,
  );

  await assert.rejects(
    () => createAgentJobAdapter({ endpoint: "https://bridge.example", bearer: "b", fetchImpl: async () => ({ ok: false, status: 502, json: async () => ({ errors: [{ code: "agent_executor_timeout" }] }) }) }).submit(base),
    (error) => error.code === "agent_executor_timeout" && error.status === 502,
  );

  await assert.rejects(
    () => createAgentJobAdapter({ endpoint: "https://bridge.example", bearer: "b", fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ job_id: "job_outro", status: "completed", structured_output: {} }) }) }).submit(base),
    /não corresponde/,
  );

  await assert.rejects(
    () => createAgentJobAdapter({ endpoint: "https://bridge.example", bearer: "b", fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ job_id: "job_abc123", status: "completed", structured_output: null }) }) }).submit(base),
    /sem saída estruturada/,
  );

  const timeout = createAgentJobAdapter({
    endpoint: "https://bridge.example",
    bearer: "b",
    fetchImpl: async () => { const e = new Error("aborted"); e.name = "TimeoutError"; throw e; },
  });
  await assert.rejects(() => timeout.submit(base), /aborted/);
});

test("adapter recalcula o job e recusa tenant/job inválido antes de chamar a ponte", async () => {
  let chamadas = 0;
  const adapter = createAgentJobAdapter({
    endpoint: "https://bridge.example",
    bearer: "b",
    fetchImpl: async () => { chamadas += 1; return { ok: true, status: 200, json: async () => okResult }; },
  });
  await assert.rejects(() => adapter.submit({ ...base, tenant_id: "" }), /tenant_id/);
  await assert.rejects(() => adapter.submit({ ...base, job_type: "NOPE" }), /job_type/);
  assert.equal(chamadas, 0);

  const ok = await adapter.submit(base);
  assert.equal(ok.status, "completed");
  assert.equal(chamadas, 1);
});
