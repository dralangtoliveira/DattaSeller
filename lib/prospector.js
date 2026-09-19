const text = (v) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
export const normalizePhone = (v) => String(v ?? "").replace(/\D/g, "");
export const normalizeEmail = (v) => text(v);
export const normalizeUrl = (v, domain = false) => { try { const u = new URL(/^https?:/i.test(String(v)) ? String(v) : `https://${v}`); const h = u.hostname.toLowerCase().replace(/^www\./, ""); return domain ? h : `${h}${u.pathname.replace(/\/$/, "")}`; } catch { return ""; } };
export const isPublicHttpUrl = (v) => { try { const u = new URL(String(v)); return (u.protocol === "http:" || u.protocol === "https:") && Boolean(u.hostname); } catch { return false; } };
export function duplicateOf(candidate, leads) { const keys = [["telefone",normalizePhone(candidate.telefone||candidate.whatsapp),x=>normalizePhone(x.telefone||x.whatsapp)],["email",normalizeEmail(candidate.email),x=>normalizeEmail(x.email)],["dominio",normalizeUrl(candidate.site_antigo||candidate.siteAntigo,true),x=>normalizeUrl(x.site_antigo||x.siteAntigo,true)],["instagram",normalizeUrl(candidate.instagram_url),x=>normalizeUrl(x.instagram_url)],["nome_cidade",`${text(candidate.nome)}|${text(candidate.cidade)}`,x=>`${text(x.nome)}|${text(x.cidade)}`]]; for(const [criterion,value,get] of keys){const lead=value&&leads.find(x=>get(x)===value);if(lead)return{lead,criterion};}return null; }
export function normalizeQualification(input) {
  if (input == null) return { value: null };
  if (!input || typeof input !== "object" || Array.isArray(input)) return { error: "qualification_must_be_an_object" };
  // `lead_slug` é o envelope da rota /api/qualifications (obrigatório antes de
  // validar os campos) e precisa ser tolerado aqui sem entrar no registro salvo.
  const allowed = new Set(["lead_slug", "facts", "hypotheses", "recommendation", "reason", "confidence", "validation_question", "next_action", "owner"]);
  if (Object.keys(input).some((key) => !allowed.has(key))) return { error: "qualification_field_not_allowed" };
  const lines = (value) => Array.isArray(value) && value.every((entry) => typeof entry === "string" && entry.trim() && entry.length <= 500) ? value.map((entry) => entry.trim()) : null;
  const facts = lines(input.facts), hypotheses = lines(input.hypotheses ?? []), recommendation = String(input.recommendation ?? "").trim();
  const reason = String(input.reason ?? "").trim(), validation_question = String(input.validation_question ?? "").trim(), next_action = String(input.next_action ?? "").trim(), owner = String(input.owner ?? "Operador local").trim(), confidence = String(input.confidence ?? "").trim();
  if (!facts?.length || !hypotheses || !["datta360", "dattavps", "both", "insufficient"].includes(recommendation) || !reason || !validation_question || !next_action || !owner || !["low", "medium", "high"].includes(confidence)) return { error: "qualification_incomplete_or_invalid" };
  return { value: { facts, hypotheses, recommendation, reason, confidence, validation_question, next_action, owner } };
}
