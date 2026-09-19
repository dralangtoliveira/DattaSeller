/**
 * DS-VALUE-04 — DattaSeller Worker Agent (ação BUILD_REDESIGN).
 *
 * Um executor só, sem multiagente: recebe o job, coleta os ativos reais do
 * cliente, gera a nova versão e devolve o artefato estruturado. O CRM nunca
 * fica esperando a requisição longa: `submit` responde com `job_id` + `status`
 * e o resultado é buscado depois.
 */

import { REDESIGN_ACTION, parseRedesignJob, validateRedesignArtifact } from "./contract.js";
import { collectSiteAssets } from "./collector.js";
import { GENERATOR_VERSION, generateRedesign } from "./generator.js";

const novoId = () => `red_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;

export function createRedesignWorker({ fetchImpl = fetch, resolveHost, now = () => new Date(), contextProvider = null, timeoutMs } = {}) {
  const jobs = new Map();

  async function loadContext(job) {
    if (job.context) return { context: job.context, source: "payload" };
    if (job.context_url && contextProvider) return { context: await contextProvider(job.context_url), source: job.context_url };
    return { context: null, source: null };
  }

  async function buildArtifact(job) {
    const iniciadoEm = Date.now();
    const warnings = [];
    if (!job.diagnosis_id) {
      warnings.push({ code: "redesign_without_diagnosis", message: "Job executado sem diagnóstico (DS-VALUE-03) vinculado; o aceite exige diagnóstico." });
    }
    let contexto = null;
    try {
      const carregado = await loadContext(job);
      contexto = carregado.context;
      if (!contexto) warnings.push({ code: "redesign_without_crm_context", message: "Sem contexto do CRM no job: foram usados apenas os dados públicos do site." });
    } catch (error) {
      warnings.push({ code: error?.code ?? "redesign_context_unavailable", message: `Contexto do CRM indisponível: ${error?.message ?? error}` });
    }
    const lead = contexto?.lead ?? {};
    const diagnosis = contexto?.diagnosis ?? null;
    const coleta = await collectSiteAssets({
      siteUrl: job.site_url,
      fetchImpl,
      resolveHost,
      now,
      timeoutMs,
      known: {
        telefone: lead.telefone,
        whatsapp: lead.whatsapp,
        email: lead.email,
        end_cliente: lead.end_cliente,
        source: lead.source ? `crm:${lead.source}` : "crm",
        source_url: lead.source_url ?? null,
      },
    });
    warnings.push(...coleta.warnings);
    const gerado = generateRedesign({
      lead: { slug: job.lead_slug, nome: lead.nome ?? coleta.site.title },
      site: coleta.site,
      texts: coleta.texts,
      assets: coleta.assets,
      palette: coleta.palette,
      contacts: coleta.contacts,
      diagnosis,
      collectedAt: coleta.site.url,
    });
    warnings.push(...gerado.warnings);
    const artifact = {
      lead_slug: job.lead_slug,
      source_url: job.site_url,
      assets: coleta.assets,
      asset_sources: coleta.asset_sources,
      brand_context: gerado.brand_context,
      generated_html: gerado.html,
      generation_metadata: {
        action: REDESIGN_ACTION,
        generator: GENERATOR_VERSION,
        diagnosis_id: job.diagnosis_id,
        context_source: contexto ? "crm" : null,
        requested_by: job.requested_by,
        layout: gerado.layout,
        site: coleta.site,
        palette: coleta.palette,
        assets_by_kind: coleta.assets.reduce((total, asset) => ({ ...total, [asset.kind]: (total[asset.kind] ?? 0) + 1 }), {}),
        duration_ms: Date.now() - iniciadoEm,
      },
      warnings,
      created_at: now().toISOString(),
      used_assets: gerado.used,
    };
    return { artifact: validateRedesignArtifact(artifact), collection: coleta };
  }

  function submit(payload = {}) {
    const job = parseRedesignJob(payload);
    const job_id = novoId();
    const registro = { job_id, status: "queued", created_at: now().toISOString(), job, artifact: null, collection: null, error: null, promise: null };
    jobs.set(job_id, registro);
    const executar = async () => {
      registro.status = "running";
      registro.started_at = now().toISOString();
      try {
        const { artifact, collection } = await buildArtifact(job);
        registro.artifact = artifact;
        registro.collection = collection;
        registro.status = "completed";
      } catch (error) {
        registro.status = "failed";
        registro.error = { code: error?.code ?? "redesign_failed", message: error?.message ?? "Falha ao gerar o redesign.", details: error?.details ?? null };
      } finally {
        registro.finished_at = now().toISOString();
      }
      return registro;
    };
    // O trabalho começa no próximo tick: `submit` responde imediatamente com
    // `queued` e o CRM nunca fica esperando a geração.
    registro.promise = new Promise((resolve, reject) => {
      setTimeout(() => { executar().then(resolve, reject); }, 0);
    });
    return { job_id, status: registro.status, action: REDESIGN_ACTION };
  }

  function status(job_id) {
    const registro = jobs.get(job_id);
    if (!registro) return null;
    return {
      job_id,
      status: registro.status,
      action: REDESIGN_ACTION,
      created_at: registro.created_at,
      started_at: registro.started_at ?? null,
      finished_at: registro.finished_at ?? null,
      error: registro.error,
      artifact: registro.status === "completed" ? registro.artifact : null,
    };
  }

  return { submit, status, wait: (job_id) => jobs.get(job_id)?.promise ?? null, jobs: () => [...jobs.keys()] };
}

/** Execução avulsa (VPS/CLI): submete e espera o artefato. */
export async function runRedesignOnce(payload, deps = {}) {
  const worker = createRedesignWorker(deps);
  const { job_id } = worker.submit(payload);
  const registro = await worker.wait(job_id);
  if (!registro || registro.status !== "completed") {
    throw new Error(registro?.error?.message ?? "Job de redesign não concluído.");
  }
  return registro.artifact;
}
