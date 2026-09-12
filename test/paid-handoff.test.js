import assert from "node:assert/strict";
import test from "node:test";
import { buildPaidHandoff, dispatchPaidHandoff } from "../src/integrations/paid-handoff.js";

const order = { id: "seller-order-1", paymentStatus: "paid", productId: "dattavps", planId: "agent-1", amount: 49, currency: "USD", correlationId: "corr-1", region: "ca-east" };
const customer = { id: "customer-1" };
const seller = { id: "seller-1" };

test("builds the required VPS payload and keeps its idempotency key", async () => {
  const handoff = buildPaidHandoff({ target: "dattavps", order, customer, seller, idempotencyKey: "payment-event-1" });
  assert.deepEqual(handoff.payload.region, "ca-east");
  const seen = [];
  const client = { post: async (request) => { seen.push(request); return { externalId: "dvps-order-1", status: "accepted" }; } };
  const first = await dispatchPaidHandoff({ handoff, client });
  const replay = await dispatchPaidHandoff({ handoff, client });
  assert.equal(first.externalReferenceId, "dvps-order-1");
  assert.equal(replay.idempotencyKey, "payment-event-1");
  assert.deepEqual(seen.map((request) => request.idempotencyKey), ["payment-event-1", "payment-event-1"]);
});

test("builds a DattaSeg handoff and records an explicit failed integration", async () => {
  const handoff = buildPaidHandoff({ target: "dattaseg", order: { ...order, productId: "dattaseg", requirements: { system: "n8n" } }, customer, seller, idempotencyKey: "payment-event-2" });
  assert.deepEqual(handoff.payload.requirements, { system: "n8n" });
  const result = await dispatchPaidHandoff({ handoff, client: { post: async () => { throw new Error("endpoint unavailable"); } } });
  assert.deepEqual(result, { status: "blocked", error: "endpoint unavailable", idempotencyKey: "payment-event-2" });
});
