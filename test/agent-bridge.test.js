import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.DS_DATA_DIR = mkdtempSync(join(tmpdir(), "ds-agent-bridge-"));
process.env.DS_ALLOWED_TENANTS = "hml_001";

const { parseAgentJob, extractJson } = await import(
  "../services/dattaseller-agent-bridge/bridge.mjs"
);

const JOB = {
  job_id: "job_123",
  tenant_id: "hml_001",
  job_type: "ANALYZE_SOCIAL",
  input: { lead_slug: "lead-a" },
  context: { lead: { slug: "lead-a" } },
  requested_capabilities: ["structured_reasoning"],
};

test("parseAgentJob aceita o job do tenant autorizado e normaliza o estado", () => {
  const parsed = parseAgentJob(JOB);
  assert.equal(parsed.error, undefined);
  assert.equal(parsed.job.status, "queued");
  assert.equal(parsed.job.tenant_id, "hml_001");
  assert.deepEqual(parsed.job.requested_capabilities, ["structured_reasoning"]);
});

test("parseAgentJob falha fechado em job_id, tenant, tipo e entrada", () => {
  assert.equal(parseAgentJob({ ...JOB, job_id: "x" }).error, "agent_job_id_invalid");
  assert.equal(parseAgentJob({ ...JOB, tenant_id: "" }).error, "agent_tenant_invalid");
  assert.equal(parseAgentJob({ ...JOB, tenant_id: "tenant_x" }).error, "agent_tenant_not_allowed");
  assert.equal(parseAgentJob({ ...JOB, job_type: "DELETE_EVERYTHING" }).error, "agent_job_type_invalid");
  assert.equal(parseAgentJob({ ...JOB, input: [] }).error, "agent_input_invalid");
  assert.equal(parseAgentJob({ ...JOB, context: null }).error, "agent_context_invalid");
  assert.equal(parseAgentJob(null).error, "agent_job_invalid");
});

test("parseAgentJob limita capabilities e não aceita tipos não declarados", () => {
  const parsed = parseAgentJob({
    ...JOB,
    requested_capabilities: Array.from({ length: 40 }, (_, i) => `cap-${i}`),
  });
  assert.equal(parsed.job.requested_capabilities.length, 20);
  for (const type of ["BUILD_REDESIGN", "ANALYZE_SOCIAL", "BUILD_SOCIAL_DEMO"]) {
    assert.equal(parseAgentJob({ ...JOB, job_type: type }).error, undefined);
  }
});

test("extractJson aceita JSON puro, com cerca markdown e embutido em texto", () => {
  assert.deepEqual(extractJson('{"structured_output":{"a":1}}'), { structured_output: { a: 1 } });
  assert.deepEqual(extractJson('```json\n{"structured_output":{"b":2}}\n```'), { structured_output: { b: 2 } });
  assert.deepEqual(
    extractJson('Segue o resultado: {"structured_output":{"c":3}} fim'),
    { structured_output: { c: 3 } },
  );
});

test("extractJson devolve null em saída não estruturada (fail-closed)", () => {
  assert.equal(extractJson("desculpe, nao consegui"), null);
  assert.equal(extractJson("[1,2,3]"), null);
  assert.equal(extractJson(""), null);
});
