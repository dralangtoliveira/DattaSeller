import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { executeCleanup, maskId, planCleanup, summarizeCleanup, validateRunId } from "../lib/e2e/cleanup.js";

const repositoryRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const cli = join(repositoryRoot, "scripts", "e2e-cleanup.mjs");
const RUN = "run20260918abc";
const SLUG = `e2e-${RUN}`;

// Store em memória com dois runs, um lead de outro seller e um pedido pago.
function store({ paidOrder = false } = {}) {
  const rows = {
    ds_leads: [
      { slug: SLUG, status: "novo" },
      { slug: "e2e-outrorun0001", status: "novo" },
      { slug: "lead-real-cliente", status: "proposta" },
    ],
    ds_qualifications: [{ id: "q1", lead_slug: SLUG }, { id: "q2", lead_slug: "e2e-outrorun0001" }],
    ds_site_diagnoses: [{ id: "d1", lead_slug: SLUG }],
    ds_social_audits: [{ id: "s1", lead_slug: SLUG }],
    ds_previews: [{ id: "p1", lead_slug: SLUG }],
    ds_proposals: [{ id: "pr1", lead_slug: SLUG }],
    ds_emails: [{ id: "e1", lead_slug: SLUG }, { id: "e2", lead_slug: "lead-real-cliente" }],
    ds_followups: [{ id: "f1", lead_slug: SLUG }],
    ds_lead_events: [{ id: "le1", lead_slug: SLUG }],
    ds_orders: [{ id: "o1", lead_slug: SLUG, seller: "seller-e2e" }],
    ds_checkouts: [{ id: "c1", order_id: "o1" }],
    ds_payments: [{ id: "pay1", order_id: "o1", status: paidOrder ? "paid" : "pending" }],
    ds_contracts: [{ id: "ct1", order_id: "o1" }],
    ds_handoffs: [{ id: "h1", order_id: "o1" }],
    ds_commissions: [{ id: "cm1", order_id: "o1" }],
    ds_timeline: [{ id: "t1", lead_slug: SLUG }],
  };
  const deleted = [];
  return {
    deleted,
    findLead: async slug => rows.ds_leads.find(row => row.slug === slug) ?? null,
    listByLeadSlug: async (table, slug) => (rows[table] ?? []).filter(row => row.lead_slug === slug),
    listByOrderId: async (table, orderId) => (rows[table] ?? []).filter(row => row.order_id === orderId),
    deleteRow: async (table, id) => {
      const key = table === "ds_leads" ? "slug" : "id";
      const index = (rows[table] ?? []).findIndex(row => row[key] === id);
      if (index === -1) return { deleted: false };
      rows[table].splice(index, 1);
      deleted.push({ table, id });
      return { deleted: true };
    },
    rows,
  };
}

test("remove somente recursos do run e preserva auditoria por padrão", async () => {
  const memory = store();
  const plan = await planCleanup({ runId: RUN, store: memory });
  assert.equal(plan.ok, true);
  assert.equal(plan.slug, SLUG);
  const removed = plan.deletions.map(item => `${item.table}:${item.id}`);
  for (const expected of ["ds_qualifications:q1", "ds_site_diagnoses:d1", "ds_social_audits:s1", "ds_previews:p1", "ds_proposals:pr1", "ds_emails:e1", "ds_followups:f1", "ds_lead_events:le1", "ds_checkouts:c1", "ds_payments:pay1", "ds_contracts:ct1", "ds_handoffs:h1", "ds_commissions:cm1", "ds_orders:o1", `ds_leads:${SLUG}`]) {
    assert.ok(removed.includes(expected), `deveria remover ${expected}`);
  }
  assert.ok(!removed.includes("ds_timeline:t1"), "auditoria não sai por padrão");
  assert.deepEqual(plan.preserved, [{ table: "ds_timeline", reason: "audit_trail_preserved", count: 1 }]);
});

test("não toca outro lead, outro run nem dado de Production não marcado como E2E", async () => {
  const memory = store();
  const plan = await planCleanup({ runId: RUN, store: memory });
  const removed = plan.deletions.map(item => item.id);
  for (const intocado of ["q2", "e2", "lead-real-cliente"]) assert.ok(!removed.includes(intocado), `${intocado} não podia ser tocado`);
  await executeCleanup({ runId: RUN, store: memory, confirmedRunId: RUN });
  assert.equal(memory.rows.ds_leads.find(row => row.slug === "lead-real-cliente").status, "proposta");
  assert.equal(memory.rows.ds_emails.find(row => row.id === "e2").lead_slug, "lead-real-cliente");
  assert.equal(memory.rows.ds_qualifications.find(row => row.id === "q2").lead_slug, "e2e-outrorun0001");
});

