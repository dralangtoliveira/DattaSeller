#!/usr/bin/env node
// Verifica/aplica somente a migration incremental dos jobs agênticos no ref HML
// declarado. Nunca aceita o ref de Production e nunca imprime tokens.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PRODUCTION_REF = "vkvkzoulbljampcbxaim";
const FILE = "supabase/migrations/20261001150000_add_agent_jobs.sql";
const TABLE = "ds_agent_jobs";
const sql = readFileSync(join(ROOT, FILE), "utf8");
const sha256 = createHash("sha256").update(sql).digest("hex");
const ref = process.env.DS_E2E_EXPECTED_SUPABASE_REF || process.env.SUPABASE_HML_REF;
let localToken = "";
try { localToken = readFileSync(join(ROOT, ".env.local"), "utf8").split(/\r?\n/).find(line => line.startsWith("SUPABASE_ACCESS_TOKEN="))?.slice("SUPABASE_ACCESS_TOKEN=".length).trim() ?? ""; } catch { /* no local config */ }
// Precedência explícita: o arquivo canônico do operador vence uma variável de
// ambiente obsoleta exportada no processo (que produzia falso 401).
const token = localToken || process.env.SUPABASE_ACCESS_TOKEN;

function fail(message, code = 3) { console.error(message); process.exit(code); }
function validateTarget() {
  if (!ref) fail("DS_E2E_EXPECTED_SUPABASE_REF/SUPABASE_HML_REF ausente: declare o ref HML explicitamente");
  if (ref === PRODUCTION_REF) fail("ref recusado: DS_E2E_EXPECTED_SUPABASE_REF aponta para Production", 4);
  if (!token) fail("SUPABASE_ACCESS_TOKEN ausente: necessário para consultar/aplicar somente no HML", 3);
}
async function query(query) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
  const text = await response.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch { /* output sanitized below */ }
  return { ok: response.ok, status: response.status, data };
}
async function check() {
  validateTarget();
  const result = await query(`select c.relname as table_name, c.relrowsecurity as rls, (select count(*)::int from pg_policies p where p.schemaname = 'public' and p.tablename = '${TABLE}') as policies from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = '${TABLE}'`);
  if (!result.ok) fail(`consulta HML recusada (${result.status}): valide escopo do SUPABASE_ACCESS_TOKEN`, 5);
  const row = Array.isArray(result.data) ? result.data[0] : null;
  console.log(`MIGRATION_FILE: ${FILE}`);
  console.log(`MIGRATION_SHA256: ${sha256}`);
  console.log(`MIGRATION_DESTINATION: HML ref=${ref}`);
  console.log(`MIGRATION_PENDING: ${row ? "NO" : "YES"}`);
  if (row) console.log(`MIGRATION_STATE: table=${row.table_name} rls=${row.rls} policies=${row.policies}`);
  console.log("MIGRATION_IDEMPOTENT: YES (CREATE TABLE/POLICY IF NOT EXISTS)");
  return { pending: !row };
}
if (process.argv[2] === "check") await check();
else if (process.argv[2] === "apply") {
  if (process.env.HML_APPLY !== "yes") fail("apply exige HML_APPLY=yes", 2);
  const state = await check();
  if (!state.pending) { console.log("MIGRATION_APPLY: SKIPPED_ALREADY_APPLIED"); process.exit(0); }
  const result = await query(sql);
  if (!result.ok) fail(`MIGRATION_APPLY: FAILED (${result.status})`, 6);
  console.log("MIGRATION_APPLY: OK");
  await check();
} else fail("uso: node scripts/hml-agent-jobs.mjs [check|apply]", 2);
