const tokenIsValid = (value) => /^[A-Za-z0-9_-]{32,128}$/.test(String(value ?? ""));
const ids = (value) => Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim()) : [];
const isHttpUrl = (value) => { try { const url = new URL(String(value)); return url.protocol === "http:" || url.protocol === "https:"; } catch { return false; } };
const isDate = (value) => !Number.isNaN(new Date(String(value ?? "")).getTime());

// The client-facing link is intentionally fail-closed. A partial draft can be
// useful to an operator, but it is not a DS-VALUE-07 proposal until every
// client-facing artifact and commercial field is available.
export function publicProposalReadiness({ token, previewIds, diagnosisIds, socialIds, price, currency, terms, validUntil, oldUrl, previewFound, diagnosesFound, socialFound } = {}) {
  const missing = [];
  if (!tokenIsValid(token)) missing.push("public_token");
  if (!ids(previewIds).length || previewFound === false) missing.push("preview");
  if (!ids(diagnosisIds).length || diagnosesFound === false) missing.push("diagnosis");
  if (!ids(socialIds).length || socialFound === false) missing.push("social");
  if (!isHttpUrl(oldUrl)) missing.push("before");
  if (!Number.isFinite(Number(price)) || Number(price) <= 0) missing.push("price");
  if (!String(currency ?? "").trim()) missing.push("currency");
  if (!String(terms ?? "").trim()) missing.push("terms");
  if (!isDate(validUntil)) missing.push("valid_until");
  return { ready: missing.length === 0, missing };
}
