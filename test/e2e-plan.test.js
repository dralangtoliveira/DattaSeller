import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { E2E_STEPS, REQUIRED_ENV, e2eLeadSlug, summarize, validateEnv } from "../lib/e2e/plan.js";

const valid = { DS_E2E_BASE_URL: "https://crm.example.com", DS_E2E_EMAIL: "operador@example.com", DS_E2E_PASSWORD: "segredo", NEXT_PUBLIC_SUPABASE_URL: "https://projeto.supabase.co", DS_E2E_EXPECTED_SUPABASE_REF: "projeto", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "chave-publica", DS_E2E_EMAIL_TO: "controle@example.com", DS_E2E_CONFIRM: "yes" };

test("o E2E falha fechado quando o ambiente está incompleto ou sem confirmação", () => {
  const empty = validateEnv({});
  assert.equal(empty.ok, false);
  assert.deepEqual(empty.missing, REQUIRED_ENV);
  assert.equal(validateEnv({ ...valid, DS_E2E_CONFIRM: "no" }).ok, false);
  assert.deepEqual(validateEnv({ ...valid, DS_E2E_CONFIRM: "no" }).invalid, ["DS_E2E_CONFIRM"]);
  assert.equal(validateEnv({ ...valid, DS_E2E_BASE_URL: "file:///etc/passwd" }).ok, false);
  assert.equal(validateEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "não-é-url" }).ok, false);
  assert.equal(validateEnv({ ...valid, DS_E2E_EMAIL: "operador@dominio.invalid" }).ok, false);
  assert.equal(validateEnv({ ...valid, DS_E2E_EMAIL_TO: "sem-arroba" }).ok, false);
  assert.equal(validateEnv(valid).ok, true);
});

test("a cadeia do E2E é a ordem registrada e não perde nenhum passo", () => {
  assert.deepEqual(E2E_STEPS.map((step) => step.id), ["auth", "prospect", "dedup", "qualification", "diagnosis", "social", "preview", "editor", "comparator", "proposal", "negotiation", "cover", "email_draft", "email_edit", "email_approve", "email_send", "email_followup", "email_timeline", "order", "checkout", "payment", "contract", "contract_html", "contract_docx", "handoff", "financial", "reload"]);
  for (const step of E2E_STEPS) assert.ok(step.label && step.endpoint, `${step.id} precisa de rótulo e endpoint`);
});

test("o resumo só fica verde sem falha e sem bloqueio", () => {
  assert.equal(summarize([{ status: "pass" }, { status: "pass" }]).ok, true);
  assert.equal(summarize([{ status: "pass" }, { status: "fail" }]).ok, false);
  assert.equal(summarize([{ status: "pass" }, { status: "blocked" }]).ok, false);
  assert.deepEqual(summarize([{ status: "pass" }, { status: "skip" }]).skipped, 1);
  assert.equal(summarize([]).total, 0);
});

test("o slug do lead E2E é seguro para a API", () => {
  assert.equal(e2eLeadSlug("20260917T120000"), "e2e-20260917t120000");
  assert.match(e2eLeadSlug("2026-09-17 12:00"), /^e2e-[a-z0-9]+$/);
  assert.equal(e2eLeadSlug(""), "e2e-run");
  assert.ok(e2eLeadSlug("x".repeat(200)).length <= 60);
});

test("o runner do E2E exercita o envio pelo endpoint do CRM e o reload", () => {
  const script = readFileSync(new URL("../scripts/e2e-authenticated.mjs", import.meta.url), "utf8");
  assert.match(script, /signInWithPassword/);
  assert.match(script, /\/api\/emails\/\$\{state\.emailId\}\/transition/);
  assert.match(script, /sent_simulated/);
  assert.match(script, /\/api\/emails\/\$\{state\.emailId\}\/follow-up/);
  assert.match(script, /negotiated_price_above_public_price/);
  assert.match(script, /\/api\/contracts\/\$\{state\.contractId\}\/docx/);
  assert.match(script, /wordprocessingml/);
  assert.match(script, /\/api\/timeline/);
  assert.match(script, /process\.exit\(summary\.ok \? 0 : 1\)/);
  const packageJson = readFileSync(new URL("../package.json", import.meta.url), "utf8");
  assert.match(packageJson, /e2e:authenticated/);
});
