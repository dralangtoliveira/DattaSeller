#!/usr/bin/env node
// Diagnóstico único, sem revelar valores e sem mutar HML/Preview/caixa postal.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const local = {};
try { for (const line of readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/)) { const match = line.match(/^([A-Z0-9_]+)=(.*)$/); if (match && !process.env[match[1]]) local[match[1]] = match[2].trim(); } } catch { /* no local configuration */ }
const env = { ...local, ...process.env };
const present = key => Boolean(env[key]?.trim());
const file = path => existsSync(join(root, path));
const route = file("app/api/inbound/resend/route.ts") && file("lib/integrations/resend-reply-webhook.ts");
const hmlRef = env.DS_E2E_EXPECTED_SUPABASE_REF || env.SUPABASE_HML_REF;
const statuses = [];
function report(name, ok, missing) { const value = ok ? "READY" : `MISSING: ${missing}`; statuses.push(ok); console.log(`${name}: ${value}`); }

report("HML_ADMIN_ACCESS", present("SUPABASE_ACCESS_TOKEN"), "SUPABASE_ACCESS_TOKEN");
report("HML_DATABASE", (present("NEXT_PUBLIC_SUPABASE_URL") || present("SUPABASE_HML_URL")) && (present("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || present("SUPABASE_HML_PUBLISHABLE_KEY")) && Boolean(hmlRef), "NEXT_PUBLIC_SUPABASE_URL/SUPABASE_HML_URL, publishable key or DS_E2E_EXPECTED_SUPABASE_REF/SUPABASE_HML_REF");
report("HML_MIGRATION_PENDING", present("SUPABASE_ACCESS_TOKEN") && Boolean(hmlRef), "SUPABASE_ACCESS_TOKEN or DS_E2E_EXPECTED_SUPABASE_REF/SUPABASE_HML_REF (execute scripts/hml-commercial-replies.mjs check)");
report("PREVIEW_HML_BINDING", present("VERCEL_TOKEN") && present("DS_E2E_BASE_URL") && Boolean(hmlRef), "VERCEL_TOKEN, DS_E2E_BASE_URL or DS_E2E_EXPECTED_SUPABASE_REF/SUPABASE_HML_REF");
report("E2E_ADMIN", present("DS_E2E_EMAIL") && present("DS_E2E_PASSWORD"), "DS_E2E_EMAIL or DS_E2E_PASSWORD");
report("CONTROLLED_MAILBOX", present("DS_E2E_EMAIL_TO"), "DS_E2E_EMAIL_TO");
report("CONTROLLED_SENDER", present("DS_E2E_SENDER"), "DS_E2E_SENDER");
report("RESEND_WEBHOOK_SECRET", present("RESEND_WEBHOOK_SECRET"), "RESEND_WEBHOOK_SECRET");
report("RESEND_WEBHOOK_ROUTE", route && present("DS_E2E_BASE_URL"), route ? "DS_E2E_BASE_URL" : "webhook route source missing");
report("PUBLIC_PROPOSAL_URL", present("DS_E2E_BASE_URL"), "DS_E2E_BASE_URL");
report("E2E_RUNNER", file("scripts/e2e-authenticated.mjs") && present("DS_E2E_NICHE") && present("DS_E2E_CITY") && present("DS_E2E_EXPECTED_SUPABASE_REF"), "scripts/e2e-authenticated.mjs, DS_E2E_NICHE, DS_E2E_CITY or DS_E2E_EXPECTED_SUPABASE_REF");
console.log(`READY_FOR_DS07_11: ${statuses.every(Boolean) ? "READY" : "BLOCKED: satisfy every MISSING field above"}`);
process.exit(statuses.every(Boolean) ? 0 : 1);
