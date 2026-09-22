const PUBLIC_LINK = /^https:\/\/[^\s/]+\/p\/([A-Za-z0-9_-]{43})$/;
const forbidden = /\b(preço|valor|investimento|r\$|usd|us\$|desconto|cupom|promoção|oferta limitada)\b/i;
const words = (text) => String(text).trim().split(/\s+/).filter(Boolean).length;

export function publicProposalTokenFromUrl(value) {
  const match = String(value ?? "").trim().match(PUBLIC_LINK);
  return match?.[1] ?? "";
}

export function diagnosisFactFromCriteria(value) {
  const first = Array.isArray(value) ? value[0] : value;
  if (typeof first === "string") return first.trim();
  if (!first || typeof first !== "object") return "";
  const direct = [first.observacao, first.detail, first.value].find((item) => typeof item === "string" && item.trim());
  if (direct) return String(direct).trim();
  if (typeof first.criterion === "string" && typeof first.observed_state === "string" && first.criterion.trim() && first.observed_state.trim()) {
    return `${first.criterion.trim()}: ${first.observed_state.trim()}`;
  }
  const evidencias = Array.isArray(first.evidencias) ? first.evidencias : [];
  for (const item of evidencias) {
    if (typeof item === "string" && item.trim()) return item.trim();
    if (!item || typeof item !== "object") continue;
    const observation = [item.observacao, item.detail, item.value].find((entry) => typeof entry === "string" && entry.trim());
    if (observation) return String(observation).trim();
    if (typeof item.criterio === "string" && typeof item.valor === "string" && item.criterio.trim() && item.valor.trim()) {
      return `${item.criterio.trim()}: ${item.valor.trim()}`;
    }
  }
  return "";
}

export function buildProspectorEmailDraft({ leadName, companyName, diagnosisFact, publicProposalUrl, sellerName }) {
  if (!publicProposalTokenFromUrl(publicProposalUrl)) throw new Error("public_proposal_url_required");
  if (!String(leadName ?? "").trim() || !String(companyName ?? "").trim() || !String(diagnosisFact ?? "").trim()) throw new Error("prospector_email_context_incomplete");
  const subject = `Podemos revisar a proposta Datta360° da ${companyName}?`.slice(0, 60).trim();
  const body = [
    `No diagnóstico de ${companyName}, foi observado: ${diagnosisFact}`, "",
    `Olá, ${leadName}. Preparei uma proposta Datta360° a partir dos elementos observados na presença digital. A proposta reúne o antes e depois do preview, além da demonstração preparada e da direção sugerida para os canais públicos relacionados.`,
    "Também incluí uma síntese objetiva para que a conversa comece por fatos observáveis, sem presumir mudanças já aprovadas. O material é destinado à sua revisão e pode orientar uma conversa sobre prioridades, contexto e próximos passos.",
    "Você pode abrir a proposta neste link:", publicProposalUrl, "",
    "Se desejar, responda a este e-mail com o melhor horário para conversarmos. Não é necessário tomar nenhuma decisão agora; uma revisão humana pode ajustar o escopo depois da leitura.", "",
    `Atenciosamente,\n${sellerName || "Equipe Datta360°"}`,
  ].join("\n");
  if (words(body) < 120 || words(body) > 180 || forbidden.test(body) || (body.match(/https:\/\//g) ?? []).length !== 1) throw new Error("prospector_email_contract_invalid");
  return { subject, body, template: "prospector_proposal_review", status: "draft" };
}
