// OPS-COUPON-001 — o desconto negociado viaja para o checkout oficial como cupom.
// Regras registradas: o preço público não muda; a proposta negocia apenas para baixo;
// o preço negociado nunca pode passar do preço público; cada produto mantém o seu
// próprio checkout; o limite de desconto é o que já está configurado no produto —
// nenhum limite novo é inventado aqui.
export const COUPON_STATUSES = ["issued", "applied", "cancelled"];
export const DEFAULT_COUPON_PARAM = "coupon";

const round = (value) => Math.round(Number(value) * 100) / 100;
const number = (value) => (Number.isFinite(Number(value)) ? Number(value) : null);

export function couponCodeFromReference(reference) {
  const clean = String(reference ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = clean.length > 8 ? clean.slice(-8) : clean;
  return `DS-${body || "DATTASELLER"}`;
}

export function isPublicCheckoutUrl(value) {
  try {
    return ["http:", "https:"].includes(new URL(String(value)).protocol);
  } catch {
    return false;
  }
}

export function negotiatedPriceError({ publicPrice, basePrice, negotiatedPrice, maxDiscountPct }) {
  const price = number(negotiatedPrice), base = number(basePrice), ceiling = number(publicPrice), limit = number(maxDiscountPct);
  if (price === null || price <= 0) return "negotiated_price_not_positive";
  if (ceiling !== null && ceiling > 0 && price > ceiling) return "negotiated_price_above_public_price";
  if (base !== null && base > 0 && price > base) return "negotiated_price_above_base_price";
  if (base !== null && base > 0 && limit !== null && limit >= 0 && base - price > (base * limit) / 100) return "discount_above_max";
  return null;
}

function withCoupon(url, param, code) {
  const target = new URL(String(url));
  target.searchParams.set(param, code);
  return target.href;
}

export function planOrderCoupon({ reference, order = {}, product = {} }) {
  const ceiling = number(product.public_price);
  const base = number(order.base_price);
  const price = number(order.negotiated_price);
  const param = String(product.coupon_param ?? "").trim() || DEFAULT_COUPON_PARAM;
  const checkoutUrl = isPublicCheckoutUrl(product.checkout_url) ? String(product.checkout_url) : null;
  const discountBase = ceiling !== null ? ceiling : base;
  const discount = round(Math.max(0, (discountBase ?? price ?? 0) - (price ?? 0)));
  const required = discount > 0;
  const couponCode = required ? couponCodeFromReference(reference) : null;
  return {
    required,
    public_price: ceiling,
    discount,
    coupon_code: couponCode,
    coupon_status: required ? "issued" : null,
    param,
    checkout_url: checkoutUrl,
    checkout_url_with_coupon: required && checkoutUrl ? withCoupon(checkoutUrl, param, couponCode) : null,
  };
}
