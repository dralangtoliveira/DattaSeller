import assert from "node:assert/strict";
import test from "node:test";
import { handleDatta360Webhook, signDatta360Payload } from "../lib/integrations/datta360-webhook.ts";

const secret = "test-secret-that-must-not-appear-in-logs";
const body = JSON.stringify({ nome: "Teste Integração", empresa: "Empresa Teste", email: "teste@example.invalid", telefone: "5511999990000" });

class MemorySupabase {
  constructor({ eventError = null, leadError = null, timelineError = null } = {}) {
    this.eventError = eventError;
    this.leadError = leadError;
    this.timelineError = timelineError;
    this.calls = [];
  }

  from(table) {
    return {
      insert: async (value) => {
        this.calls.push({ operation: "insert", table, value });
        return table === "ds_inbound_events" ? { error: this.eventError } : { error: this.timelineError };
      },
      upsert: async (value) => {
        this.calls.push({ operation: "upsert", table, value });
        return { error: this.leadError };
      },
      update: (value) => ({
        eq: async (column, match) => {
          this.calls.push({ operation: "update", table, value, column, match });
          return { error: null };
        },
      }),
    };
  }
}

function options(overrides = {}) {
  return {
    raw: body,
    signature: `sha256=${signDatta360Payload(body, secret)}`,
    requestId: "req-test-1",
    secret,
    supabase: new MemorySupabase(),
    idGenerator: () => "fixed-id",
    now: () => "2026-09-14T14:00:00.000Z",
    ...overrides,
  };
}

test("accepts a valid signed lead and persists the event, lead, and timeline", async () => {
  const store = new MemorySupabase();
  const result = await handleDatta360Webhook(options({ supabase: store }));
  assert.equal(result.status, 201);
  assert.equal((await result.json()).ok, true);
  assert.deepEqual(store.calls.map(({ operation, table }) => `${operation}:${table}`), [
    "insert:ds_inbound_events", "upsert:ds_leads", "update:ds_inbound_events", "insert:ds_timeline",
  ]);
});

test("rejects missing and invalid signatures before touching storage", async () => {
  for (const signature of [null, "sha256=bad"]) {
    const store = new MemorySupabase();
    const result = await handleDatta360Webhook(options({ signature, supabase: store }));
    assert.equal(result.status, 401);
    assert.equal(store.calls.length, 0);
  }
});

test("rejects invalid JSON and incomplete contact payloads", async () => {
  const invalidJson = await handleDatta360Webhook(options({ raw: "{", signature: `sha256=${signDatta360Payload("{", secret)}` }));
  assert.equal(invalidJson.status, 400);
  const incomplete = JSON.stringify({ nome: "Sem contato" });
  const missingContact = await handleDatta360Webhook(options({ raw: incomplete, signature: `sha256=${signDatta360Payload(incomplete, secret)}` }));
  assert.equal(missingContact.status, 422);
});

test("returns a sanitized 503 when persistence fails", async () => {
  const logs = [];
  const result = await handleDatta360Webhook(options({
    supabase: new MemorySupabase({ eventError: { code: "42501", message: secret } }),
    log: (entry) => logs.push(entry),
  }));
  assert.equal(result.status, 503);
  assert.deepEqual(await result.json(), { error: "storage_unavailable", request_id: "req-test-1" });
  assert.equal(JSON.stringify(logs).includes(secret), false);
  assert.equal(JSON.stringify(logs).includes("teste@example.invalid"), false);
});

test("treats a duplicate request id as idempotent", async () => {
  const store = new MemorySupabase({ eventError: { code: "23505", message: "duplicate request id" } });
  const result = await handleDatta360Webhook(options({ supabase: store }));
  assert.equal(result.status, 200);
  assert.equal((await result.json()).duplicate, true);
  assert.equal(store.calls.some(({ operation }) => operation === "upsert"), false);
});
