// OPS-EMAIL-001 — follow-up scheduling for the DattaSeller email centre.
// A follow-up is a new draft linked to the original message: it reuses the same
// draft → review → approval → send path and never sends without human approval.
export const FOLLOW_UP_DEFAULT_DAYS = 3;
const FOLLOW_UP_ELIGIBLE_STATUSES = ["sent", "delivered_simulated", "no_reply", "generic_reply"];
const DAY_MS = 86400000;

export function canScheduleFollowUp(status) {
  return FOLLOW_UP_ELIGIBLE_STATUSES.includes(String(status ?? "").trim());
}

export function followUpDueAt(days, referenceDate = new Date()) {
  const span = Number(days);
  const safeDays = Number.isFinite(span) && span > 0 ? span : FOLLOW_UP_DEFAULT_DAYS;
  const from = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const base = Number.isNaN(from.getTime()) ? new Date() : from;
  return new Date(base.getTime() + safeDays * DAY_MS).toISOString();
}

const sentDay = (value) => { const date = new Date(String(value ?? "")); return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10); };

export function buildFollowUpDraft(parent = {}, { sellerName = "", days, referenceDate = new Date() } = {}) {
  const subject = String(parent?.subject ?? "").trim() || "Proposta DattaSeller";
  const sentAt = sentDay(parent?.updated_at || parent?.created_at);
  const signature = String(sellerName ?? "").trim();
  return {
    subject: /^re:/i.test(subject) ? subject : `Re: ${subject}`,
    body: [
      "Olá,",
      "",
      `Retomo o contato sobre "${subject}"${sentAt ? ` enviado em ${sentAt}` : ""}.`,
      "Se fizer sentido, respondo com os próximos passos ou ajusto a proposta.",
      "",
      "Atenciosamente,",
      signature || "DattaSeller",
    ].join("\n"),
    due_at: followUpDueAt(days, referenceDate),
  };
}
