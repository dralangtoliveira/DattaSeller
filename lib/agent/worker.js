/**
 * DattaSeller Agent — um processo, várias ações.
 *
 * Evolui o worker existente (BUILD_REDESIGN preservado) e acrescenta
 * ANALYZE_SOCIAL e BUILD_SOCIAL_DEMO. Nenhum multiagente, nenhuma segunda
 * arquitetura: mesmo registro de jobs, mesma autenticação, mesmo contrato.
 */

import { AGENT_ACTIONS, AgentError, parseSocialJob, validateSocialAuditArtifact, validateSocialDemoArtifact } from "./contract.js";
import { analyzeFromBrowserEvidence, analyzeSocialProfile } from "./social.js";
import { buildSocialDemo } from "./social-demo.js";
import { collectSiteAssets } from "../redesign/collector.js";
import { buildBrandContext } from "../redesign/generator.js";
import { createRedesignWorker } from "../redesign/worker.js";

const novoId = (prefixo) => `${prefixo}_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

/** Provider de LLM: interface abstrata. Sem provider autorizado no ambiente, o
 *  runtime determinístico é usado e o artefato registra isso explicitamente. */
export const LLM_PROVIDERS = { none: "deterministic-template", openai: "openai", anthropic: "anthropic", local: "local" };

export function resolveLlmProvider(env = process.env) {
  if (env.DATTASELLER_LLM_PROVIDER && env.DATTASELLER_LLM_API_KEY) {
    return { id: String(env.DATTASELLER_LLM_PROVIDER), authorized: true, note: "provider configurado por variável de ambiente" };
  }
  return { id: LLM_PROVIDERS.none, authorized: false, note: "Nenhum provider de LLM autorizado no ambiente: composição determinística a partir de dados reais (sem execução agentic de LLM)." };
}

export function createAgent({ fetchImpl = fetch, resolveHost, now = () => new Date(), contextProvider = null, timeoutMs, requireContext = false, env = process.env } = {}) {
  const redesign = createRedesignWorker({ fetchImpl, resolveHost, now, contextProvider, timeoutMs, requireContext });
  const jobs = new Map();

  async function loadContext(job) {
    if (job.context) return job.context;
    if (job.context_url && contextProvider) return contextProvider(job.context_url);
    return null;
  }

  async function contextoDoLead(job) {
    try {
      const contexto = await loadContext(job);
      if (contexto) return contexto;
      if (requireContext) throw new AgentError("social_context_required", "Contexto do CRM é obrigatório no modo worker remoto e não pôde ser obtido.");
      return null;
    } catch (error) {
      if (requireContext) throw error;
      return null;
    }
  }

  async function executarAnalise(job) {
    const contexto = await contextoDoLead(job);
    const lead = contexto?.lead ?? {};
    const perfilUrl = job.profile_url ?? clean(lead.instagram_url) ?? clean(lead.tiktok_url);
    if (!perfilUrl) throw new AgentError("social_profile_required", "O lead não tem perfil social público registrado (Instagram/TikTok).");
    // Perna de browser tem prioridade quando o agente conseguiu ler a página
    // pública num browser real (Instagram costuma bloquear HTML puro).
    const analise = job.browser_evidence
      ? analyzeFromBrowserEvidence({ profileUrl: perfilUrl, platform: job.platform ?? (perfilUrl.includes("tiktok") ? "tiktok" : "instagram"), evidence: job.browser_evidence })
      : await analyzeSocialProfile({ profileUrl: perfilUrl, platform: job.platform ?? (perfilUrl.includes("tiktok") ? "tiktok" : "instagram"), fetchImpl, resolveHost, timeoutMs, now });
    const artifact = {
      lead_slug: job.lead_slug,
      platform: analise.platform,
      profile_url: analise.profile_url,
      handle: analise.handle,
      checked_at: analise.checked_at,
      bio: analise.bio,
      cta: analise.cta,
      links: analise.links,
      visual_identity: analise.visual_identity,
      consistency_note: analise.consistency_note,
      frequency_note: analise.frequency_note,
      formats: analise.formats,
      facts: analise.facts,
      evidence: analise.evidence,
      warnings: analise.warnings,
      counters: analise.counters,
      display_name: analise.display_name,
      evidence_source: analise.evidence_source ?? "http",
      context_source: contexto ? "crm" : null,
    };
    return { artifact: validateSocialAuditArtifact(artifact), analise };
  }

  async function executarDemo(job) {
    const contexto = await contextoDoLead(job);
    const lead = contexto?.lead ?? {};
    if (!lead.site_antigo) throw new AgentError("social_demo_site_required", "Demonstração social exige o site público do lead.");
    const coleta = await collectSiteAssets({ siteUrl: lead.site_antigo, fetchImpl, resolveHost, now, timeoutMs, known: { telefone: lead.telefone, whatsapp: lead.whatsapp, email: lead.email, end_cliente: lead.end_cliente, source: lead.source ? `crm:${lead.source}` : "crm", source_url: lead.source_url ?? null } });
    const analise = contexto?.social_audit ?? null;
    const gerado = buildSocialDemo({
      lead: { slug: job.lead_slug, nome: lead.nome, cidade: lead.cidade, nicho: lead.nicho },
      analysis: analise,
      brand: {
        wordmark: clean(lead.nome || coleta.texts.headline).slice(0, 60),
        colors: buildBrandContext({ lead, site: coleta.site, texts: coleta.texts, assets: coleta.assets, palette: coleta.palette, contacts: coleta.contacts, diagnosis: contexto?.diagnosis ?? null }).colors,
        logo: coleta.assets.find((asset) => asset.kind === "logo") ? { kind: "image", url: coleta.assets.find((asset) => asset.kind === "logo").url } : { kind: "typographic" },
        photos: coleta.assets.filter((asset) => asset.kind === "photo").map((asset) => asset.url),
      },
      texts: { headline: coleta.texts.headline, paragraph: coleta.texts.paragraphs?.[0] ?? "", services: coleta.texts.services, paragraphs: coleta.texts.paragraphs },
      contacts: coleta.contacts,
      diagnosis: contexto?.diagnosis ?? null,
      now,
    });
    const artifact = {
      lead_slug: job.lead_slug,
      source_profile_url: analise?.profile_url ?? null,
      brand_context: gerado.brand_context,
      direction: gerado.direction,
      calendar: gerado.calendar,
      feed_pieces: gerado.feed_pieces,
      stories: gerado.stories,
      generated_html: gerado.html,
      generation_metadata: {
        action: AGENT_ACTIONS.socialDemo,
        llm: resolveLlmProvider(env),
        assets_by_kind: coleta.assets.reduce((total, asset) => ({ ...total, [asset.kind]: (total[asset.kind] ?? 0) + 1 }), {}),
        site: coleta.site,
        context_source: contexto ? "crm" : null,
        commercial_context: Boolean(contexto),
      },
      warnings: [...coleta.warnings, ...gerado.warnings],
      pending: gerado.pending,
      created_at: now().toISOString(),
    };
    return { artifact: validateSocialDemoArtifact(artifact), coleta };
  }

  function submitSocial(payload = {}) {
    const job = parseSocialJob(payload);
    const job_id = novoId("soc");
    const registro = { job_id, status: "queued", action: job.action, created_at: now().toISOString(), artifact: null, error: null, promise: null };
    jobs.set(job_id, registro);
    const executar = async () => {
      registro.status = "running";
      registro.started_at = now().toISOString();
      try {
        registro.artifact = job.action === AGENT_ACTIONS.socialAnalysis ? (await executarAnalise(job)).artifact : (await executarDemo(job)).artifact;
        registro.status = "completed";
      } catch (error) {
        registro.status = "failed";
        registro.error = { code: error?.code ?? "social_failed", message: error?.message ?? "Falha na ação social.", details: error?.details ?? null };
      } finally {
        registro.finished_at = now().toISOString();
      }
      return registro;
    };
    registro.promise = new Promise((resolve, reject) => { setTimeout(() => { executar().then(resolve, reject); }, 0); });
    return { job_id, status: registro.status, action: job.action };
  }

  function statusSocial(job_id) {
    const registro = jobs.get(job_id);
    if (!registro) return null;
    return { job_id, status: registro.status, action: registro.action, created_at: registro.created_at, started_at: registro.started_at ?? null, finished_at: registro.finished_at ?? null, error: registro.error, artifact: registro.status === "completed" ? registro.artifact : null };
  }

  return {
    redesign,
    submit(payload) {
      const action = String(payload?.action ?? AGENT_ACTIONS.redesign);
      if (action === AGENT_ACTIONS.redesign) return { ...redesign.submit(payload), action };
      return submitSocial({ ...payload, action });
    },
    status(job_id) {
      return redesign.status(job_id) ?? statusSocial(job_id);
    },
    wait(job_id) {
      return redesign.wait(job_id) ?? jobs.get(job_id)?.promise ?? null;
    },
    llm: () => resolveLlmProvider(env),
  };
}
