#!/usr/bin/env node
// Verifica/aplica somente a migration incremental de respostas comerciais no
// ref HML declarado. Nunca aceita o ref de Production e nunca imprime tokens.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PRODUCTION_REF = "vkvkzoulbljampcbxaim";
const FILE = "supabase/migrations/20260929140724_add_commercial_email_replies.sql";
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
  const result = await query("select column_name from information_schema.columns where table_schema = 'public' and table_name = 'ds_emails' and column_name in ('reply_received_at','reply_provider_message_id','reply_body') order by column_name");
  if (!result.ok) fail(`consulta HML recusada (${result.status}): valide escopo do SUPABASE_ACCESS_TOKEN`, 5);
  const columns = Array.isArray(result.data) ? result.data.map(row => row.column_name) : [];
  const pending = ["reply_received_at", "reply_provider_message_id", "reply_body"].filter(column => !columns.includes(column));
  console.log(`MIGRATION_FILE: ${FILE}`);
  console.log(`MIGRATION_SHA256: ${sha256}`);
  console.log(`MIGRATION_DESTINATION: HML ref=${ref}`);
  console.log(`MIGRATION_PENDING: ${pending.length ? `YES (${pending.join(",")})` : "NO"}`);
  console.log("MIGRATION_IDEMPOTENT: YES (ADD COLUMN/CREATE INDEX IF NOT EXISTS)");
  console.log("MIGRATION_ROLLBACK: não destrutivo; rollback manual exigiria remover colunas/índice após revisão");
  return { pending: pending.length > 0 };
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
} else fail("uso: node scripts/hml-commercial-replies.mjs [check|apply]", 2);