test("replay do cleanup é idempotente e não amplia escopo", async () => {
  const memory = store();
  const first = await executeCleanup({ runId: RUN, store: memory, confirmedRunId: RUN });
  assert.equal(first.ok, true);
  assert.ok(first.deleted > 0);
  const second = await executeCleanup({ runId: RUN, store: memory, confirmedRunId: RUN });
  assert.equal(second.ok, true);
  assert.equal(second.deleted, 0, "replay não pode remover nada novo");
  const plan = await planCleanup({ runId: RUN, store: memory });
  assert.equal(plan.empty, true);
  assert.deepEqual(plan.deletions, []);
});

test("run-id inválido ou ausente falha fechado sem tocar em nada", async () => {
  for (const invalid of [undefined, "", "   ", "abc", "run"]) {
    assert.equal(validateRunId(invalid).ok, false);
    const plan = await planCleanup({ runId: invalid, store: store() });
    assert.equal(plan.ok, false);
    assert.deepEqual(plan.deletions, []);
  }
});

test("sem confirmação explícita o cleanup não muta", async () => {
  const memory = store();
  const refused = await executeCleanup({ runId: RUN, store: memory, confirmedRunId: "outro-run-123456" });
  assert.equal(refused.ok, false);
  assert.equal(refused.reason, "confirmation_required");
  assert.equal(refused.deleted, 0);
  assert.equal(memory.deleted.length, 0);
  const missing = await executeCleanup({ runId: RUN, store: memory });
  assert.equal(missing.reason, "confirmation_required");
  assert.equal(memory.deleted.length, 0);
});

test("pedido pago não é removido nem leva seus filhos", async () => {
  const memory = store({ paidOrder: true });
  const plan = await planCleanup({ runId: RUN, store: memory });
  assert.deepEqual(plan.blocked, [{ table: "ds_orders", id: "o1", reason: "paid_order_preserved", payment_status: "paid" }]);
  const removed = plan.deletions.map(item => item.id);
  for (const preservado of ["pay1", "o1", "ct1", "c1", "h1", "cm1"]) assert.ok(!removed.includes(preservado), `${preservado} pertencia ao pedido pago`);
  const outcome = await executeCleanup({ runId: RUN, store: memory, confirmedRunId: RUN });
  assert.equal(outcome.ok, true);
  assert.equal(memory.rows.ds_orders.length, 1, "pedido pago permanece");
  assert.equal(memory.rows.ds_payments.length, 1, "pagamento real permanece");
});

test("trilha de auditoria só sai com --purge-audit explícito", async () => {
  const memory = store();
  const outcome = await executeCleanup({ runId: RUN, store: memory, confirmedRunId: RUN, purgeAudit: true });
  assert.equal(outcome.ok, true);
  assert.ok(memory.deleted.some(item => item.table === "ds_timeline" && item.id === "t1"));
});

test("resumo sanitizado não expõe segredo nem id completo", async () => {
  const memory = store();
  const plan = await planCleanup({ runId: RUN, store: memory });
  const lines = summarizeCleanup({ ...plan, deleted: plan.deletions.length });
  const text = lines.join("\n");
  assert.ok(text.includes("remover ds_qualifications ***"), `resumo deveria mascarar o id: ${text}`);
  assert.ok(!text.includes(SLUG), "o slug completo não deve aparecer no resumo");
  assert.equal(maskId("curto"), "***");
});

test("CLI exige confirmação e falha fechado com run-id inválido, sem mutar nada", () => {
  const invalid = spawnSync(process.execPath, [cli, "--run-id=abc"], { encoding: "utf8", cwd: repositoryRoot });
  assert.equal(invalid.status, 2);
  assert.match(invalid.stderr, /cleanup recusado/);

  const noConfirm = spawnSync(process.execPath, [cli, `--run-id=${RUN}`, "--cleanup"], { encoding: "utf8", cwd: repositoryRoot });
  assert.equal(noConfirm.status, 2);
  assert.match(noConfirm.stderr, /confirmação obrigatória/);

  const wrongConfirm = spawnSync(process.execPath, [cli, `--run-id=${RUN}`, "--cleanup", "--confirm=outro-run-123456"], { encoding: "utf8", cwd: repositoryRoot });
  assert.equal(wrongConfirm.status, 2);
});

test("CLI sem credencial de servidor informa só os nomes e não inventa estado", () => {
  const result = spawnSync(process.execPath, [cli, `--run-id=${RUN}`], { encoding: "utf8", cwd: repositoryRoot, env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "", SUPABASE_SECRET_KEY: "" } });
  assert.equal(result.status, 3);
  assert.match(result.stderr, /NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY/);
  assert.ok(!/"sk|re_|eyJ/.test(result.stderr), "nenhum valor de credencial na saída");
});
