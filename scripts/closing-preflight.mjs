#!/usr/bin/env node
// Diagnóstico único, sem revelar valores e sem mutar HML/Preview/caixa postal.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
// Precedência explícita: o arquivo canônico do operador vence a variável de
// ambiente. Uma variável obsoleta exportada no processo não pode mascarar a
// configuração local e produzir falso 401 — o valor efetivo e a origem ficam
// identificáveis sem revelar nenhum segredo.
const local = {};
try { for (const line of readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/)) { const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/); if (match) local[match[1]] = match[2].trim(); } } catch { /* no local configuration */ }
const env = { ...process.env, ...local };
const sourced = (key) => (local[key] ? "arquivo" : env[key] ? "ambiente" : "ausente");
const shadowed = Object.keys(local).filter((key) => local[key] && process.env[key] !== undefined && process.env[key] !== local[key]).sort();
const present = key => Boolean(env[key]?.trim());
const file = path => existsSync(join(root, path));
const route = file("app/api/inbound/resend/route.ts") && file("lib/integrations/resend-reply-webhook.ts");
const hmlRef = env.DS_E2E_EXPECTED_SUPABASE_REF || env.SUPABASE_HML_REF;
const verifyHml = process.argv.includes("--verify-hml");
const statuses = [];
const verified = new Map();
if (verifyHml && present("SUPABASE_ACCESS_TOKEN") && hmlRef) {
  try {
    const headers = { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" };
    const project = await fetch(`https://api.supabase.com/v1/projects/${hmlRef}`, { headers });
    verified.set("admin", project.ok);
    const migration = await fetch(`https://api.supabase.com/v1/projects/${hmlRef}/database/query`, { method: "POST", headers, body: JSON.stringify({ query: "select count(*)::int as n from information_schema.columns where table_schema = 'public' and table_name = 'ds_emails' and column_name in ('reply_received_at','reply_provider_message_id','reply_body')" }) });
    const rows = migration.ok ? await migration.json() : [];
    verified.set("migration", migration.ok && Number(rows?.[0]?.n) === 3);
  } catch { verified.set("admin", false); verified.set("migration", false); }
}
function report(name, ok, missing) { const value = ok ? "READY" : `MISSING: ${missing}`; statuses.push(ok); console.log(`${name}: ${value}`); }

report("HML_ADMIN_ACCESS", present("SUPABASE_ACCESS_TOKEN") && (!verifyHml || verified.get("admin") === true), verifyHml ? "SUPABASE_ACCESS_TOKEN with HML administrative scope" : "SUPABASE_ACCESS_TOKEN");
report("HML_DATABASE", (present("NEXT_PUBLIC_SUPABASE_URL") || present("SUPABASE_HML_URL")) && (present("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || present("SUPABASE_HML_PUBLISHABLE_KEY")) && Boolean(hmlRef), "NEXT_PUBLIC_SUPABASE_URL/SUPABASE_HML_URL, publishable key or DS_E2E_EXPECTED_SUPABASE_REF/SUPABASE_HML_REF");
report("HML_MIGRATION_PENDING", present("SUPABASE_ACCESS_TOKEN") && Boolean(hmlRef) && (!verifyHml || verified.get("migration") === true), verifyHml ? "HML migration columns reply_received_at, reply_provider_message_id and reply_body" : "SUPABASE_ACCESS_TOKEN or DS_E2E_EXPECTED_SUPABASE_REF/SUPABASE_HML_REF (execute scripts/hml-commercial-replies.mjs check)");
const vercelAuth = present("VERCEL_TOKEN") || present("VERCEL_OIDC_TOKEN");
report("PREVIEW_HML_BINDING", vercelAuth && present("DS_E2E_BASE_URL") && Boolean(hmlRef), "VERCEL_TOKEN/VERCEL_OIDC_TOKEN, DS_E2E_BASE_URL or DS_E2E_EXPECTED_SUPABASE_REF/SUPABASE_HML_REF");
report("E2E_ADMIN", present("DS_E2E_EMAIL") && present("DS_E2E_PASSWORD"), "DS_E2E_EMAIL or DS_E2E_PASSWORD");
report("CONTROLLED_MAILBOX", present("DS_E2E_EMAIL_TO"), "DS_E2E_EMAIL_TO");
report("CONTROLLED_SENDER", present("DS_E2E_SENDER"), "DS_E2E_SENDER");
report("RESEND_WEBHOOK_SECRET", present("RESEND_WEBHOOK_SECRET"), "RESEND_WEBHOOK_SECRET");
report("RESEND_WEBHOOK_ROUTE", route && present("DS_E2E_BASE_URL"), route ? "DS_E2E_BASE_URL" : "webhook route source missing");
report("PUBLIC_PROPOSAL_URL", present("DS_E2E_BASE_URL"), "DS_E2E_BASE_URL");
report("E2E_RUNNER", file("scripts/e2e-authenticated.mjs") && present("DS_E2E_NICHE") && present("DS_E2E_CITY") && present("DS_E2E_EXPECTED_SUPABASE_REF"), "scripts/e2e-authenticated.mjs, DS_E2E_NICHE, DS_E2E_CITY or DS_E2E_EXPECTED_SUPABASE_REF");
// Informativo (não bloqueia DS-07..11): executor agêntico configurado no alvo.
console.log(`AGENT_EXECUTOR: ${present("DS_AGENT_ENDPOINT") && present("DS_AGENT_BEARER") ? "READY" : "MISSING: DS_AGENT_ENDPOINT or DS_AGENT_BEARER"}`);
// Origem da configuração: só nomes de variável e a origem, nunca o valor.
for (const key of ["SUPABASE_ACCESS_TOKEN", "DS_E2E_EXPECTED_SUPABASE_REF", "NEXT_PUBLIC_SUPABASE_URL", "RESEND_WEBHOOK_SECRET", "DS_AGENT_ENDPOINT", "DS_AGENT_BEARER"]) {
  console.log(`CONFIG_SOURCE: ${key}=${sourced(key)}`);
}
if (shadowed.length) console.log(`CONFIG_SHADOWED: ${shadowed.join(", ")} (arquivo local vence a variável de ambiente)`);
console.log(`READY_FOR_DS07_11: ${statuses.every(Boolean) ? "READY" : "BLOCKED: satisfy every MISSING field above"}`);
process.exit(statuses.every(Boolean) ? 0 : 1);
