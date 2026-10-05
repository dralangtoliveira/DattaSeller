import test from "node:test";
import assert from "node:assert/strict";
import { createAgentJobAdapter, parseAgentJob, parseAgentResult } from "../lib/agent/job-interface.js";

const job = { job_id: "job_123", tenant_id: "hml_001", job_type: "ANALYZE_SOCIAL", input: { lead_slug: "lead-a" }, context: { lead: { slug: "lead-a" } }, requested_capabilities: ["public_browser"] };
test("AgentJob é neutro ao executor e falha fechado", () => {
  assert.equal(parseAgentJob(job).status, "queued");
  assert.throws(() => parseAgentJob({ ...job, tenant_id: "" }), /tenant_id/);
  assert.throws(() => parseAgentResult({ job_id: "other", status: "completed", structured_output: {} }, job.job_id), /não corresponde/);
});
test("adapter exige HTTPS, bearer e resultado estruturado correspondente", async () => {
  assert.equal(createAgentJobAdapter().configured, false);
  const adapter = createAgentJobAdapter({ endpoint: "https://hermes-hml.example", bearer: "server-only", fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ job_id: "job_123", status: "completed", structured_output: { artifact: "ok" }, evidence: [], artifacts: [], errors: [], timestamps: {} }) }) });
  assert.equal((await adapter.submit(job)).status, "completed");
});
