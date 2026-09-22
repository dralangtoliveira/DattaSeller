import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { E2E_STEPS, REQUIRED_ENV, e2eHeaders, e2eLeadSlug, e2eProspectCandidate, e2eRunId, summarize, validateEnv } from "../lib/e2e/plan.js";
import { isSafeLeadSlug } from "../lib/hardening/guards.ts";
import { isPublicHttpUrl } from "../lib/prospector.js";

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

test("o template de ambiente nomeia todos os inputs do preflight sem autorizar envio", () => {
  const example = readFileSync(new URL("../.env.example", import.meta.url), "utf8");
  for (const key of REQUIRED_ENV) assert.match(example, new RegExp(`^${key}=`, "m"), `${key} precisa estar no template`);
  assert.match(example, /^DS_E2E_CONFIRM=$/m, "o template não pode pré-autorizar o envio");
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

test("o candidato do E2E carrega source_url pública exigida por /api/prospects", () => {
  const runId = e2eRunId("2026-09-19 01:30") ?? "run";
  const candidate = e2eProspectCandidate({ slug: e2eLeadSlug(runId), runId, emailTo: "controle@example.com" });
  assert.ok(isSafeLeadSlug(candidate.slug), "slug precisa passar na guarda da API");
  assert.ok(String(candidate.nome).trim(), "nome é obrigatório");
  assert.ok(isPublicHttpUrl(candidate.source_url), "source_url precisa ser HTTP(S) público — sem ela saveProspect devolve invalid_candidate");
  assert.ok(isPublicHttpUrl(candidate.site_antigo), "site_antigo precisa continuar válido para o preview/comparador");
  assert.equal(candidate.email, "controle@example.com");
  assert.ok(candidate.instagram_url);
  assert.ok(candidate.telefone);
  assert.ok(candidate.cidade);
});

test("o E2E alcança Preview protegido com o bypass oficial e nunca o registra", () => {
  const base = "https://preview.example.vercel.app";
  const semBypass = e2eHeaders({ base, cookie: "sb-x=1" });
  assert.equal(semBypass["x-vercel-protection-bypass"], undefined, "sem segredo não há header de bypass");
  assert.equal(semBypass.Cookie, "sb-x=1");
  assert.equal(semBypass.Origin, base);
  const comBypass = e2eHeaders({ base, cookie: "sb-x=1", bypass: "segredo-de-teste" });
  assert.equal(comBypass["x-vercel-protection-bypass"], "segredo-de-teste");
  const runner = readFileSync(new URL("../scripts/e2e-authenticated.mjs", import.meta.url), "utf8");
  assert.match(runner, /env\.DS_E2E_BYPASS/, "o runner precisa aceitar o bypass por variável de ambiente");
  assert.doesNotMatch(runner, /console\.log\([^)]*BYPASS/, "o segredo de bypass não pode ser impresso");
  assert.ok(!REQUIRED_ENV.includes("DS_E2E_BYPASS"), "o bypass é opcional (alvo não protegido continua válido)");
});

test("o runner do E2E exercita o envio pelo endpoint do CRM e o reload", () => {
  const script = readFileSync(new URL("../scripts/e2e-authenticated.mjs", import.meta.url), "utf8");
  assert.match(script, /signInWithPassword/);
  assert.match(script, /\/api\/emails\/\$\{state\.emailId\}\/transition/);
  assert.match(script, /sent_simulated/);
  assert.match(script, /\/api\/emails\/\$\{state\.emailId\}\/follow-up/);
  assert.match(script, /snapshot comercial preservado/);
  assert.doesNotMatch(script, /publicPrice \?\? 1500/);
  assert.match(script, /\/api\/contracts\/\$\{state\.contractId\}\/docx/);
  assert.match(script, /wordprocessingml/);
  assert.match(script, /\/api\/timeline/);
  assert.match(script, /process\.exit\(summary\.ok \? 0 : 1\)/);
  const packageJson = readFileSync(new URL("../package.json", import.meta.url), "utf8");
  assert.match(packageJson, /e2e:authenticated/);
  assert.match(packageJson, /e2e:preflight/);
  assert.match(script, /--preflight/);
});
