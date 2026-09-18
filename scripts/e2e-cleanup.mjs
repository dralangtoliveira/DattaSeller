#!/usr/bin/env node
// Cleanup explícito dos recursos criados por um run do E2E do Final Gate n. 4.
//
//   node scripts/e2e-cleanup.mjs --run-id=<id>                        # dry-run (padrão)
//   node scripts/e2e-cleanup.mjs --run-id=<id> --cleanup --confirm=<id>
//   node scripts/e2e-cleanup.mjs --run-id=<id> --cleanup --confirm=<id> --purge-audit
//
// Nada é removido sem `--cleanup` E `--confirm` igual ao run id. Sem credencial
// de servidor o script não inventa estado: sai com `missing_credentials` e
// informa apenas os NOMES das variáveis necessárias.
import { executeCleanup, planCleanup, summarizeCleanup, validateRunId } from "../lib/e2e/cleanup.js";
import { pathToFileURL } from "node:url";

const REQUIRED_SERVER_ENV = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY"];

function parseFlags(argv) {
  const flags = { runId: null, cleanup: false, confirm: null, purgeAudit: false };
  for (const argument of argv) {
    if (argument.startsWith("--run-id=")) flags.runId = argument.slice("--run-id=".length);
    else if (argument === "--cleanup") flags.cleanup = true;
    else if (argument.startsWith("--confirm=")) flags.confirm = argument.slice("--confirm=".length);
    else if (argument === "--purge-audit") flags.purgeAudit = true;
    else if (!argument.startsWith("--") && !flags.runId) flags.runId = argument;
  }
  return flags;
}

export function createSupabaseStore({ url, secretKey, fetchImpl = fetch }) {
  const base = String(url).replace(/\/+$/, "");
  const headers = { apikey: secretKey, Authorization: `Bearer ${secretKey}`, Accept: "application/json" };
  const list = async (table, filters) => {
    const query = new URLSearchParams({ select: "id,lead_slug,status", limit: "1000" });
    for (const [key, value] of Object.entries(filters)) query.set(key, value);
    const response = await fetchImpl(`${base}/rest/v1/${table}?${query}`, { headers, cache: "no-store" });
    if (!response.ok) throw new Error(`cleanup_list_failed:${table}:${response.status}`);
    return response.json();
  };
  return {
    findLead: async slug => (await list("ds_leads", { slug: `eq.${slug}` }))[0] ?? null,
    listByLeadSlug: (table, slug) => list(table, { lead_slug: `eq.${slug}` }),
    listByOrderId: (table, orderId) => list(table, { order_id: `eq.${orderId}` }),
    deleteRow: async (table, id) => {
      const filter = table === "ds_leads" ? `slug=eq.${encodeURIComponent(id)}` : `id=eq.${encodeURIComponent(id)}`;
      const response = await fetchImpl(`${base}/rest/v1/${table}?${filter}`, { method: "DELETE", headers: { ...headers, Prefer: "return=representation" }, cache: "no-store" });
      if (!response.ok) throw new Error(`cleanup_delete_failed:${table}:${response.status}`);
      return { deleted: (await response.json()).length > 0 };
    },
  };
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const check = validateRunId(flags.runId);
  if (!check.ok) {
    console.error(`cleanup recusado: ${check.reason}. Informe --run-id=<id> do run do E2E.`);
    process.exit(2);
  }
  if (flags.cleanup && flags.confirm !== check.runId) {
    console.error("cleanup recusado: confirmação obrigatória. Use --cleanup --confirm=<run-id> exatamente igual ao run id.");
    process.exit(2);
  }

  const missing = REQUIRED_SERVER_ENV.filter(name => !String(process.env[name] ?? "").trim());
  if (missing.length) {
    console.error(`cleanup indisponível: variáveis de servidor ausentes (somente nomes): ${missing.join(", ")}.`);
    process.exit(3);
  }

  const store = createSupabaseStore({ url: process.env.NEXT_PUBLIC_SUPABASE_URL, secretKey: process.env.SUPABASE_SECRET_KEY });
  if (!flags.cleanup) {
    const plan = await planCleanup({ runId: check.runId, store, purgeAudit: flags.purgeAudit });
    console.log("[dry-run] nada será removido sem --cleanup --confirm=<run-id>");
    for (const line of summarizeCleanup(plan)) console.log(line);
    process.exit(plan.ok ? 0 : 2);
  }

  const outcome = await executeCleanup({ runId: check.runId, store, purgeAudit: flags.purgeAudit, confirmedRunId: flags.confirm });
  for (const line of summarizeCleanup(outcome)) console.log(line);
  process.exit(outcome.ok ? 0 : 2);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(`cleanup falhou: ${error instanceof Error ? error.message : "erro inesperado"}`);
    process.exit(1);
  });
}
