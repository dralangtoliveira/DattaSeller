import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const script = readFileSync(join(root, "scripts", "hml-agent-jobs.mjs"), "utf8");
const migration = readFileSync(join(root, "supabase", "migrations", "20261001150000_add_agent_jobs.sql"), "utf8");
const packageJson = readFileSync(join(root, "package.json"), "utf8");

test("migration dos jobs agênticos é idempotente, isolada e protegida por RLS", () => {
  assert.match(migration, /create table if not exists public\.ds_agent_jobs/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /create policy "admins manage ds_agent_jobs"/i);
  assert.match(migration, /primary key \(tenant_id, id\)/i);
  assert.match(migration, /job_type in \('BUILD_REDESIGN', 'ANALYZE_SOCIAL', 'BUILD_SOCIAL_DEMO'\)/i);
  assert.match(migration, /status in \('queued', 'running', 'completed', 'failed'\)/i);
  assert.equal(/drop table|truncate|delete from/i.test(migration), false);
});

test("script HML recusa Production e nunca imprime token", () => {
  assert.match(script, /const PRODUCTION_REF = "vkvkzoulbljampcbxaim"/);
  assert.match(script, /ref === PRODUCTION_REF/);
  assert.match(script, /apply exige HML_APPLY=yes/);
  // O token pode existir no corpo da requisição, nunca numa linha impressa.
  const linhasImpressas = script.split("\n").filter((linha) => /console\.(log|error)/.test(linha));
  assert.ok(linhasImpressas.length > 0);
  assert.equal(linhasImpressas.some((linha) => /\btoken\b/i.test(linha)), false);
});

test("scripts npm de verificação/aplicação do HML estão publicados", () => {
  assert.match(packageJson, /"hml:agent-jobs:check": "node scripts\/hml-agent-jobs\.mjs check"/);
  assert.match(packageJson, /"hml:agent-jobs:apply": "node scripts\/hml-agent-jobs\.mjs apply"/);
  assert.match(packageJson, /"closing:preflight": "node scripts\/closing-preflight\.mjs --verify-hml"/);
});

test("preflight define precedência explícita do arquivo do operador", () => {
  const preflight = readFileSync(join(root, "scripts", "closing-preflight.mjs"), "utf8");
  assert.match(preflight, /const env = \{ \.\.\.process\.env, \.\.\.local \}/);
  assert.match(preflight, /CONFIG_SHADOWED/);
  assert.match(preflight, /CONFIG_SOURCE/);
});
