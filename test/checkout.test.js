import assert from "node:assert/strict";
import test from "node:test";
import { createExternalCheckout } from "../src/orders/checkout.js";

const plan = { id: "plan-vps-1", priceAmount: 49, currency: "USD", commercialStatus: "available", availabilityStatus: "available" };
const provider = { createCheckout: async ({ reference, amount, currency }) => ({ url: `https://checkout.example.test/${reference}`, externalOrderId: `ext-${amount}-${currency}` }) };
const ids = (() => { let id = 0; return () => `id-${++id}`; })();

test("creates a pending Seller order with authorized price and external checkout", async () => {
  const order = await createExternalCheckout({ opportunityId: "opp-1", customerId: "cust-1", sellerId: "seller-1", plan, checkoutProvider: provider, createId: ids });
  assert.equal(order.authorizedAmount, 49);
  assert.equal(order.paymentStatus, "pending");
  assert.equal(order.currency, "USD");
  assert.match(order.checkoutUrl, /^https:/);
  assert.match(order.correlationId, /^id-/);
});

test("refuses unavailable plans and discounts beyond the authorized price", async () => {
  await assert.rejects(() => createExternalCheckout({ opportunityId: "opp-1", customerId: "cust-1", sellerId: "seller-1", plan: { ...plan, availabilityStatus: "unavailable" }, checkoutProvider: provider }), /not commercially available/);
  await assert.rejects(() => createExternalCheckout({ opportunityId: "opp-1", customerId: "cust-1", sellerId: "seller-1", plan, discountAmount: 50, checkoutProvider: provider }), /Invalid discount/);
});
