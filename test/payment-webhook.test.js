import assert from "node:assert/strict";
import test from "node:test";
import { receivePaymentWebhook, signPaymentPayload } from "../src/payments/webhook.js";

class MemoryPaymentStore {
  constructor() { this.events = new Map(); this.orders = new Map([["DS-1", { id: "order-1", targetProductKey: "dattavps", status: "pending" }]]); this.payments = []; this.sales = []; this.deliveries = []; this.reconciliation = []; }
  async transaction(action) { return action(this); }
  async findEvent(id) { return this.events.get(id); }
  async saveEvent(event) { this.events.set(event.id, event); }
  async findOrderByReference(reference) { return this.orders.get(reference); }
  async flagReconciliation(item) { this.reconciliation.push(item); }
  async recordPayment(payment) { const record = { ...payment, id: `payment-${this.payments.length + 1}` }; this.payments.push(record); return record; }
  async markOrderPaid(id) { for (const order of this.orders.values()) if (order.id === id) order.status = "paid"; }
  async createSaleIfMissing({ orderId, paymentId }) { let sale = this.sales.find((candidate) => candidate.orderId === orderId); if (!sale) { sale = { id: `sale-${this.sales.length + 1}`, orderId, paymentId }; this.sales.push(sale); } return sale; }
  async createDeliveryIfMissing(delivery) { if (!this.deliveries.find((candidate) => candidate.orderId === delivery.orderId)) this.deliveries.push(delivery); }
}

const secret = "test-secret";
function payload(event) { return JSON.stringify(event); }

test("confirms a paid order once and creates one sale and delivery", async () => {
  const store = new MemoryPaymentStore();
  const body = payload({ id: "event-1", provider: "test", external_payment_id: "payment-external-1", order_reference: "DS-1", status: "paid", amount: 49, currency: "USD" });
  const first = await receivePaymentWebhook({ payload: body, signature: signPaymentPayload(body, secret), secret, store });
  const replay = await receivePaymentWebhook({ payload: body, signature: signPaymentPayload(body, secret), secret, store });
  assert.equal(first.status, 202);
  assert.equal(replay.replayed, true);
  assert.equal(store.payments.length, 1);
  assert.equal(store.sales.length, 1);
  assert.equal(store.deliveries.length, 1);
});

test("rejects unauthenticated events and routes unknown orders to reconciliation", async () => {
  const store = new MemoryPaymentStore();
  const body = payload({ id: "event-2", provider: "test", external_payment_id: "payment-external-2", order_reference: "unknown", status: "paid", amount: 49, currency: "USD" });
  assert.equal((await receivePaymentWebhook({ payload: body, signature: "bad", secret, store })).status, 401);
  const result = await receivePaymentWebhook({ payload: body, signature: signPaymentPayload(body, secret), secret, store });
  assert.equal(result.reconciliationRequired, true);
  assert.deepEqual(store.reconciliation, [{ eventId: "event-2", reason: "order_not_found" }]);
});
