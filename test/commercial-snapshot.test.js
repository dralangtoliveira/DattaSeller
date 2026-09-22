import test from "node:test";
import assert from "node:assert/strict";
import { buildCommercialSnapshot, validateCommercialSnapshot } from "../lib/commercial/datta360-catalog.js";

test("snapshot comercial vem apenas do catálogo Datta360 e inclui condições aprovadas", () => {
  const snapshot = buildCommercialSnapshot({ sku: "datta360", capturedAt: "2026-09-21T00:00:00.000Z" });
  assert.equal(snapshot.tenant, "datta360");
  assert.equal(snapshot.brand_name, "Datta360°");
  assert.equal(snapshot.currency, "BRL");
  assert.equal(snapshot.delivery_days, 7);
  assert.deepEqual(snapshot.payment_terms, { deposit_pct: 50, delivery_pct: 50 });
  assert.equal(validateCommercialSnapshot(snapshot), true);
});

test("preço diferente exige confirmação comercial explícita", () => {
  assert.throws(() => buildCommercialSnapshot({ sku: "datta360", negotiatedPrice: 1 }), /commercial_override_confirmation_required/);
  const overridden = buildCommercialSnapshot({ sku: "datta360", negotiatedPrice: 1, commercialOverrideConfirmed: true });
  assert.equal(overridden.negotiated_price, 1);
});

test("snapshot incompleto não é publicável", () => {
  assert.equal(validateCommercialSnapshot({ tenant: "datta360", brand_name: "Datta360°" }), false);
});
