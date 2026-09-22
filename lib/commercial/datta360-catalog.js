import { readFileSync } from "node:fs";
const catalog = JSON.parse(readFileSync(new URL("../../catalog/products.json", import.meta.url), "utf8"));
export const DATTA360_BRAND = "Datta360°";
export function getCommercialOffer(sku) { const x = catalog.products.find((p) => p.key === sku); return x?.pricing?.status === "approved_current" && x.pricing.currency === "BRL" ? x : null; }
export function buildCommercialSnapshot({ sku, negotiatedPrice, specificTerms = null, commercialOverrideConfirmed = false, capturedAt = new Date().toISOString() }) {
  const offer = getCommercialOffer(sku); if (!offer) throw new Error("commercial_sku_unknown");
  const price = negotiatedPrice ?? offer.pricing.amount;
  if (!Number.isFinite(price) || price <= 0) throw new Error("commercial_price_invalid");
  if (price !== offer.pricing.amount && !commercialOverrideConfirmed) throw new Error("commercial_override_confirmation_required");
  return { schema_version: 1, tenant: "datta360", brand_name: DATTA360_BRAND, catalog_version: catalog.version, sku, service_name: offer.name.replace(/^Datta360°\s+—\s+/, ""), scope: offer.description, currency: "BRL", list_price: offer.pricing.amount, negotiated_price: price, recurrence: offer.recurrence, delivery_days: 7, payment_terms: { deposit_pct: 50, delivery_pct: 50 }, installments: offer.pricing.installments ?? null, specific_terms: specificTerms || null, captured_at: capturedAt };
}
export function validateCommercialSnapshot(x) {
  return Boolean(x && x.schema_version === 1 && x.tenant === "datta360" && x.brand_name === DATTA360_BRAND
    && typeof x.catalog_version === "string" && typeof x.sku === "string" && typeof x.service_name === "string" && typeof x.scope === "string"
    && x.currency === "BRL" && Number(x.list_price) > 0 && Number(x.negotiated_price) > 0 && typeof x.recurrence === "string"
    && x.delivery_days === 7 && x.payment_terms?.deposit_pct === 50 && x.payment_terms?.delivery_pct === 50
    && typeof x.captured_at === "string" && !Number.isNaN(Date.parse(x.captured_at)));
}
export const formatBRL = (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
