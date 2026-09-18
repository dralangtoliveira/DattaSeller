import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DECLARED_REF_ENV,
  PRODUCTION_HOSTS,
  PRODUCTION_SUPABASE_REF,
  assertIsolatedTarget,
  formatGuardReport,
  guardE2eTarget,
  hostFromUrl,
  isProductionRef,
  supabaseRefFromUrl,
} from "../lib/e2e/target-guard.js";
import { REQUIRED_ENV, e2eRunId } from "../lib/e2e/plan.js";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const HML_REF = "hmlisolado123456";
const isolated = {
  NEXT_PUBLIC_SUPABASE_URL: `https://${HML_REF}.supabase.co`,
  [DECLARED_REF_ENV]: HML_REF,
  DS_E2E_BASE_URL: "https://v0-project-abc.vercel.app",
};
const codes = (result) => result.blockers.map((blocker) => blocker.code);

test("a guarda aceita apenas alvo declarado e isolado de Production", () => {
  const result = guardE2eTarget(isolated);
  assert.equal(result.ok, true);
  assert.deepEqual(codes(result), []);
  assert.equal(result.target.ref, HML_REF);
  assert.equal(result.target.host, "v0-project-abc.vercel.app");
  assert.equal(result.target.production, false);
});

test("a guarda recusa o banco de Production mesmo com o ref declarado", () => {
  const result = guardE2eTarget({
    ...isolated,
    NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_SUPABASE_REF}.supabase.co`,
    [DECLARED_REF_ENV]: PRODUCTION_SUPABASE_REF,
  });
  assert.equal(result.ok, false);
  assert.deepEqual(codes(result), ["production_database", "declared_ref_is_production"]);
});

test("a guarda exige declaração explícita e coincidente do ref esperado", () => {
  const missing = guardE2eTarget({ ...isolated, [DECLARED_REF_ENV]: "" });
  assert.equal(missing.ok, false);
  assert.deepEqual(codes(missing), ["missing_declared_ref"]);
  const mismatch = guardE2eTarget({ ...isolated, [DECLARED_REF_ENV]: "outroprojeto123" });
  assert.equal(mismatch.ok, false);
  assert.deepEqual(codes(mismatch), ["declared_ref_mismatch"]);
});

test("a guarda recusa domínio de Production e URLs inválidas", () => {
  const host = guardE2eTarget({ ...isolated, DS_E2E_BASE_URL: `https://${PRODUCTION_HOSTS[0]}/crm` });
  assert.equal(host.ok, false);
  assert.deepEqual(codes(host), ["production_host"]);
  const badUrl = guardE2eTarget({ ...isolated, NEXT_PUBLIC_SUPABASE_URL: "não-é-url", DS_E2E_BASE_URL: "file:///etc/passwd" });
  assert.equal(badUrl.ok, false);
  assert.deepEqual(codes(badUrl).sort(), ["unparsable_base_url", "unparsable_supabase_url"]);
  const absent = guardE2eTarget({});
  assert.equal(absent.ok, false);
  assert.deepEqual(codes(absent).sort(), ["missing_base_url", "missing_declared_ref", "missing_supabase_url"]);
});

test("sem exigir base URL, a guarda ainda recusa Production e aceita HML", () => {
  const semBase = guardE2eTarget({ ...isolated, DS_E2E_BASE_URL: "" }, { requireBaseUrl: false });
  assert.equal(semBase.ok, true);
  assert.deepEqual(codes(semBase), []);
  const comBaseProducao = guardE2eTarget({ ...isolated, DS_E2E_BASE_URL: `https://${PRODUCTION_HOSTS[1]}/` }, { requireBaseUrl: false });
  assert.equal(comBaseProducao.ok, false);
  assert.deepEqual(codes(comBaseProducao), ["production_host"]);
});

test("a guarda avisa quando o host não é Preview da Vercel e quando há chave de servidor", () => {
  const result = guardE2eTarget({ ...isolated, DS_E2E_BASE_URL: "https://hml.dattaseller.test", SUPABASE_SECRET_KEY: "valor-secreto-nunca-impresso" });
  assert.equal(result.ok, true);
  assert.deepEqual(result.notes.map((note) => note.code), ["base_url_not_vercel_preview", "server_key_present"]);
});

test("o relatório da guarda nunca imprime valor de segredo", () => {
  const secret = "sb_secret_de_teste_nao_pode_vazar";
  const lines = formatGuardReport(guardE2eTarget({ ...isolated, SUPABASE_SECRET_KEY: secret, DS_E2E_BASE_URL: `https://${PRODUCTION_HOSTS[1]}/` }));
  const text = lines.join("\n");
  assert.ok(!text.includes(secret), "nenhum valor de credencial no relatório");
  assert.match(text, /bloqueio \[production_host\]/);
  assert.match(text, /isolamento: RECUSADO/);
});

test("assertIsolatedTarget lança com blockers quando o alvo não é isolado", () => {
  assert.doesNotThrow(() => assertIsolatedTarget(isolated));
  try {
    assertIsolatedTarget({ ...isolated, NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_SUPABASE_REF}.supabase.co` });
    assert.fail("deveria lançar para alvo de Production");
  } catch (error) {
    assert.equal(error.message, "e2e_target_not_isolated");
    assert.ok(error.blockers.length > 0);
  }
});

test("os parsers da guarda são previsíveis", () => {
  assert.equal(supabaseRefFromUrl("https://abc123def.supabase.co"), "abc123def");
  assert.equal(supabaseRefFromUrl("https://abc123def.supabase.in"), "abc123def");
  assert.equal(supabaseRefFromUrl("https://crm.datta360.com.br"), null);
  assert.equal(supabaseRefFromUrl("não-é-url"), null);
  assert.equal(hostFromUrl("https://CRM.Datta360.com.br/x"), "crm.datta360.com.br");
  assert.equal(isProductionRef(PRODUCTION_SUPABASE_REF.toUpperCase()), true);
  assert.equal(isProductionRef("outroprojeto"), false);
});

test("o run id do E2E é sanitizado e o plano exige o ref declarado", () => {
  assert.equal(e2eRunId("2026-09-18T21:30"), "20260918t2130");
  assert.equal(e2eRunId(""), null);
  assert.equal(e2eRunId(undefined), null);
  assert.ok(REQUIRED_ENV.includes(DECLARED_REF_ENV), "o ref esperado precisa ser exigido pelo plano");
});

test("o runner e o cleanup consultam a guarda antes de agir", () => {
  const runner = readFileSync(new URL("../scripts/e2e-authenticated.mjs", import.meta.url), "utf8");
  assert.match(runner, /guardE2eTarget/);
  assert.match(runner, /process\.exit\(4\)/);
  const cleanup = readFileSync(new URL("../scripts/e2e-cleanup.mjs", import.meta.url), "utf8");
  assert.match(cleanup, /guardE2eTarget/);
  assert.match(cleanup, /process\.exit\(4\)/);
});

test("o cleanup recusa alvo sem ref declarado antes de qualquer chamada", () => {
  const cli = join(repositoryRoot, "scripts", "e2e-cleanup.mjs");
  const result = spawnSync(process.execPath, [cli, "--run-id=20260918t2130"], {
    encoding: "utf8",
    cwd: repositoryRoot,
    env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: `https://${HML_REF}.supabase.co`, SUPABASE_SECRET_KEY: "chave-de-teste", [DECLARED_REF_ENV]: "" },
  });
  assert.equal(result.status, 4);
  assert.match(result.stderr, /missing_declared_ref/);
  assert.match(result.stderr, /cleanup abortado/);
  assert.ok(!result.stderr.includes("chave-de-teste"), "nenhum valor de credencial na saída");
});