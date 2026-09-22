import { createHash, randomBytes } from "node:crypto";

const TOKEN_BYTES = 32;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const ids = (value) => Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim()) : [];
const isHttpUrl = (value) => { try { const url = new URL(String(value)); return url.protocol === "http:" || url.protocol === "https:"; } catch { return false; } };
const isDate = (value) => !Number.isNaN(new Date(String(value ?? "")).getTime());

export function createPublicProposalToken() {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function isPublicProposalToken(value) {
  return TOKEN_PATTERN.test(String(value ?? ""));
}

export function hashPublicProposalToken(value) {
  if (!isPublicProposalToken(value)) return "";
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function publicProposalReadiness({ token, previewIds, diagnosisIds, socialIds, price, currency, terms, validUntil, oldUrl, previewFound, diagnosesFound, socialFound, commercialSnapshot } = {}) {
  const missing = [];
  const structuredTerms = Boolean(
    commercialSnapshot
    && Number(commercialSnapshot.delivery_days) > 0
    && Number(commercialSnapshot.payment_terms?.deposit_pct) >= 0
    && Number(commercialSnapshot.payment_terms?.delivery_pct) >= 0
  );
  if (!isPublicProposalToken(token)) missing.push("public_token");
  if (!ids(previewIds).length || previewFound === false) missing.push("preview");
  if (!ids(diagnosisIds).length || diagnosesFound === false) missing.push("diagnosis");
  if (!ids(socialIds).length || socialFound === false) missing.push("social");
  if (!isHttpUrl(oldUrl)) missing.push("before");
  if (!Number.isFinite(Number(price)) || Number(price) <= 0) missing.push("price");
  if (!String(currency ?? "").trim()) missing.push("currency");
  if (!String(terms ?? "").trim() && !structuredTerms) missing.push("terms");
  if (!isDate(validUntil)) missing.push("valid_until");
  return { ready: missing.length === 0, missing };
}

export function sanitizePublicPreviewHtml(value) {
  let html = String(value ?? "");
  html = html.replace(/<\/?(?:script|iframe|object|embed|form|base|meta|link)[^>]*>/gi, "");
  html = html.replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  html = html.replace(/\s(?:src|href|action|formaction|poster)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  html = html.replace(/@import\s+[^;]+;?/gi, "").replace(/url\s*\([^)]*\)/gi, "");
  return html;
}
