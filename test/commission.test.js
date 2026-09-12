import assert from "node:assert/strict";
import test from "node:test";
import { applySaleReversal, commissionsVisibleTo, createCommission } from "../src/commissions/commission.js";

test("creates commission only after payment and keeps the rule version", () => {
  assert.throws(() => createCommission({ sale: { paymentStatus: "pending" }, sellerId: "seller-1", rule: { version: "v1", rate: .2 } }), /paid/);
  const commission = createCommission({ sale: { id: "sale-1", paymentStatus: "paid", amount: 49.99, currency: "USD" }, sellerId: "seller-1", rule: { version: "v1", rate: .2 } });
  assert.deepEqual(commission, { saleId: "sale-1", sellerId: "seller-1", ruleVersion: "v1", amount: 10, currency: "USD", status: "pending" });
});

test("reverses refunds and protects seller visibility", () => {
  const commission = createCommission({ sale: { id: "sale-1", paymentStatus: "paid", amount: 100, currency: "USD" }, sellerId: "seller-1", rule: { version: "v1", rate: .15 } });
  assert.equal(applySaleReversal(commission, { saleStatus: "refunded", reason: "Gateway refund" }).status, "reversed");
  const records = [commission, { ...commission, saleId: "sale-2", sellerId: "seller-2" }];
  assert.equal(commissionsVisibleTo(records, { id: "seller-1", role: "seller" }).length, 1);
  assert.equal(commissionsVisibleTo(records, { id: "finance-1", role: "finance" }).length, 2);
});
