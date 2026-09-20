/**
 * DattaSeller Agent — contrato de provider de LLM.
 *
 * O agente gera; o código valida. O modelo recebe contexto ESTRUTURADO e só pode
 * melhorar tom/gancho/legenda dentro dos fatos fornecidos: qualquer saída fora do
 * schema ou com fato/número que não veio da fonte é recusada pelo código antes de
 * entrar no CRM.
 *
 * Nenhuma chave é gravada em código, log ou artefato. Sem provider autorizado
 * (`DATTASELLER_LLM_PROVIDER` + `DATTASELLER_LLM_API_KEY`), o agente NÃO faz
 * chamada e registra `LLM_PROVIDER_REQUIRED`.
 */

import { AgentError } from "./contract.js";
import { findForbiddenClaims } from "../redesign/contract.js";

export const LLM_ACTIONS = ["BUILD_SOCIAL_DEMO"];
export const LLM_REQUIRED_KEYS = ["hooks", "captions"];

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

export function llmConfig(env = process.env) {
  const provider = clean(env.DATTASELLER_LLM_PROVIDER);
  const baseUrl = clean(env.DATTASELLER_LLM_BASE_URL) || (provider === "openai" ? "https://api.openai.com/v1" : "");
  const model = clean(env.DATTASELLER_LLM_MODEL);
  const apiKey = String(env.DATTASELLER_LLM_API_KEY ?? "");
  return { provider, baseUrl, model, hasKey: Boolean(apiKey), configured: Boolean(provider && baseUrl && model && apiKey) };
}

/**
 * Validação determinística da saída do modelo: schema + nenhum fato inventado.
 * `allowedFacts` é tudo que o agente coletou (textos, contatos, contadores...).
 */
export function validateLlmOutput(data, { allowedFacts = [], requiredKeys = LLM_REQUIRED_KEYS } = {}) {
  const errors = [];
  if (!data || typeof data !== "object" || Array.isArray(data)) return { ok: false, errors: ["output_not_an_object"] };
  for (const chave of requiredKeys) if (!(chave in data)) errors.push(`missing_${chave}`);
  if (errors.length) return { ok: false, errors };
  const textos = [
    ...(Array.isArray(data.hooks) ? data.hooks : []),
    ...(Array.isArray(data.captions) ? data.captions : []),
  ].map((item) => clean(typeof item === "string" ? item : item?.text ?? ""));
  if (!textos.length || textos.some((texto) => !texto)) errors.push("empty_text");
  const universo = allowedFacts.map((fato) => String(fato)).join(" \n ");
  for (const texto of textos) {
    const proibido = findForbiddenClaims(texto);
    if (proibido.length) errors.push(`forbidden_claim:${proibido[0]}`);
    for (const numero of texto.match(/\d[\d.,]*/g) ?? []) {
      if (!universo.includes(numero)) errors.push(`unsupported_number:${numero}`);
    }
  }
  return { ok: errors.length === 0, errors: [...new Set(errors)] };
}

export function createLlmProvider({ env = process.env, fetchImpl = fetch, timeoutMs = 30000, now = () => new Date() } = {}) {
  const config = llmConfig(env);
  const apiKey = String(env.DATTASELLER_LLM_API_KEY ?? "");
  return {
    id: config.provider || "deterministic-template",
    model: config.model || null,
    configured: config.configured,
    /** Metadados seguros para o artefato: nunca inclui chave. */
    describe: () => ({ id: config.provider || "deterministic-template", model: config.model || null, configured: config.configured, authorized: config.configured, note: config.configured ? "provider configurado por variável de ambiente" : "LLM_PROVIDER_REQUIRED: nenhum provider de LLM autorizado no ambiente — composição determinística a partir dos dados reais." }),
    async generate({ action, system_contract, context, source_facts, constraints = [], allowedFacts = [] } = {}) {
      if (!LLM_ACTIONS.includes(action)) throw new AgentError("llm_unsupported_action", `Ação não suportada pelo provider: ${action}`);
      if (!config.configured) throw new AgentError("llm_provider_required", "LLM_PROVIDER_REQUIRED: nenhum provider de LLM autorizado no ambiente.");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: config.model,
            temperature: 0.4,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: `${system_contract}\n\nREGRAS INEGOCIÁVEIS:\n- Use SOMENTE os fatos fornecidos.\n- Nunca invente número, preço, avaliação, depoimento, serviço ou promessa.\n- Responda apenas JSON com as chaves: ${LLM_REQUIRED_KEYS.join(", ")}.\n- Restrições: ${constraints.join(" | ")}` },
              { role: "user", content: JSON.stringify({ context, source_facts }) },
            ],
          }),
        });
        if (!response?.ok) throw new AgentError("llm_provider_error", `Provider respondeu ${response?.status ?? "sem status"}.`);
        const payload = await response.json();
        const conteudo = payload?.choices?.[0]?.message?.content ?? "";
        let data = null;
        try { data = JSON.parse(conteudo); } catch { throw new AgentError("llm_invalid_output", "O provider devolveu conteúdo que não é JSON válido."); }
        const validacao = validateLlmOutput(data, { allowedFacts: allowedFacts.length ? allowedFacts : source_facts });
        if (!validacao.ok) throw new AgentError("llm_invalid_output", "Saída do provider recusada pelo validador determinístico.", { errors: validacao.errors });
        return { ok: true, data, model: config.model, generated_at: now().toISOString(), usage: payload?.usage ?? null };
      } catch (error) {
        if (error instanceof AgentError) throw error;
        if (error?.name === "AbortError") throw new AgentError("llm_provider_timeout", `O provider não respondeu em ${Math.round(timeoutMs / 1000)}s.`);
        throw new AgentError("llm_provider_error", "Falha ao chamar o provider de LLM.");
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
