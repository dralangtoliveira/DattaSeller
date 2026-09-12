import assert from "node:assert/strict";
import test from "node:test";
import { canAdvanceCommercialOpportunity, createDeliveryOrder, transitionDelivery } from "../src/delivery/state-machine.js";

test("keeps delivery separate from the commercial stage", () => {
  const delivery = createDeliveryOrder({ orderId: "order-1", targetProductKey: "dattavps", paymentStatus: "pending" });
  assert.equal(delivery.status, "awaiting_payment");
  assert.equal(canAdvanceCommercialOpportunity("paid", "pending"), false);
  assert.equal(canAdvanceCommercialOpportunity("paid", "paid"), true);
});

test("tracks handoff and explicit external failures", () => {
  let delivery = createDeliveryOrder({ orderId: "order-1", targetProductKey: "dattaseg", paymentStatus: "paid" });
  delivery = transitionDelivery(delivery, "handoff_pending");
  delivery = transitionDelivery(delivery, "blocked", { error: "DattaSeg API unavailable" });
  assert.equal(delivery.lastError, "DattaSeg API unavailable");
  assert.throws(() => transitionDelivery(delivery, "delivered"), /Invalid/);
  delivery = transitionDelivery(delivery, "handoff_pending");
  delivery = transitionDelivery(delivery, "handoff_sent");
  assert.equal(delivery.status, "handoff_sent");
});
