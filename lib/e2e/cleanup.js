// Cleanup do E2E do Final Gate n. 4.
//
// Regras invioláveis:
//  - só reconhece registros do próprio run, pelo lead `e2e-<runId>`;
//  - nunca apaga dado de outro lead, de outro seller ou de Production;
//  - dry-run é o padrão; mutação exige `--cleanup --confirm=<runId>`;
//  - falha fechado (run-id inválido, escopo divergente, pedido pago);
//  - idempotente: repetir não quebra e nunca amplia o escopo;
//  - nunca imprime credencial;
//  - preserva trilha de auditoria por padrão.
import { e2eLeadSlug } from "./plan.js";

// Filhos por `lead_slug`, na ordem em que devem sair (folhas primeiro).
export const LEAD_SCOPED_TABLES = [
  { table: "ds_followups", key: "id" },
  { table: "ds_emails", key: "id" },
  { table: "ds_proposals", key: "id" },
  { table: "ds_previews", key: "id" },
  { table: "ds_social_audits", key: "id" },
  { table: "ds_site_diagnoses", key: "id" },
  { table: "ds_qualifications", key: "id" },
  { table: "ds_lead_events", key: "id" },
];

// Filhos por `order_id`, sempre ligados a um pedido do mesmo run.
export const ORDER_SCOPED_TABLES = [
  { table: "ds_checkouts", key: "id" },
  { table: "ds_payments", key: "id" },
  { table: "ds_contracts", key: "id" },
  { table: "ds_handoffs", key: "id" },
  { table: "ds_commissions", key: "id" },
];

// Nunca removida por cleanup de run: é trilha de auditoria/observabilidade.
export const AUDIT_TABLE = "ds_timeline";

// Estados que caracterizam dinheiro real: o cleanup não pode removê-los.
const PAID_PAYMENT_STATES = ["paid", "approved", "aprovado", "pago", "settled", "confirmed", "captured", "refunded"];

export function validateRunId(runId) {
  const raw = String(runId ?? "").trim();
  if (!raw) return { ok: false, reason: "missing_run_id" };
  const slug = e2eLeadSlug(raw);
  if (!/^[a-z0-9]{6,40}$/i.test(raw.replace(/[^a-z0-9]/gi, ""))) return { ok: false, reason: "invalid_run_id" };
  if (slug === "e2e-run") return { ok: false, reason: "invalid_run_id" };
  return { ok: true, runId: raw, slug };
}

export function maskId(value) {
  const text = String(value ?? "");
  if (text.length <= 8) return "***";
  return `${text.slice(0, 4)}***${text.slice(-4)}`;
}

/**
 * Monta o plano sem mutar nada. `store` é injetado para o plano ser testável sem
 * banco; o adaptador real fala com o PostgREST usando credencial de servidor.
 */
export async function planCleanup({ runId, store, purgeAudit = false }) {
  const check = validateRunId(runId);
  if (!check.ok) return { ok: false, reason: check.reason, deletions: [], blocked: [], preserved: [] };
  const { slug } = check;

  const lead = await store.findLead(slug);
  if (!lead) return { ok: true, runId: check.runId, slug, empty: true, deletions: [], blocked: [], preserved: [{ table: "ds_leads", reason: "run_not_present" }] };
  if (lead.slug !== slug) return { ok: false, reason: "scope_mismatch", deletions: [], blocked: [], preserved: [] };

  const deletions = [];
  const blocked = [];
  const preserved = [];

  for (const { table, key } of LEAD_SCOPED_TABLES) {
    const rows = await store.listByLeadSlug(table, slug);
    for (const row of rows) {
      if (String(row.lead_slug) !== slug) { blocked.push({ table, id: row[key], reason: "outside_run_scope" }); continue; }
      deletions.push({ table, id: row[key] });
    }
  }

  const orders = await store.listByLeadSlug("ds_orders", slug);
  for (const order of orders) {
    if (String(order.lead_slug) !== slug) { blocked.push({ table: "ds_orders", id: order.id, reason: "outside_run_scope" }); continue; }
    const payments = await store.listByOrderId("ds_payments", order.id);
    const paid = payments.find(payment => PAID_PAYMENT_STATES.includes(String(payment.status ?? "").toLowerCase()));
    if (paid) {
      // Pedido com dinheiro real permanece: nem o pedido nem seus filhos saem.
      blocked.push({ table: "ds_orders", id: order.id, reason: "paid_order_preserved", payment_status: String(paid.status) });
      continue;
    }
    for (const { table, key } of ORDER_SCOPED_TABLES) {
      const rows = await store.listByOrderId(table, order.id);
      for (const row of rows) deletions.push({ table, id: row[key] });
    }
    deletions.push({ table: "ds_orders", id: order.id });
  }

  const timeline = await store.listByLeadSlug(AUDIT_TABLE, slug);
  if (timeline.length) {
    if (purgeAudit) for (const row of timeline) deletions.push({ table: AUDIT_TABLE, id: row.id });
    else preserved.push({ table: AUDIT_TABLE, reason: "audit_trail_preserved", count: timeline.length });
  }
  deletions.push({ table: "ds_leads", id: slug });

  return { ok: true, runId: check.runId, slug, deletions, blocked, preserved };
}

export async function executeCleanup({ runId, store, purgeAudit = false, confirmedRunId }) {
  const check = validateRunId(runId);
  if (!check.ok) return { ok: false, reason: check.reason, deleted: 0 };
  if (String(confirmedRunId ?? "") !== check.runId) return { ok: false, reason: "confirmation_required", deleted: 0 };

  const plan = await planCleanup({ runId: check.runId, store, purgeAudit });
  if (!plan.ok) return { ok: false, reason: plan.reason, deleted: 0 };
  let deleted = 0;
  for (const item of plan.deletions) {
    const result = await store.deleteRow(item.table, item.id);
    if (result?.deleted) deleted += 1;
  }
  return { ok: true, runId: check.runId, slug: plan.slug, deleted, blocked: plan.blocked, preserved: plan.preserved };
}

/** Resumo sanitizado: só tabela, id mascarado e motivo. Nunca valores de dado. */
export function summarizeCleanup(outcome) {
  const lines = [];
  if (!outcome.ok) return [`cleanup: recusado (${outcome.reason})`];
  lines.push(`run: ${outcome.slug ? maskId(outcome.slug) : "-"}`);
  lines.push(`removidos: ${outcome.deleted ?? 0}`);
  for (const item of outcome.deletions ?? []) lines.push(`- remover ${item.table} ${maskId(item.id)}`);
  for (const item of outcome.blocked ?? []) lines.push(`- PRESERVADO ${item.table} ${maskId(item.id)} (${item.reason})`);
  for (const item of outcome.preserved ?? []) lines.push(`- preservado ${item.table} (${item.reason}${item.count ? `: ${item.count}` : ""})`);
  return lines;
}
