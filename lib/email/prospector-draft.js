const BLOCKED = /\b(gr[aá]tis|promo[cç][aã]o|imperd[ií]vel|desconto|clique aqui|urgente)\b/i;
const words = (value) => String(value ?? "").trim().split(/\s+/).filter(Boolean);

export function validateProspectorDraft({ subject, body, publicUrl }) {
  const bodyWords = words(body).length;
  const links = String(body ?? "").match(/https?:\/\/[^\s]+/g) ?? [];
  if (!subject || subject.length > 60 || !/\?$/.test(subject)) return "prospector_subject_invalid";
  if (bodyWords < 120 || bodyWords > 180) return "prospector_word_count_invalid";
  if (links.length !== 1 || links[0] !== publicUrl) return "prospector_link_invalid";
  if (BLOCKED.test(subject) || BLOCKED.test(body) || /!!|\p{Extended_Pictographic}/u.test(subject)) return "prospector_spam_trigger";
  return null;
}

export function diagnosisFactsFromCriteria(value) {
  const top = Array.isArray(value) ? value : [value];
  const facts = [];
  const push = (item) => {
    const text = String(item ?? "").trim();
    if (text && !facts.includes(text)) facts.push(text);
  };
  for (const entry of top) {
    if (typeof entry === "string") { push(entry); continue; }
    if (!entry || typeof entry !== "object") continue;
    push(entry.observacao || entry.detail || entry.value);
    if (!facts.length && entry.criterion && entry.observed_state) push(`${entry.criterion}: ${entry.observed_state}`);
    const evidences = Array.isArray(entry.evidencias) ? entry.evidencias : [];
    for (const evidence of evidences) {
      if (typeof evidence === "string") { push(evidence); continue; }
      if (!evidence || typeof evidence !== "object") continue;
      push(evidence.observacao || evidence.detail || evidence.value);
      if (evidence.criterio && evidence.valor) push(`${evidence.criterio}: ${evidence.valor}`);
    }
  }
  return facts.slice(0, 2);
}

export function buildProspectorDraft({ businessName, firstLine, diagnosis = [], publicUrl, sellerName, identity, whatsapp }) {
  const subject = `${businessName}, posso mostrar uma coisa sobre seu site?`.slice(0, 60);
  const observed = diagnosis.filter(Boolean).slice(0, 2).join(" ") || "Encontrei pontos objetivos na apresentação atual que podem facilitar o contato de quem chega pelo celular.";
  const signature = [sellerName, identity, whatsapp ? `WhatsApp: ${whatsapp}` : ""].filter(Boolean).join(" · ");
  const body = `${firstLine}\n\nAo olhar o site, observei ${observed} Não é uma crítica ao trabalho de vocês; é uma oportunidade de deixar o próximo passo mais claro para quem já demonstra interesse.\n\nPreparei uma nova versão de demonstração, baseada apenas nas informações públicas que encontrei. Ela mostra como a navegação, a apresentação dos serviços e o contato podem ficar mais diretos, sem alterar a identidade do negócio.\n\nVocê pode ver a proposta aqui: ${publicUrl}\n\nSe puder abrir também no celular, gostaria de saber o que achou. Se fizer sentido, responda a este e-mail e conversamos com calma sobre os próximos passos.\n\n${signature}`;
  const error = validateProspectorDraft({ subject, body, publicUrl });
  if (error) throw new Error(error);
  return { subject, body };
}
