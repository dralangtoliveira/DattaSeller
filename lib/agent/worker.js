/**
 * DattaSeller Agent — um processo, várias ações.
 *
 * Evolui o worker existente (BUILD_REDESIGN preservado) e acrescenta
 * ANALYZE_SOCIAL e BUILD_SOCIAL_DEMO. Nenhum multiagente, nenhuma segunda
 * arquitetura: mesmo registro de jobs, mesma autenticação, mesmo contrato.
 */

import { AGENT_ACTIONS, AgentError, parseSocialJob, validateSocialAuditArtifact, validateSocialDemoArtifact } from "./contract.js";
import { analyzeFromBrowserEvidence, analyzeSocialProfile } from "./social.js";
import { browserEvidenceFrom, browserPublicPage } from "./browser.js";
import { buildSocialDemo } from "./social-demo.js";
import { collectSiteAssets } from "../redesign/collector.js";
import { buildBrandContext } from "../redesign/generator.js";
import { createRedesignWorker } from "../redesign/worker.js";
import { createLlmProvider } from "./llm.js";
import { NEVER_SAY } from "./social-demo.js";

export const SOCIAL_SYSTEM_CONTRACT = "Você é redator sênior de social media do DattaSeller. Melhore tom, gancho e legenda das peças seguindo o material original (Nome, O que vende, Público, Tom de voz, O que NUNCA dizer), sem inventar nenhum fato.";

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

export function createAgent({ fetchImpl = fetch, resolveHost, now = () => new Date(), contextProvider = null, timeoutMs, requireContext = false, env = process.env, browserTool = browserPublicPage, llmProvider = null } = {}) {
  const redesign = createRedesignWorker({ fetchImpl, resolveHost, now, contextProvider, timeoutMs, requireContext });
  const jobs = new Map();
  const llm = llmProvider ?? createLlmProvider({ env, fetchImpl, now });

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
    const plataforma = job.platform ?? (perfilUrl.includes("tiktok") ? "tiktok" : "instagram");
    // Ordem operacional do agente: (1) fonte HTTP pública; (2) se insuficiente ou
    // com muro de login, a própria ferramenta de browser do agente coleta a
    // página pública. `browser_evidence` no job é apenas atalho de teste/dev.
    let analise = null;
    const avisos = [];
    const tentarHttp = async () => analyzeSocialProfile({ profileUrl: perfilUrl, platform: plataforma, fetchImpl, resolveHost, timeoutMs, now });
    if (job.browser_evidence) {
      analise = analyzeFromBrowserEvidence({ profileUrl: perfilUrl, platform: plataforma, evidence: job.browser_evidence });
    } else {
      try {
        analise = await tentarHttp();
      } catch (error) {
        avisos.push({ code: "social_http_insufficient", cause: error?.code ?? null, message: `Fonte HTTP pública insuficiente: ${error?.message ?? error}` });
        const coletado = await browserTool({ url: perfilUrl, purpose: `social:${job.lead_slug}`, resolveHost, now, timeoutMs: timeoutMs ?? undefined });
        avisos.push(...(coletado.warnings ?? []));
        analise = analyzeFromBrowserEvidence({ profileUrl: perfilUrl, platform: plataforma, evidence: browserEvidenceFrom(coletado) });
        analise.browser_tool = { status: coletado.status, final_url: coletado.final_url, links: coletado.links.length, tabs: coletado.tabs.length, images_public: coletado.images_public.length };
      }
    }
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
      warnings: [...avisos, ...analise.warnings],
      counters: analise.counters,
      display_name: analise.display_name,
      evidence_source: analise.evidence_source ?? "http",
      browser_tool: analise.browser_tool ?? null,
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
    // LLM (quando autorizado) melhora tom/gancho/legenda; o código valida schema e
    // fatos antes de aceitar. Sem provider, a copy segue determinística.
    let copyOverrides = null;
    const llmAvisos = [];
    const fatosPermitidos = [coleta.texts.headline, ...(coleta.texts.services ?? []), ...(coleta.texts.paragraphs ?? []), coleta.site.title, lead.nome, lead.cidade, lead.nicho, analise?.bio, analise?.counters?.followers, coleta.contacts.address?.value, ...(coleta.assets ?? []).map((asset) => asset.url)].filter(Boolean).map(String);
    if (llm.configured) {
      try {
        const saida = await llm.generate({
          action: AGENT_ACTIONS.socialDemo,
          system_contract: SOCIAL_SYSTEM_CONTRACT,
          context: { lead: { nome: lead.nome, cidade: lead.cidade, nicho: lead.nicho }, brand: { colors: buildBrandContext({ lead, site: coleta.site, textos: coleta.texts, assets: coleta.assets, palette: coleta.palette, contacts: coleta.contacts }).colors }, services: coleta.texts.services },
          source_facts: fatosPermitidos,
          constraints: NEVER_SAY,
          allowedFacts: fatosPermitidos,
        });
        copyOverrides = saida.data;
      } catch (error) {
        llmAvisos.push({ code: error?.code ?? "llm_failed", message: error?.message ?? "LLM indisponível: mantida a composição determinística." });
      }
    } else {
      llmAvisos.push({ code: "llm_provider_required", message: "LLM_PROVIDER_REQUIRED: sem provider autorizado, a copy é determinística a partir dos dados reais." });
    }
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
      copyOverrides,
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
        llm: { ...llm.describe(), used: Boolean(copyOverrides) },
        assets_by_kind: coleta.assets.reduce((total, asset) => ({ ...total, [asset.kind]: (total[asset.kind] ?? 0) + 1 }), {}),
        site: coleta.site,
        context_source: contexto ? "crm" : null,
        commercial_context: Boolean(contexto),
      },
      warnings: [...coleta.warnings, ...gerado.warnings, ...llmAvisos],
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
