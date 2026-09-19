/**
 * Ponte entre a descoberta real (DS-VALUE-01) e o modelo de lead do CRM.
 *
 * O candidato sai no mesmo contrato que `/api/prospects` já consome
 * (`LEAD_INPUT_KEYS`), com `source`, `source_url` e `source_checked_at`
 * preenchidos a partir da fonte pública — sem digitação manual e sem copiar e
 * colar. Campo que a fonte não forneceu permanece vazio.
 */

import { normalizePhone } from "../prospector.js";

export function slugify(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

export function uniqueSlug(value, taken) {
  const base = slugify(value);
  const seed = /^[a-z0-9][a-z0-9-]{0,71}$/.test(base) ? base : "";
  if (!seed) return "";
  let slug = seed;
  let suffix = 2;
  while (taken.has(slug)) {
    slug = `${seed.slice(0, 68)}-${suffix}`;
    suffix += 1;
  }
  taken.add(slug);
  return slug;
}

/**
 * Evita que um resultado novo caia no slug de um lead existente e sobrescreva
 * outro negócio (mesmo nome em cidades diferentes). O slug do lead existente
 * nunca muda: a fusão continua acontecendo pela deduplicação do servidor.
 */
export function disambiguateSlug(slug, taken) {
  const value = String(slug ?? "");
  if (!taken.has(value)) return value;
  const base = value.slice(0, 66);
  let suffix = 2;
  let candidate = `${base}-${suffix}`;
  while (taken.has(candidate)) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

/** Canal público predominante, na ordem de utilidade comercial. */
export function publicContactType(result) {
  if (String(result?.email ?? "").trim()) return "e-mail";
  if (String(result?.telefone ?? "").trim()) return "telefone";
  if (String(result?.whatsapp ?? "").trim()) return "whatsapp";
  if (String(result?.site ?? "").trim()) return "site";
  if (String(result?.instagram ?? "").trim()) return "instagram";
  if (String(result?.endereco ?? "").trim()) return "endereço";
  return "";
}

/**
 * Converte um resultado da descoberta em candidato aceito por `/api/prospects`.
 * As chaves extras (`proveniencia`, `deduplicated`, ...) são metadados de tela:
 * a API de leads ignora o que não é campo de lead.
 */
export function resultToCandidate(result, { nicho, cidade, produto = "", slug } = {}) {
  const nichoFinal = clean(nicho) || clean(result?.nicho);
  const cidadeFinal = clean(cidade) || clean(result?.cidade_fonte);
  const dataVerificacao = clean(result?.source_checked_at);
  return {
    slug,
    nome: clean(result?.nome),
    empresa: clean(result?.nome),
    nicho: nichoFinal,
    cidade: cidadeFinal,
    end_cliente: clean(result?.endereco),
    telefone: clean(result?.telefone),
    whatsapp: normalizePhone(result?.whatsapp),
    email: clean(result?.email),
    site_antigo: clean(result?.site),
    instagram_url: clean(result?.instagram),
    source: clean(result?.provider),
    source_url: clean(result?.source_url),
    source_checked_at: dataVerificacao,
    public_contact_type: publicContactType(result),
    region: cidadeFinal,
    obs: [
      result?.categoria_fonte ? `Categoria na fonte: ${clean(result.categoria_fonte)}` : "Categoria na fonte: não informada",
      `Descoberto em ${clean(result?.provider)}`,
      dataVerificacao ? `verificado em ${dataVerificacao}` : "",
    ].filter(Boolean).join(" · "),
    ...(produto ? { product_suggested: produto } : {}),
    proveniencia: {
      provider: clean(result?.provider),
      provider_id: clean(result?.provider_id),
      provider_url: clean(result?.source_url),
      categoria: clean(result?.categoria),
      categoria_fonte: clean(result?.categoria_fonte),
      endereco: clean(result?.endereco),
      latitude: result?.latitude ?? null,
      longitude: result?.longitude ?? null,
      campos_indisponiveis: Array.isArray(result?.campos_indisponiveis) ? [...result.campos_indisponiveis] : [],
      detalhes: result?.detalhes ?? {},
      verificado_em: dataVerificacao,
    },
  };
}

export function resultsToCandidates(results, meta = {}) {
  const taken = new Set();
  return (Array.isArray(results) ? results : []).map((result) => {
    const slug = uniqueSlug(result?.nome || result?.provider_id, taken);
    return resultToCandidate(result, { ...meta, slug });
  });
}

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
