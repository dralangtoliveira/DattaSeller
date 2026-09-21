import { createHash, randomBytes } from "node:crypto";

const TOKEN_BYTES = 32;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

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

// Preview HTML is authored internally, but it is still treated as untrusted at
// this public boundary. The isolated iframe gets no scripts, forms, navigation,
// remote resources, or event handlers.
export function sanitizePublicPreviewHtml(value) {
  let html = String(value ?? "");
  html = html.replace(/<\/?(?:script|iframe|object|embed|form|base|meta|link)[^>]*>/gi, "");
  html = html.replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  html = html.replace(/\s(?:src|href|action|formaction|poster)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  html = html.replace(/@import\s+[^;]+;?/gi, "").replace(/url\s*\([^)]*\)/gi, "");
  return html;
}
