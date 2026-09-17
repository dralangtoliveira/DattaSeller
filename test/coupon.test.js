import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { COUPON_STATUSES, DEFAULT_COUPON_PARAM, couponCodeFromReference, isPublicCheckoutUrl, negotiatedPriceError, planOrderCoupon } from "../lib/coupons/coupon.js";

test("o preço negociado nunca passa do preço público nem do preço-base", () => {
  assert.equal(negotiatedPriceError({ publicPrice: 1500, basePrice: 1500, negotiatedPrice: 1200, maxDiscountPct: 20 }), null);
  assert.equal(negotiatedPriceError({ publicPrice: 1500, basePrice: 1500, negotiatedPrice: 1500, maxDiscountPct: 20 }), null);
  assert.equal(negotiatedPriceError({ publicPrice: 1500, basePrice: 1500, negotiatedPrice: 1500.01, maxDiscountPct: 20 }), "negotiated_price_above_public_price");
  assert.equal(negotiatedPriceError({ publicPrice: 190, basePrice: 190, negotiatedPrice: 240, maxDiscountPct: 20 }), "negotiated_price_above_public_price");
  assert.equal(negotiatedPriceError({ publicPrice: 200, basePrice: 190, negotiatedPrice: 195, maxDiscountPct: 20 }), "negotiated_price_above_base_price");
  assert.equal(negotiatedPriceError({ publicPrice: 1500, basePrice: 1500, negotiatedPrice: 0, maxDiscountPct: 20 }), "negotiated_price_not_positive");
  assert.equal(negotiatedPriceError({ publicPrice: 1500, basePrice: 1500, negotiatedPrice: -1, maxDiscountPct: 20 }), "negotiated_price_not_positive");
});

test("o limite de desconto vem do produto configurado, nunca de um valor fixo no código", () => {
  const proposal = { publicPrice: 1000, basePrice: 1000, negotiatedPrice: 700 };
  assert.equal(negotiatedPriceError({ ...proposal, maxDiscountPct: 20 }), "discount_above_max");
  assert.equal(negotiatedPriceError({ ...proposal, maxDiscountPct: 30 }), null);
  assert.equal(negotiatedPriceError({ ...proposal, maxDiscountPct: 35 }), null);
  const source = readFileSync(new URL("../lib/coupons/coupon.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\b(19|20|25|30|50)\s*%/);
  assert.match(source, /maxDiscountPct/);
});

test("o cupom só existe quando há desconto negociado", () => {
  const product = { public_price: 1500, checkout_url: "https://checkout.datta.example/datta360" };
  const semDesconto = planOrderCoupon({ reference: "ord_abc12345", order: { base_price: 1500, negotiated_price: 1500 }, product });
  assert.equal(semDesconto.required, false);
  assert.equal(semDesconto.coupon_code, null);
  assert.equal(semDesconto.coupon_status, null);
  assert.equal(semDesconto.public_price, 1500);
  assert.equal(semDesconto.discount, 0);

  const comDesconto = planOrderCoupon({ reference: "ord_abc12345", order: { base_price: 1500, negotiated_price: 1200 }, product });
  assert.equal(comDesconto.required, true);
  assert.equal(comDesconto.coupon_code, "DS-ABC12345");
  assert.equal(comDesconto.coupon_status, "issued");
  assert.equal(comDesconto.discount, 300);
  assert.equal(comDesconto.public_price, 1500);
});

test("o cupom chega ao checkout oficial do próprio produto sem alterar o preço público", () => {
  const plan = planOrderCoupon({ reference: "ord_abc12345", order: { base_price: 190, negotiated_price: 160 }, product: { public_price: 190, checkout_url: "https://loja.datta.example/dattavps?plano=agent" } });
  const target = new URL(plan.checkout_url_with_coupon);
  assert.equal(target.origin + target.pathname, "https://loja.datta.example/dattavps");
  assert.equal(target.searchParams.get("plano"), "agent");
  assert.equal(target.searchParams.get("coupon"), plan.coupon_code);
  assert.equal(plan.checkout_url, "https://loja.datta.example/dattavps?plano=agent");
  assert.equal(plan.param, DEFAULT_COUPON_PARAM);
  assert.equal(plan.public_price, 190);
});

test("produto sem checkout configurado emite o cupom e não inventa URL", () => {
  const plan = planOrderCoupon({ reference: "ord_abc12345", order: { base_price: 1500, negotiated_price: 1200 }, product: { public_price: 1500 } });
  assert.equal(plan.required, true);
  assert.equal(plan.coupon_code, "DS-ABC12345");
  assert.equal(plan.checkout_url, null);
  assert.equal(plan.checkout_url_with_coupon, null);
  assert.equal(isPublicCheckoutUrl("javascript:alert(1)"), false);
  assert.equal(isPublicCheckoutUrl("file:///etc/passwd"), false);
  const planInseguro = planOrderCoupon({ reference: "ord_abc12345", order: { base_price: 1500, negotiated_price: 1200 }, product: { public_price: 1500, checkout_url: "javascript:alert(1)" } });
  assert.equal(planInseguro.checkout_url, null);
});

test("o código do cupom é estável e legível por pedido", () => {
  assert.equal(couponCodeFromReference("ord_abc12345"), "DS-ABC12345");
  assert.equal(couponCodeFromReference("ord_abc12345"), couponCodeFromReference("ord_abc12345"));
  assert.equal(couponCodeFromReference(""), "DS-DATTASELLER");
  assert.deepEqual(COUPON_STATUSES, ["issued", "applied", "cancelled"]);
});

test("a linha web valida o teto do preço público e emite o cupom no pedido", () => {
  const route = readFileSync(new URL("../app/api/[...path]/route.ts", import.meta.url), "utf8");
  assert.match(route, /negotiatedPriceError\(/);
  assert.match(route, /const priceError = negotiatedPriceError\(\{/);
  assert.match(route, /if \(priceError\) return out\(\{ error: priceError \}, 400\)/, "a rota precisa devolver o código do teto do preço público em vez de aceitar o preço");
  assert.equal(negotiatedPriceError({ publicPrice: 100, basePrice: 100, negotiatedPrice: 101, maxDiscountPct: 20 }), "negotiated_price_above_public_price");
  assert.match(route, /planOrderCoupon\(/);
  assert.match(route, /coupon_code: coupon\.coupon_code/);
  assert.match(route, /coupon_status: coupon\.coupon_status/);
  assert.match(route, /public_price: coupon\.public_price/);
  assert.match(route, /order\.coupon_issued/);
  assert.match(route, /ds_products\(cost,max_discount_pct,public_price\)/);
});

test("a migration guarda o cupom e recusa preço negociado acima do preço público", () => {
  const migration = readFileSync(new URL("../supabase/migrations/20260917000000_add_order_coupon.sql", import.meta.url), "utf8");
  assert.match(migration, /add column if not exists public_price numeric/);
  assert.match(migration, /add column if not exists coupon_code text/);
  assert.match(migration, /add column if not exists coupon_status text/);
  assert.match(migration, /ds_orders_public_price_ceiling/);
  assert.match(migration, /negotiated_price <= public_price/);
  assert.match(migration, /'issued', 'applied', 'cancelled'/);
});
