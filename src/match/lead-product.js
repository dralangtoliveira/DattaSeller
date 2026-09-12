export const RULE_VERSION = "v1";

const RULES = [
  {
    product: "dattavps",
    label: "DattaVPS",
    weight: 10,
    signals: ["servidor 24h", "docker", "self-hosted", "self hosted", "agente", "mt5", "vps", "ambiente dedicado"]
  },
  {
    product: "dattaseg",
    label: "DattaSeg",
    weight: 10,
    signals: ["agente", "n8n", "make", "zapier", "credencial", "senha", "permissão", "permissao", "exposição", "exposicao"]
  }
];

function searchableText(lead) {
  return [lead.profession, lead.segment, lead.size, lead.location, lead.digitalPresence, lead.pains, lead.notes]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("pt-BR");
}

export function recommendProducts(lead) {
  const text = searchableText(lead);
  const candidates = RULES.map((rule) => {
    const reasons = rule.signals.filter((signal) => text.includes(signal));
    return { product: rule.product, label: rule.label, score: reasons.length * rule.weight, reasons };
  }).filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.product.localeCompare(b.product));

  const hasVps = candidates.some((candidate) => candidate.product === "dattavps");
  const hasSeg = candidates.some((candidate) => candidate.product === "dattaseg");
  const result = hasVps && hasSeg ? "both" : hasVps ? "dattavps" : hasSeg ? "dattaseg" : "none";

  return { ruleVersion: RULE_VERSION, result, candidates };
}

export function overrideRecommendation(recommendation, result, reason, actorId) {
  if (!reason?.trim()) throw new Error("An override reason is required");
  if (!actorId) throw new Error("An actor is required");
  if (!['dattavps', 'dattaseg', 'both', 'none'].includes(result)) throw new Error("Unknown recommendation result");
  return { ...recommendation, result, overriddenBy: actorId, overrideReason: reason.trim() };
}

export function recordRecommendationFeedback(recommendationId, useful, actorId) {
  if (!recommendationId || !actorId || typeof useful !== "boolean") throw new Error("Recommendation feedback requires id, actor, and boolean useful value");
  return { recommendationId, useful, actorId };
}
