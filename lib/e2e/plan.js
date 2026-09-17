// Final Gate n. 4 — cadeia do E2E autenticado, na ordem registrada.
// A ordem abaixo é a do Registro Canônico; nenhum passo novo foi inventado,
// e nenhum passo foi omitido.
export const E2E_STEPS = [
  { id: "auth", label: "sessão admin autenticada", endpoint: "GET /api/leads" },
  { id: "prospect", label: "prospecção pública controlada", endpoint: "POST /api/prospects" },
  { id: "dedup", label: "deduplicação", endpoint: "POST /api/prospects (mesma fonte)" },
  { id: "qualification", label: "qualificação", endpoint: "POST /api/qualifications" },
  { id: "diagnosis", label: "diagnóstico de site", endpoint: "POST /api/diagnoses" },
  { id: "social", label: "auditoria social", endpoint: "POST /api/social-audits" },
  { id: "preview", label: "redesign/preview", endpoint: "POST /api/previews" },
  { id: "editor", label: "editor visual", endpoint: "GET /api/previews/:id/editor" },
  { id: "comparator", label: "comparador", endpoint: "GET /api/comparators/:slug" },
  { id: "proposal", label: "proposta", endpoint: "POST /api/proposals" },
  { id: "negotiation", label: "renegociação (nunca acima do preço público)", endpoint: "PUT /api/proposals/:id" },
  { id: "cover", label: "capa da proposta", endpoint: "GET /api/proposals/:id/cover" },
  { id: "email_draft", label: "rascunho de e-mail", endpoint: "POST /api/emails" },
  { id: "email_edit", label: "edição do rascunho", endpoint: "PUT /api/emails/:id" },
  { id: "email_approve", label: "revisão e aprovação", endpoint: "POST /api/emails/:id/transition" },
  { id: "email_send", label: "envio pelo endpoint do CRM", endpoint: "POST /api/emails/:id/transition (sent_simulated)" },
  { id: "email_followup", label: "follow-up ligado ao envio", endpoint: "POST /api/emails/:id/follow-up" },
  { id: "email_timeline", label: "registro do envio na timeline", endpoint: "GET /api/timeline" },
  { id: "order", label: "pedido", endpoint: "POST /api/orders" },
  { id: "checkout", label: "checkout", endpoint: "POST /api/orders/:id/checkout" },
  { id: "payment", label: "pagamento", endpoint: "POST /api/orders/:id/payment" },
  { id: "contract", label: "contrato", endpoint: "POST /api/orders/:id/contract" },
  { id: "contract_html", label: "minuta HTML", endpoint: "GET /api/contracts/:id/html" },
  { id: "contract_docx", label: "DOCX do contrato", endpoint: "GET /api/contracts/:id/docx" },
  { id: "handoff", label: "handoff", endpoint: "POST /api/orders/:id/handoff" },
  { id: "financial", label: "financeiro e comissão", endpoint: "GET /api/financial" },
  { id: "reload", label: "reload/persistência", endpoint: "GET /api/leads + GET /api/timeline" },
];

export const REQUIRED_ENV = ["DS_E2E_BASE_URL", "DS_E2E_EMAIL", "DS_E2E_PASSWORD", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "DS_E2E_EMAIL_TO", "DS_E2E_CONFIRM"];

const isHttpUrl = (value) => {
  try {
    return ["http:", "https:"].includes(new URL(String(value)).protocol);
  } catch {
    return false;
  }
};

const looksLikeEmail = (value) => {
  const text = String(value ?? "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) && !text.endsWith(".invalid");
};

export function validateEnv(env = {}) {
  const missing = REQUIRED_ENV.filter((key) => !String(env[key] ?? "").trim());
  const invalid = [];
  if (!missing.includes("DS_E2E_BASE_URL") && !isHttpUrl(env.DS_E2E_BASE_URL)) invalid.push("DS_E2E_BASE_URL");
  if (!missing.includes("NEXT_PUBLIC_SUPABASE_URL") && !isHttpUrl(env.NEXT_PUBLIC_SUPABASE_URL)) invalid.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!missing.includes("DS_E2E_EMAIL") && !looksLikeEmail(env.DS_E2E_EMAIL)) invalid.push("DS_E2E_EMAIL");
  if (!missing.includes("DS_E2E_EMAIL_TO") && !looksLikeEmail(env.DS_E2E_EMAIL_TO)) invalid.push("DS_E2E_EMAIL_TO");
  if (!missing.includes("DS_E2E_CONFIRM") && String(env.DS_E2E_CONFIRM).trim().toLowerCase() !== "yes") invalid.push("DS_E2E_CONFIRM");
  return { ok: missing.length === 0 && invalid.length === 0, missing, invalid };
}

export function summarize(results = []) {
  const passed = results.filter((step) => step.status === "pass").length;
  const failed = results.filter((step) => step.status === "fail").length;
  const blocked = results.filter((step) => step.status === "blocked").length;
  const skipped = results.filter((step) => step.status === "skip").length;
  return { total: results.length, passed, failed, blocked, skipped, ok: failed === 0 && blocked === 0 };
}

export function e2eLeadSlug(runId) {
  const clean = String(runId ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return `e2e-${clean || "run"}`.slice(0, 60);
}
