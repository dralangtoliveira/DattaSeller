import { Resend } from "resend";
import { after } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resendConfigurationError, resolveEmailRecipient } from "@/lib/email/provider";
// @ts-expect-error helper is deliberately exercised by node:test without a build step.
import { buildFollowUpDraft, canScheduleFollowUp, isFollowUpDue } from "@/lib/email/follow-up.js";
// @ts-expect-error helper is deliberately exercised by node:test without a build step.
import { contractDocxFilename, contractDocxMime, renderContractDocx } from "@/lib/contracts/docx.js";
// @ts-expect-error helper is deliberately exercised by node:test without a build step.
import { negotiatedPriceError, planOrderCoupon } from "@/lib/coupons/coupon.js";
import { canGenerateContract, canSoftDeleteLead, firstDisallowedKey, isSafeLeadSlug, LEAD_INPUT_KEYS, sellerName, SOCIAL_AUDIT_INPUT_KEYS } from "@/lib/hardening/guards";
// @ts-expect-error helper is deliberately exercised by node:test without a build step.
import { duplicateOf, isPublicHttpUrl, normalizeEmail, normalizePhone, normalizeQualification, normalizeUrl } from "@/lib/prospector.js";
// @ts-expect-error motor de descoberta real (DS-VALUE-01) exercitado por node:test sem build.
import { DISCOVERY_DEFAULT_LIMIT, DISCOVERY_DEFAULT_QUANTITY, DISCOVERY_MAX_LIMIT, DISCOVERY_QUANTITY_RULE, DiscoveryError, discoverCompanies } from "@/lib/discovery/provider.js";
// @ts-expect-error ponte descoberta → lead exercitada por node:test sem build.
import { disambiguateSlug, resultsToCandidates } from "@/lib/discovery/candidates.js";
// @ts-expect-error motor de enriquecimento real (DS-VALUE-02) exercitado por node:test sem build.
import { EnrichmentError, enrichLead, planEnrichmentUpdate } from "@/lib/enrichment/provider.js";
// @ts-expect-error diagnóstico factual do site real (DS-VALUE-03) exercitado por node:test sem build.
import { DiagnosisError, diagnoseSite } from "@/lib/diagnosis/site.js";
// @ts-expect-error contrato e executor do redesign (DS-VALUE-04) exercitados por node:test sem build.
import { REDESIGN_ACTION, RedesignError, parseRedesignJob, validateRedesignArtifact } from "@/lib/redesign/contract.js";
// @ts-expect-error executor do redesign (DS-VALUE-04) exercitado por node:test sem build.
import { createRedesignWorker } from "@/lib/redesign/worker.js";
// @ts-expect-error contrato e agente social (DS-VALUE-05/06) exercitados por node:test sem build.
import { AGENT_ACTIONS, AgentError, parseSocialJob, validateSocialAuditArtifact, validateSocialDemoArtifact } from "@/lib/agent/contract.js";
// @ts-expect-error agente social (DS-VALUE-05/06) exercitado por node:test sem build.
import { createAgent } from "@/lib/agent/worker.js";
// @ts-expect-error helper is deliberately exercised by node:test without a build step.
import { withProspectorEditor } from "@/lib/prospector-preview-editor.js";
// @ts-expect-error helper is deliberately exercised by node:test without a build step.
import { renderProspectorComparator } from "@/lib/prospector-comparator.js";
// @ts-expect-error helper is deliberately exercised by node:test without a build step.
import { renderProspectorProposalCover } from "@/lib/prospector-proposal-cover.js";
// @ts-expect-error helper is deliberately exercised by node:test without a build step.
import { renderProspectorRedesign } from "@/lib/prospector-redesign.js";
// @ts-expect-error Central Datta360 commercial catalog is plain JS.
import { buildCommercialSnapshot } from "@/lib/commercial/datta360-catalog.js";

export const runtime = "nodejs";
// A descoberta consulta fontes públicas reais (Nominatim + Overpass) e precisa
// de folga sobre o timeout padrão da função.
export const maxDuration = 60;
type Db = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type Qualification = { facts: string[]; hypotheses: string[]; recommendation: string; reason: string; confidence: string; validation_question: string; next_action: string; owner: string };
type NormalizedQualification = { value: Qualification | null; error?: string };
type SavedQualification = Qualification & { id: string; lead_slug: string };
const tables: Record<string, string> = { proposals: "ds_proposals", emails: "ds_emails", orders: "ds_orders", checkouts: "ds_checkouts", payments: "ds_payments", contracts: "ds_contracts", handoffs: "ds_handoffs", commissions: "ds_commissions", qualifications: "ds_qualifications", diagnoses: "ds_site_diagnoses", "social-audits": "ds_social_audits", previews: "ds_previews", timeline: "ds_timeline" };
const id = (prefix: string) => `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
const now = () => new Date().toISOString();
const proposalArtifactIds = (value: unknown) => Array.isArray(value) && value.every((item) => typeof item === "string" && /^[A-Za-z0-9_-]{3,64}$/.test(item)) ? value as string[] : null;

async function proposalArtifactsBelongToLead(db: Db, leadSlug: string, refs: { preview_ids: string[]; diagnosis_ids: string[]; social_audit_ids: string[] }) {
  if (!isSafeLeadSlug(leadSlug)) return { ok: false as const };
  const [lead, previews, diagnoses, social] = await Promise.all([
    db.from("ds_leads").select("slug").eq("slug", leadSlug).is("deleted_at", null).maybeSingle(),
    db.from("ds_previews").select("id").eq("lead_slug", leadSlug).in("id", refs.preview_ids),
    db.from("ds_site_diagnoses").select("id").eq("lead_slug", leadSlug).in("id", refs.diagnosis_ids),
    db.from("ds_social_audits").select("id").eq("lead_slug", leadSlug).in("id", refs.social_audit_ids),
  ]);
  if (lead.error || previews.error || diagnoses.error || social.error) return { error: true as const };
  return { ok: Boolean(lead.data) && (previews.data?.length ?? 0) === refs.preview_ids.length && (diagnoses.data?.length ?? 0) === refs.diagnosis_ids.length && (social.data?.length ?? 0) === refs.social_audit_ids.length };
}

// Executor de redesign em modo inline (dev/local). Em produção o CRM delega para
// o DattaSeller Worker Agent (DATTASELLER_WORKER_URL) e não mantém requisição longa.
const inlineRedesignWorker = () => (globalThis as unknown as { __dsRedesignWorker?: ReturnType<typeof createRedesignWorker> }).__dsRedesignWorker ??= createRedesignWorker();
const inlineAgent = () => (globalThis as unknown as { __dsAgent?: ReturnType<typeof createAgent> }).__dsAgent ??= createAgent();
const redesignWorkerUrl = () => String(process.env.DATTASELLER_WORKER_URL ?? "").replace(/\/$/, "");
const redesignWorkerHeaders = () => ({ "Content-Type": "application/json", ...(process.env.DATTASELLER_WORKER_SECRET ? { "x-worker-secret": String(process.env.DATTASELLER_WORKER_SECRET) } : {}) });

/**
 * DS-VALUE-04 — ingere o artefato do worker na infraestrutura existente de
 * preview (`ds_previews`) de forma idempotente: o mesmo job nunca cria dois
 * previews. Também registra a trilha e vincula o lead à nova versão.
 */
/**
 * DS-VALUE-05 — persiste a auditoria social no modelo existente
 * (`ds_social_audits`), idempotente por job.
 */
async function ingestSocialAudit(db: Db, jobId: string, artifact: Record<string, unknown>) {
  const leadSlug = String(artifact.lead_slug ?? "");
  const { data: existente, error: leituraError } = await db.from("ds_timeline").select("detail").eq("event", "social.analysis.persisted").like("detail", `${jobId}|%`).limit(1).maybeSingle();
  if (leituraError) return { error: "storage_unavailable" };
  if (existente?.detail) return { audit_id: String(existente.detail).split("|")[1] ?? null, reused: true };
  const audit_id = id("social");
  const visual = artifact.visual_identity as Record<string, unknown> | null;
  const row = {
    id: audit_id,
    lead_slug: leadSlug,
    platform: String(artifact.platform ?? "instagram"),
    url: String(artifact.profile_url ?? ""),
    username: String(artifact.handle ?? ""),
    bio: String(artifact.bio ?? ""),
    cta: String(artifact.cta ?? ""),
    link: Array.isArray(artifact.links) ? (artifact.links as unknown[]).join(" ") : "",
    visual_identity: visual ? `${String(visual.profile_image ?? "")} — ${String(visual.note ?? "")}` : String(artifact.consistency_note ?? ""),
    consistency_note: String(artifact.consistency_note ?? ""),
    frequency_note: String(artifact.frequency_note ?? ""),
    factual_notes: JSON.stringify({ facts: artifact.facts ?? [], counters: artifact.counters ?? null, formats: artifact.formats ?? [], warnings: artifact.warnings ?? [], evidence_source: artifact.evidence_source ?? "http" }),
    recommendation: "",
    creative_direction: "",
    evidence: JSON.stringify(artifact.evidence ?? []),
  };
  const { error: insertError } = await db.from("ds_social_audits").insert(row);
  if (insertError) return { error: "storage_unavailable" };
  await event(db, leadSlug, "social.analysis.generated", `${jobId} · ${row.platform} @${row.username}${row.cta ? " · CTA público" : ""}`);
  await event(db, leadSlug, "social.analysis.persisted", `${jobId}|${audit_id}`);
  return { audit_id, reused: false };
}

/** DS-VALUE-06 — persiste a demonstração social visual no preview existente. */
async function ingestSocialDemo(db: Db, jobId: string, artifact: Record<string, unknown>) {
  const leadSlug = String(artifact.lead_slug ?? "");
  const { data: existente, error: leituraError } = await db.from("ds_timeline").select("detail").eq("event", "social.demo.persisted").like("detail", `${jobId}|%`).limit(1).maybeSingle();
  if (leituraError) return { error: "storage_unavailable" };
  if (existente?.detail) return { preview_id: String(existente.detail).split("|")[1] ?? null, reused: true };
  const preview_id = id("preview");
  const { error: insertError } = await db.from("ds_previews").insert({ id: preview_id, lead_slug: leadSlug, kind: "social_demo", url: `/api/previews/${preview_id}`, content: String(artifact.generated_html ?? ""), status: "ready" });
  if (insertError) return { error: "storage_unavailable" };
  const metadata = (artifact.generation_metadata ?? {}) as Record<string, unknown>;
  const llm = (metadata.llm ?? {}) as Record<string, unknown>;
  await event(db, leadSlug, "social.demo.generated", `${jobId} · 7 dias · 3 peças · 3 stories · LLM: ${String(llm.id ?? "n/d")}${llm.authorized ? "" : " (determinístico)"}`);
  await event(db, leadSlug, "social.demo.persisted", `${jobId}|${preview_id}`);
  return { preview_id, reused: false };
}

async function ingestRedesign(db: Db, jobId: string, artifact: Record<string, unknown>) {
  const leadSlug = String(artifact.lead_slug ?? "");
  const { data: existente, error: leituraError } = await db.from("ds_timeline").select("detail").eq("event", "redesign.persisted").like("detail", `${jobId}|%`).limit(1).maybeSingle();
  if (leituraError) return { error: "storage_unavailable" };
  if (existente?.detail) return { preview_id: String(existente.detail).split("|")[1] ?? null, reused: true };
  const preview_id = id("preview");
  const { error: insertError } = await db.from("ds_previews").insert({ id: preview_id, lead_slug: leadSlug, kind: "redesign", url: `/api/previews/${preview_id}`, content: String(artifact.generated_html ?? ""), status: "ready" });
  if (insertError) return { error: "storage_unavailable" };
  const brand = (artifact.brand_context ?? {}) as Record<string, unknown>;
  const warnings = Array.isArray(artifact.warnings) ? (artifact.warnings as Array<Record<string, unknown>>).map((item) => String(item?.code ?? "")).filter(Boolean) : [];
  await event(db, leadSlug, "redesign.generated", `${jobId} · layout ${String(brand.layout ?? "n/d")} · ${Array.isArray(artifact.assets) ? artifact.assets.length : 0} ativo(s)${warnings.length ? ` · avisos: ${warnings.join(", ")}` : ""}`);
  await event(db, leadSlug, "redesign.persisted", `${jobId}|${preview_id}`);
  const { data: leadRow } = await db.from("ds_leads").select("status").eq("slug", leadSlug).maybeSingle();
  const patch: Record<string, unknown> = { url_nova: `/api/previews/${preview_id}`, updated_at: now() };
  if (String(leadRow?.status ?? "novo") === "novo") patch.status = "redesenhado";
  await db.from("ds_leads").update(patch).eq("slug", leadSlug);
  return { preview_id, reused: false };
}

/**
 * O rascunho do CRM não guarda destinatário (o e-mail do lead é a fonte), então o
 * envio real precisa resolver e persistir o destinatário antes da transição —
 * mesmo critério de `/api/email-send`. Sem isso o provedor receberia `null`.
 */
async function hydrateEmailRecipient(db: Db, emailId: string) {
  const { data: email } = await db.from("ds_emails").select("id,lead_slug,recipient").eq("id", emailId).maybeSingle();
  if (!email || String(email.recipient ?? "").trim()) return;
  const { data: lead } = await db.from("ds_leads").select("email").eq("slug", email.lead_slug).maybeSingle();
  const recipient = resolveEmailRecipient(email, lead);
  if (!recipient) return;
  await db.from("ds_emails").update({ recipient, updated_at: now() }).eq("id", emailId);
}

async function context() {
  const db = await createSupabaseServerClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data: profile } = await db.from("ds_users").select("role").eq("id", user.id).maybeSingle();
  return profile?.role === "admin" ? { db, user } : null;
}
const out = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const storageUnavailable = () => out({ error: "storage_unavailable" }, 503);
async function event(db: Db, lead: string | null, name: string, detail = "", demo = false) {
  await db.from("ds_timeline").insert({ id: id("evt"), lead_slug: lead, event: name, detail, is_demo: demo });
}
async function settings(db: Db) {
  const { data, error } = await db.from("ds_settings").select("key,value");
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((row) => [row.key, row.value]));
}
async function followUp(db: Db, emailId: string) {
  const { data: parent, error: parentError } = await db.from("ds_emails").select("*").eq("id", emailId).maybeSingle();
  if (parentError) return storageUnavailable();
  if (!parent) return out({ error: "email_not_found" }, 404);
  if (!canScheduleFollowUp(parent.status)) return out({ error: "follow_up_requires_sent_email" }, 409);
  const config = await settings(db);
  if (!isFollowUpDue(parent, new Date(), config.followup_days)) return out({ error: "follow_up_not_due" }, 409);
  const { data: open, error: openError } = await db.from("ds_followups").select("*").eq("lead_slug", parent.lead_slug).limit(1).maybeSingle();
  if (openError) return storageUnavailable();
  if (open) return out({ ok: true, duplicate: true, follow_up: open, email_id: open.detail });
  let draft;
  try { draft = buildFollowUpDraft(parent, { sellerName: config.seller_name, days: config.followup_days }); }
  catch { return out({ error: "public_proposal_url_required" }, 409); }
  const row = { id: id("email"), lead_slug: parent.lead_slug, proposal_id: parent.proposal_id || null, sender: parent.sender || null, recipient: parent.recipient || null, reply_to: parent.reply_to || null, subject: draft.subject, body: draft.body, status: "draft", provider: "mock", attempt: 0 };
  const { data: email, error: insertError } = await db.from("ds_emails").insert(row).select().single();
  if (insertError) return storageUnavailable();
  const record = { id: id("fup"), lead_slug: parent.lead_slug, email_id: parent.id, status: "scheduled", due_at: draft.due_at, detail: email.id };
  const { error: recordError } = await db.from("ds_followups").insert(record);
  if (recordError) { await db.from("ds_emails").delete().eq("id", email.id); return storageUnavailable(); }
  await event(db, parent.lead_slug, "email.follow_up.scheduled", email.id);
  return out({ ok: true, duplicate: false, follow_up: record, email }, 201);
}
const leadToUi = (l: Record<string, unknown>) => ({ ...l, siteAntigo: l.site_antigo, urlNova: l.url_nova, dataProposta: l.data_proposta, contratoStatus: l.contrato_status, contratoEm: l.contrato_em, docCliente: l.doc_cliente, endCliente: l.end_cliente });
const uiToLead = (l: Record<string, unknown>) => {
  const x = Object.fromEntries(Object.entries(l).filter(([key]) => LEAD_INPUT_KEYS.has(key))) as Record<string, unknown>;
  for (const [a, b] of [["siteAntigo","site_antigo"],["urlNova","url_nova"],["dataProposta","data_proposta"],["contratoStatus","contrato_status"],["contratoEm","contrato_em"],["docCliente","doc_cliente"],["endCliente","end_cliente"]]) if (a in x) { x[b] = x[a]; delete x[a]; }
  delete x.closingConfirmed;
  return x;
};

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path; const root = parts[0];
  // DS-VALUE-04 — contexto compacto do CRM para o Worker Agent (referência, não
  // duplicação de dados): autorizado por token do worker ou por sessão admin.
  if (root === "worker" && parts[1] === "context") {
    const esperado = String(process.env.DATTASELLER_WORKER_TOKEN ?? "");
    const token = String(request.headers.get("x-dattaseller-worker-token") ?? "");
    let leitura = null;
    if (esperado && token && token === esperado) {
      try { leitura = createSupabaseAdminClient(); } catch { return out({ error: "storage_unavailable" }, 503); }
    } else {
      const sessao = await context(); if (!sessao) return out({ error: "unauthorized" }, 401); leitura = sessao.db;
    }
    const leadSlug = new URL(request.url).searchParams.get("lead_slug") ?? "";
    if (!isSafeLeadSlug(leadSlug)) return out({ error: "invalid_lead_slug" }, 400);
    const [{ data: lead, error: leadError }, { data: diagnosis, error: diagnosisError }, { data: socialAudit, error: socialError }] = await Promise.all([
      leitura.from("ds_leads").select("slug,nome,empresa,cidade,nicho,telefone,whatsapp,email,site_antigo,instagram_url,tiktok_url,end_cliente,source,source_url,source_checked_at,public_contact_type,contact_evidence,status,obs").eq("slug", leadSlug).is("deleted_at", null).maybeSingle(),
      leitura.from("ds_site_diagnoses").select("id,criteria,created_at").eq("lead_slug", leadSlug).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      leitura.from("ds_social_audits").select("id,platform,url,username,bio,cta,link,visual_identity,consistency_note,frequency_note,factual_notes,evidence,created_at").eq("lead_slug", leadSlug).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (leadError || diagnosisError || socialError) return out({ error: "storage_unavailable" }, 503);
    if (!lead) return out({ error: "lead_not_found" }, 404);
    const criteria = (diagnosis?.criteria ?? null) as Record<string, unknown> | null;
    return out({
      lead,
      diagnosis: diagnosis ? { id: diagnosis.id, created_at: diagnosis.created_at, url: criteria?.url ?? null, checked_at: criteria?.checked_at ?? null, fatos: criteria?.fatos ?? null, evidencias: Array.isArray(criteria?.evidencias) ? criteria.evidencias : [] } : null,
      social_audit: socialAudit ?? null,
      contacts: Array.isArray(lead.contact_evidence) ? lead.contact_evidence : [],
    });
  }
  const auth = await context(); if (!auth) return out({ error: "unauthorized" }, 401);
  const { db } = auth;
  if (root === "settings") return out(await settings(db));
  // DS-VALUE-05/06 — acompanha o job social e persiste no CRM (auditoria social
  // em ds_social_audits; demonstração visual no preview existente).
  if (root === "social") {
    const jobId = new URL(request.url).searchParams.get("job") ?? "";
    if (!/^[A-Za-z0-9_-]{3,64}$/.test(jobId)) return out({ error: "invalid_job_id" }, 400);
    const worker = redesignWorkerUrl();
    let estado: Record<string, unknown> | null = null;
    if (worker) {
      try {
        const resposta = await fetch(`${worker}/jobs/${jobId}`, { headers: redesignWorkerHeaders(), signal: AbortSignal.timeout(15000), cache: "no-store" });
        if (resposta.status === 404) return out({ error: "job_not_found" }, 404);
        if (!resposta.ok) return out({ error: "worker_unavailable" }, 503);
        estado = (await resposta.json()) as Record<string, unknown>;
      } catch {
        return out({ error: "worker_unavailable" }, 503);
      }
    } else {
      estado = inlineAgent().status(jobId) as Record<string, unknown> | null;
      if (!estado) return out({ error: "job_not_found", mode: "inline-dev" }, 404);
    }
    const status = String(estado.status ?? "unknown");
    const action = String(estado.action ?? "");
    if (status !== "completed") return out({ job_id: jobId, status, action, error: estado.error ?? null, mode: worker ? "worker" : "inline-dev" });
    if (action === AGENT_ACTIONS.socialDemo) {
      const artifact = validateSocialDemoArtifact(estado.artifact) as Record<string, unknown>;
      const ingerido = await ingestSocialDemo(db, jobId, artifact);
      if (ingerido.error) return storageUnavailable();
      const preview_id = String(ingerido.preview_id ?? "");
      return out({ job_id: jobId, status, action, mode: worker ? "worker" : "inline-dev", preview: { id: preview_id, url: `/api/previews/${preview_id}`, reused: Boolean(ingerido.reused) }, artifact: { lead_slug: artifact.lead_slug, days: (artifact.calendar as unknown[]).length, feed_pieces: (artifact.feed_pieces as unknown[]).length, stories: (artifact.stories as unknown[]).length, llm: (artifact.generation_metadata as Record<string, unknown>)?.llm ?? null, warnings: (artifact.warnings as Array<Record<string, unknown>>).map((item) => item?.code).filter(Boolean) } });
    }
    const artifact = validateSocialAuditArtifact(estado.artifact) as Record<string, unknown>;
    const ingerido = await ingestSocialAudit(db, jobId, artifact);
    if (ingerido.error) return storageUnavailable();
    return out({ job_id: jobId, status, action, mode: worker ? "worker" : "inline-dev", audit: { id: ingerido.audit_id, reused: Boolean(ingerido.reused), platform: artifact.platform, handle: artifact.handle, counters: artifact.counters, warnings: (artifact.warnings as Array<Record<string, unknown>>).map((item) => item?.code).filter(Boolean) } });
  }
  // DS-VALUE-04 — acompanha o job de redesign e persiste o artefato no preview existente.
  if (root === "redesign") {
    const jobId = new URL(request.url).searchParams.get("job") ?? "";
    if (!/^[A-Za-z0-9_-]{3,64}$/.test(jobId)) return out({ error: "invalid_job_id" }, 400);
    const worker = redesignWorkerUrl();
    let estado: Record<string, unknown> | null = null;
    if (worker) {
      try {
        const resposta = await fetch(`${worker}/jobs/${jobId}`, { headers: redesignWorkerHeaders(), signal: AbortSignal.timeout(15000), cache: "no-store" });
        if (resposta.status === 404) return out({ error: "job_not_found" }, 404);
        if (!resposta.ok) return out({ error: "worker_unavailable" }, 503);
        estado = (await resposta.json()) as Record<string, unknown>;
      } catch {
        return out({ error: "worker_unavailable" }, 503);
      }
    } else {
      estado = inlineRedesignWorker().status(jobId) as Record<string, unknown> | null;
      if (!estado) return out({ error: "job_not_found", mode: "inline-dev" }, 404);
    }
    const status = String(estado.status ?? "unknown");
    if (status !== "completed") return out({ job_id: jobId, status, action: REDESIGN_ACTION, error: estado.error ?? null, mode: worker ? "worker" : "inline-dev" });
    const artifact = validateRedesignArtifact(estado.artifact) as Record<string, unknown>;
    const ingerido = await ingestRedesign(db, jobId, artifact);
    if (ingerido.error) return storageUnavailable();
    const preview_id = String(ingerido.preview_id ?? "");
    const brand = (artifact.brand_context ?? {}) as Record<string, unknown>;
    return out({
      job_id: jobId,
      status,
      action: REDESIGN_ACTION,
      mode: worker ? "worker" : "inline-dev",
      preview: { id: preview_id, url: `/api/previews/${preview_id}`, editor_url: `/api/previews/${preview_id}/editor`, comparator_url: `/api/comparators/${String(artifact.lead_slug)}`, reused: Boolean(ingerido.reused) },
      artifact: { lead_slug: artifact.lead_slug, source_url: artifact.source_url, assets: (artifact.assets as unknown[]).length, layout: brand.layout ?? null, warnings: (artifact.warnings as Array<Record<string, unknown>>).map((item) => item?.code).filter(Boolean), created_at: artifact.created_at },
    });
  }
  if (root === "contracts" && parts[2] === "docx") {
    const { data: contract, error: contractError } = await db.from("ds_contracts").select("*").eq("id", parts[1]).maybeSingle();
    if (contractError) return storageUnavailable();
    if (!contract) return out({ error: "contract_not_found" }, 404);
    const { data: order, error: orderError } = await db.from("ds_orders").select("*,ds_leads(nome,empresa,cidade),ds_products(is_demo,terms)").eq("id", contract.order_id).maybeSingle();
    if (orderError) return storageUnavailable();
    if (!order) return out({ error: "order_not_found" }, 404);
    const lead = (order.ds_leads ?? {}) as Record<string, string>, product = (order.ds_products ?? {}) as Record<string, unknown>;
    if (product?.is_demo === true) return out({ error: "demo_product_contract_forbidden" }, 409);
    const file = renderContractDocx({ clientName: lead?.nome || order.lead_slug, company: lead?.empresa, city: lead?.cidade, offerName: order.offer_name, currency: order.currency, value: order.negotiated_price, terms: product?.terms, status: contract.status, sellerName: order.seller, generatedAt: contract.created_at, reference: contract.id }) as BlobPart;
    return new Response(new Blob([file], { type: contractDocxMime }), { headers: { "Content-Type": contractDocxMime, "Content-Disposition": `attachment; filename="${contractDocxFilename(contract.id)}"`, "Cache-Control": "no-store" } });
  }
  if (root === "products") { const { data, error } = await db.from("ds_products").select("*").order("id"); return error ? storageUnavailable() : out(data); }
  if (root === "leads") { const { data, error } = await db.from("ds_leads").select("*").is("deleted_at", null).order("updated_at", { ascending: false }); return error ? storageUnavailable() : out((data ?? []).map(leadToUi)); }
  // Leitura da trilha de auditoria exigida pela cadeia canônica (passo `email_timeline`
  // e `reload` do runner E2E). Filtro opcional por lead, com slug validado.
  if (root === "timeline") {
    const lead = new URL(request.url).searchParams.get("lead");
    if (lead && !isSafeLeadSlug(lead)) return out({ error: "invalid_lead_slug" }, 400);
    const base = db.from("ds_timeline").select("*");
    const { data, error } = await (lead ? base.eq("lead_slug", lead) : base).order("created_at", { ascending: false }).limit(500);
    if (error) return storageUnavailable();
    return out(((data ?? []) as Array<Record<string, unknown>>).map(row => ({ id: row.id, leadSlug: row.lead_slug, event: row.event, detail: row.detail, isDemo: row.is_demo ?? false, createdAt: row.created_at })));
  }
  if (root === "config") return out({ contratante: await settings(db), dattavps: {} });
  if (root === "financial") {
    const [{ data: orders }, { data: payments }, { data: commissions }, { data: products }] = await Promise.all([db.from("ds_orders").select("*").eq("status", "paid"), db.from("ds_payments").select("amount,status"), db.from("ds_commissions").select("amount"), db.from("ds_products").select("id,billing")]);
    const paid = orders ?? [], received = (payments ?? []).filter((p) => p.status === "approved").reduce((a, p) => a + Number(p.amount), 0);
    const recurring = new Set((products ?? []).filter((p) => p.billing === "recurring").map((p) => p.id));
    const revenue = paid.reduce((a, o) => a + Number(o.negotiated_price), 0), cost = paid.reduce((a, o) => a + Number(o.cost), 0), margin = paid.reduce((a, o) => a + Number(o.margin), 0), mrr = paid.filter((o) => recurring.has(o.product_id)).reduce((a, o) => a + Number(o.negotiated_price), 0);
    return out({ sales: paid.length, revenue, cost, margin, received, receivable: revenue - received, mrr, projection: revenue + mrr * 12, commission: (commissions ?? []).reduce((a, c) => a + Number(c.amount), 0) });
  }
  if (root === "contracts" && parts[2] === "html") { const { data } = await db.from("ds_contracts").select("html").eq("id", parts[1]).maybeSingle(); return new Response(data?.html ?? "Contrato não encontrado", { status: data ? 200 : 404, headers: { "Content-Type": "text/html; charset=utf-8" } }); }
  if (root === "proposals" && parts[1] && parts[2] === "cover") { const { data: proposal, error: proposalError } = await db.from("ds_proposals").select("id,lead_slug,artifacts").eq("id", parts[1]).maybeSingle(); if (proposalError) return storageUnavailable(); if (!proposal) return out({ error: "proposal_not_found" }, 404); const artifacts = proposal.artifacts && typeof proposal.artifacts === "object" ? proposal.artifacts as { preview_ids?: unknown } : {}; const previewId = Array.isArray(artifacts.preview_ids) && typeof artifacts.preview_ids[0] === "string" ? artifacts.preview_ids[0] : null; if (!previewId) return out({ error: "proposal_requires_preview" }, 409); const [{ data: lead, error: leadError }, { data: preview, error: previewError }] = await Promise.all([db.from("ds_leads").select("nome,site_antigo").eq("slug", proposal.lead_slug).is("deleted_at", null).maybeSingle(), db.from("ds_previews").select("id").eq("id", previewId).eq("lead_slug", proposal.lead_slug).maybeSingle()]); if (leadError || previewError) return storageUnavailable(); if (!lead || !preview) return out({ error: "proposal_preview_not_found" }, 404); const config = await settings(db); return new Response(renderProspectorProposalCover({ clientName: lead.nome || proposal.lead_slug, previewUrl: `/api/previews/${preview.id}`, oldUrl: lead.site_antigo, author: config.seller_name || config.company_name, identity: config.identity, whatsapp: config.whatsapp }), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }); }
  if (root === "comparators" && parts[1]) { if (!isSafeLeadSlug(parts[1])) return out({ error: "invalid_lead_slug" }, 400); const [{ data: lead, error: leadError }, { data: preview, error: previewError }] = await Promise.all([db.from("ds_leads").select("nome,site_antigo").eq("slug", parts[1]).is("deleted_at", null).maybeSingle(), db.from("ds_previews").select("id").eq("lead_slug", parts[1]).order("created_at", { ascending: false }).limit(1).maybeSingle()]); if (leadError || previewError) return storageUnavailable(); if (!lead || !preview) return out({ error: "comparison_requires_lead_and_preview" }, 404); return new Response(renderProspectorComparator([{ nome: lead.nome || parts[1], slug: parts[1], old: lead.site_antigo, novo: `/api/previews/${preview.id}`, motivo: "Sem URL pública do site atual registrada." }]), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }); }
  if (root === "previews" && parts[1] && parts[2] === "data") { const { data, error } = await db.from("ds_previews").select("*").eq("id", parts[1]).maybeSingle(); return error ? storageUnavailable() : data ? out(data) : out({ error: "preview_not_found" }, 404); }
  if (root === "previews" && parts[1] && parts[2] === "editor") { const { data, error } = await db.from("ds_previews").select("content").eq("id", parts[1]).maybeSingle(); return error ? storageUnavailable() : new Response(data ? withProspectorEditor(data.content) : "Preview não encontrado", { status: data ? 200 : 404, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }); }
  if (root === "previews" && parts[1] && parts[2] !== "data") { const { data } = await db.from("ds_previews").select("content").eq("id", parts[1]).maybeSingle(); return new Response(data?.content ?? "Preview não encontrado", { status: data ? 200 : 404, headers: { "Content-Type": "text/html; charset=utf-8" } }); }
  if (tables[root]) { const fields = root === "previews" ? "id,lead_slug,kind,url,status,created_at" : "*"; const { data, error } = await db.from(tables[root]).select(fields).order("created_at", { ascending: false }); return error ? storageUnavailable() : out(data); }
  return out({ error: "route_not_found" }, 404);
}

export async function POST(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const auth = await context(); if (!auth) return out({ error: "unauthorized" }, 401);
  const { db, user } = auth; const parts = (await params).path; const root = parts[0]; const body = await request.json().catch(() => ({}));
  if (root === "leads") {
    const disallowed = firstDisallowedKey(body, LEAD_INPUT_KEYS);
    if (disallowed) return out({ error: "lead_field_not_allowed" }, 400);
    if (!isSafeLeadSlug(body.slug)) return out({ error: "invalid_lead_slug" }, 400);
    if (body.status === "fechado") return out({ error: "Fechamento exige confirmação explícita e valor_fechado positivo." }, 400);
    return await saveProspect(db, body) as Response;
  }
  // DS-VALUE-01 — descoberta real: nicho + cidade → empresas reais da fonte
  // pública, com origem e data de verificação. Nada é persistido aqui e falha
  // do provedor falha fechado (503, zero resultados, nada inventado).
  if (root === "discovery") {
    const nicho = String(body.nicho ?? body.niche ?? "").trim();
    const cidade = String(body.cidade ?? body.city ?? "").trim();
    // quantidade_alvo ≠ limite_candidatos: o retorno é limitado pelo limite de
    // candidatos; a quantidade alvo é referência de trabalho (ver DISCOVERY_QUANTITY_RULE).
    const quantidade = Number(body.quantidade_alvo ?? body.quantidade ?? body.target_quantity ?? 0) || DISCOVERY_DEFAULT_QUANTITY;
    const limite = Number(body.limite_candidatos ?? body.limite ?? body.search_limit ?? 0) || DISCOVERY_DEFAULT_LIMIT;
    const produto = String(body.product ?? "").trim();
    if (!nicho || !cidade) return out({ error: "nicho e cidade são obrigatórios para a descoberta real" }, 400);
    if (nicho.length > 80 || cidade.length > 120 || quantidade < 1 || quantidade > DISCOVERY_MAX_LIMIT || limite < 1 || limite > DISCOVERY_MAX_LIMIT || (produto && !["datta360", "dattavps", "both"].includes(produto))) return out({ error: "parâmetros de descoberta inválidos" }, 400);
    let search: Awaited<ReturnType<typeof discoverCompanies>>;
    try {
      search = await discoverCompanies({ nicho, cidade, quantidade, limite });
    } catch (error) {
      if (error instanceof DiscoveryError) {
        const falha = error as { code: string; message: string; details?: unknown };
        const status = String(falha.code).startsWith("ssrf_") ? 400 : 503;
        return out({ error: falha.code, message: falha.message, details: falha.details ?? null, provider: "openstreetmap", results: [] }, status);
      }
      throw error;
    }
    // A deduplicação usa o estado real do CRM: sem leitura confiável dos leads
    // nenhum resultado é devolvido, em vez de arriscar lead duplicado.
    const { data: leads, error: leadsError } = await db.from("ds_leads").select("slug,nome,cidade,telefone,whatsapp,email,site_antigo,instagram_url").is("deleted_at", null);
    if (leadsError) return storageUnavailable();
    const candidates = resultsToCandidates(search.results, { nicho, cidade, produto }) as Record<string, unknown>[];
    const takenSlugs = new Set((leads ?? []).map((lead) => String((lead as { slug?: unknown }).slug ?? "")));
    const results = candidates.map((candidate) => {
      const match = duplicateOf(candidate, leads ?? []);
      // Um resultado novo nunca assume o slug de um lead existente: o slug só é
      // desambiguado quando não há deduplicação, que é quem preserva o lead atual.
      const slug = match ? candidate.slug : disambiguateSlug(candidate.slug, takenSlugs);
      takenSlugs.add(String(slug));
      return { ...candidate, slug, deduplicated: Boolean(match), existing_lead_slug: match?.lead?.slug ?? null, criterion: match?.criterion ?? null };
    });
    return out({ provider: search.provider, provider_label: search.provider_label, licence: search.licence, strategy: search.strategy, categoria_mapeada: search.categoria_mapeada, warning: search.warning, query: search.query, regra: DISCOVERY_QUANTITY_RULE, place: search.place, searched_at: search.searched_at, considerados: search.considerados, ignorados: search.ignorados, returned: results.length, results });
  }
  // DS-VALUE-02 — enriquecimento real com proveniência: completa campo vazio do
  // lead com valor + fonte + data + confiança. Valor já existente é preservado e
  // falha de fonte não altera o lead.
  if (root === "enrichment") {
    if (!isSafeLeadSlug(body.lead_slug)) return out({ error: "invalid_lead_slug" }, 400);
    const { data: lead, error: leadError } = await db.from("ds_leads").select("*").eq("slug", body.lead_slug).is("deleted_at", null).maybeSingle();
    if (leadError) return storageUnavailable();
    if (!lead) return out({ error: "lead_not_found" }, 404);
    let enrichment: Awaited<ReturnType<typeof enrichLead>>;
    try {
      enrichment = await enrichLead({ lead });
    } catch (error) {
      if (error instanceof EnrichmentError) {
        const falha = error as { code: string; message: string; details?: { warnings?: unknown[] } | null };
        const status = String(falha.code).startsWith("ssrf_") ? 400 : 503;
        return out({ error: falha.code, message: falha.message, fields: {}, updated: [], sources: [], warnings: falha.details?.warnings ?? [], lead_preservado: true }, status);
      }
      throw error;
    }
    const ignorar = Array.isArray(body.ignorar) ? (body.ignorar.filter((field: unknown) => typeof field === "string") as string[]).slice(0, 20) : [];
    const { updates, ignored } = planEnrichmentUpdate(lead, enrichment.fields, { force: body.force === true, ignorar }) as { updates: Record<string, { value: unknown; source: string; source_url: string; checked_at: string; confidence: string; classification: string }>; ignored: unknown[] };
    const campos = Object.keys(updates);
    if (!campos.length) return out({ ok: true, updated: [], ignored, sources: enrichment.sources, warnings: enrichment.warnings, checked_at: enrichment.checked_at, lead_preservado: true });
    const evidence = Array.isArray(lead.contact_evidence) ? (lead.contact_evidence as unknown[]) : [];
    const patch: Record<string, unknown> = { updated_at: now(), contact_evidence: [...evidence, ...campos.map((field) => ({ field, ...updates[field] }))] };
    for (const field of campos) patch[field] = updates[field].value;
    const { error: updateError } = await db.from("ds_leads").update(patch).eq("slug", lead.slug);
    if (updateError) return storageUnavailable();
    await event(db, String(lead.slug), "enrichment.applied", campos.map((field) => `${field}:${updates[field].source}/${updates[field].classification}`).join(" · "));
    return out({ ok: true, updated: campos.map((field) => ({ field, ...updates[field] })), ignored, sources: enrichment.sources, warnings: enrichment.warnings, checked_at: enrichment.checked_at });
  }
  // DS-VALUE-04 — enfileira BUILD_REDESIGN no Worker Agent (ou executa inline no
  // dev). O CRM responde na hora com job_id + status; o artefato é buscado depois
  // em GET /api/redesign?job= e persistido no preview existente.
  if (root === "redesign") {
    if (!isSafeLeadSlug(body.lead_slug)) return out({ error: "invalid_lead_slug" }, 400);
    const { data: lead, error: leadError } = await db.from("ds_leads").select("slug,nome,cidade,site_antigo,telefone,whatsapp,email,end_cliente,source,source_url,status").eq("slug", body.lead_slug).is("deleted_at", null).maybeSingle();
    if (leadError) return storageUnavailable();
    if (!lead) return out({ error: "lead_not_found" }, 404);
    if (!lead.site_antigo || !isPublicHttpUrl(lead.site_antigo)) return out({ error: "redesign_site_required", message: "O lead precisa de site público HTTP(S) para o redesign." }, 409);
    const diagnosisId = String(body.diagnosis_id ?? "").trim();
    const { data: diagnostico, error: diagnosisError } = await db.from("ds_site_diagnoses").select("id").eq("lead_slug", lead.slug).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (diagnosisError) return storageUnavailable();
    if (!diagnosisId && !diagnostico) return out({ error: "diagnosis_required", message: "Execute o diagnóstico factual (DS-VALUE-03) antes do redesign." }, 409);
    let payload;
    try {
      payload = parseRedesignJob({ lead_slug: lead.slug, site_url: lead.site_antigo, diagnosis_id: diagnosisId || diagnostico?.id, requested_by: user?.email ?? "crm", context_url: `/api/worker/context?lead_slug=${lead.slug}` });
    } catch (error) {
      if (error instanceof RedesignError) {
        const falha = error as { code: string; message: string };
        return out({ error: falha.code, message: falha.message }, 400);
      }
      throw error;
    }
    const worker = redesignWorkerUrl();
    if (worker) {
      try {
        const resposta = await fetch(`${worker}/jobs/redesign`, { method: "POST", headers: redesignWorkerHeaders(), body: JSON.stringify(payload), signal: AbortSignal.timeout(15000) });
        const dados = (await resposta.json().catch(() => ({}))) as Record<string, unknown>;
        if (!resposta.ok) return out({ error: String(dados.error ?? "worker_unavailable"), message: dados.message ?? null, mode: "worker" }, resposta.status === 400 ? 400 : 503);
        await event(db, String(lead.slug), "redesign.queued", `${String(dados.job_id)} · worker`);
        return out({ ...dados, mode: "worker" }, 202);
      } catch {
        return out({ error: "worker_unavailable", mode: "worker" }, 503);
      }
    }
    const instancia = inlineRedesignWorker();
    const submetido = instancia.submit(payload);
    after(() => instancia.wait(submetido.job_id));
    await event(db, String(lead.slug), "redesign.queued", `${submetido.job_id} · inline-dev`);
    return out({ ...submetido, mode: "inline-dev" }, 202);
  }
  // DS-VALUE-05/06 — enfileira ANALYZE_SOCIAL ou BUILD_SOCIAL_DEMO no agente.
  if (root === "social") {
    if (!isSafeLeadSlug(body.lead_slug)) return out({ error: "invalid_lead_slug" }, 400);
    const { data: lead, error: leadError } = await db.from("ds_leads").select("slug,nome,cidade,nicho,site_antigo,instagram_url,tiktok_url,telefone,whatsapp,email,end_cliente,source,source_url").eq("slug", body.lead_slug).is("deleted_at", null).maybeSingle();
    if (leadError) return storageUnavailable();
    if (!lead) return out({ error: "lead_not_found" }, 404);
    const perfil = String(body.profile_url ?? lead.instagram_url ?? lead.tiktok_url ?? "").trim();
    let payload;
    try {
      payload = parseSocialJob({ action: body.action ?? AGENT_ACTIONS.socialAnalysis, lead_slug: lead.slug, profile_url: perfil || null, diagnosis_id: body.diagnosis_id ?? null, requested_by: user?.email ?? "crm", context_url: `/api/worker/context?lead_slug=${lead.slug}`, browser_evidence: body.browser_evidence ?? null });
    } catch (error) {
      if (error instanceof AgentError) {
        const falha = error as { code: string; message: string };
        return out({ error: falha.code, message: falha.message }, 409);
      }
      throw error;
    }
    if (payload.action === AGENT_ACTIONS.socialDemo && !lead.site_antigo) return out({ error: "social_demo_site_required", message: "Demonstração social exige o site público do lead." }, 409);
    const worker = redesignWorkerUrl();
    if (worker) {
      const rota = payload.action === AGENT_ACTIONS.socialDemo ? "/jobs/social-demo" : "/jobs/social-analysis";
      try {
        const resposta = await fetch(`${worker}${rota}`, { method: "POST", headers: redesignWorkerHeaders(), body: JSON.stringify(payload), signal: AbortSignal.timeout(15000) });
        const dados = (await resposta.json().catch(() => ({}))) as Record<string, unknown>;
        if (!resposta.ok) return out({ error: String(dados.error ?? "worker_unavailable"), message: dados.message ?? null, mode: "worker" }, resposta.status === 400 ? 400 : 503);
        await event(db, String(lead.slug), payload.action === AGENT_ACTIONS.socialDemo ? "social.demo.queued" : "social.analysis.queued", `${String(dados.job_id)} · worker`);
        return out({ ...dados, mode: "worker" }, 202);
      } catch {
        return out({ error: "worker_unavailable", mode: "worker" }, 503);
      }
    }
    const instancia = inlineAgent();
    const submetido = instancia.submit(payload);
    after(() => instancia.wait(submetido.job_id));
    await event(db, String(lead.slug), payload.action === AGENT_ACTIONS.socialDemo ? "social.demo.queued" : "social.analysis.queued", `${submetido.job_id} · inline-dev`);
    return out({ ...submetido, mode: "inline-dev" }, 202);
  }
  // DS-VALUE-03 — diagnóstico factual do site real: registra somente o que foi
  // observado na resposta HTTP e no HTML público, com evidência por critério.
  if (root === "diagnosis") {
    if (!isSafeLeadSlug(body.lead_slug)) return out({ error: "invalid_lead_slug" }, 400);
    const { data: lead, error: leadError } = await db.from("ds_leads").select("slug,nome,cidade,site_antigo").eq("slug", body.lead_slug).is("deleted_at", null).maybeSingle();
    if (leadError) return storageUnavailable();
    if (!lead) return out({ error: "lead_not_found" }, 404);
    let diagnosis: Awaited<ReturnType<typeof diagnoseSite>>;
    try {
      diagnosis = await diagnoseSite(lead.site_antigo);
    } catch (error) {
      if (error instanceof DiagnosisError) {
        const falha = error as { code: string; message: string; details?: unknown };
        const status = String(falha.code).startsWith("ssrf_") ? 400 : 503;
        return out({ error: falha.code, message: falha.message, details: falha.details ?? null, fatos: null, lead_preservado: true }, status);
      }
      throw error;
    }
    const criteria = { url: diagnosis.url, checked_at: diagnosis.checked_at, fatos: diagnosis.fatos, evidencias: diagnosis.evidencias };
    const row = { id: id("diag"), lead_slug: lead.slug, criteria };
    const { error: insertError } = await db.from("ds_site_diagnoses").insert(row);
    if (insertError) return storageUnavailable();
    const { error: leadUpdateError } = await db.from("ds_leads").update({ site_audit_json: JSON.stringify(criteria), updated_at: now() }).eq("slug", lead.slug);
    if (leadUpdateError) return storageUnavailable();
    await event(db, String(lead.slug), "site.diagnosis", diagnosis.url);
    return out({ ok: true, diagnosis_id: row.id, lead_slug: lead.slug, url: diagnosis.url, checked_at: diagnosis.checked_at, fatos: diagnosis.fatos, evidencias: diagnosis.evidencias }, 201);
  }
  if (root === "prospects") { const q = body.query ?? {}, candidates = (Array.isArray(body.candidates) ? body.candidates.slice(0, 25) : []) as Record<string, unknown>[], product = String(q.product ?? "").trim(); const radius = Number(q.search_radius_km ?? 0), target = Number(q.target_quantity ?? 0), limit = Number(q.search_limit ?? 0), prepared: { candidate: Record<string, unknown>; qualification: NormalizedQualification }[] = candidates.map((candidate: Record<string, unknown>) => ({ candidate, qualification: normalizeQualification(candidate.qualification) as NormalizedQualification })); if (!String(q.niche ?? "").trim() || !String(q.city ?? q.region ?? "").trim() || !candidates.length) return out({ error: "nicho, cidade/região e candidatos públicos são obrigatórios" }, 400); if ((product && !["datta360","dattavps","both"].includes(product)) || radius < 0 || radius > 500 || target < 0 || target > 100 || limit < 0 || limit > 25) return out({ error: "parâmetros de prospecção inválidos" }, 400); const invalidQualification = prepared.find((entry: { qualification: NormalizedQualification }) => entry.qualification.error); if (invalidQualification) return out({ error: invalidQualification.qualification.error }, 400); const results = []; for (const { candidate: c, qualification } of prepared) { const result = await saveProspect(db, { ...c, nicho: c.nicho || q.niche, cidade: c.cidade || q.city, region: c.region || q.region, product_suggested: c.product_suggested || qualification.value?.recommendation || product, search_radius_km: c.search_radius_km ?? (radius || null), target_quantity: c.target_quantity ?? (target || null), search_limit: c.search_limit ?? (limit || null), source: c.source || "public_search", source_checked_at: c.source_checked_at || now() }, false) as Record<string, unknown>; if (result.error) return storageUnavailable(); if (qualification.value) { const qualificationResult = await saveQualification(db, String(result.lead), qualification.value); if ("error" in qualificationResult) return storageUnavailable(); result.qualification_id = qualificationResult.id; } results.push(result); } return out({ evaluated: candidates.length, results }); }
  if (root === "proposals") {
    let commercialSnapshot;
    try {
      commercialSnapshot = buildCommercialSnapshot({
        sku: body.commercial_sku,
        negotiatedPrice: body.negotiated_price == null || body.negotiated_price === "" ? undefined : Number(body.negotiated_price),
        specificTerms: body.specific_terms,
        commercialOverrideConfirmed: body.commercial_override_confirmed === true,
      });
    } catch (error) {
      return out({ error: error instanceof Error ? error.message : "proposal_commercial_snapshot_incomplete" }, 400);
    }
    const { data: product } = await db.from("ds_products").select("*").eq("id", body.product_id).eq("active", true).maybeSingle();
    if (!product) return out({ error: "Produto não disponível" }, 400);
    const diagnosisIds = proposalArtifactIds(body.diagnosis_ids), previewIds = proposalArtifactIds(body.preview_ids), socialAuditIds = proposalArtifactIds(body.social_audit_ids);
    if (!diagnosisIds || !previewIds || !socialAuditIds) return out({ error: "proposal_artifact_ids_invalid" }, 400);
    const refs = { diagnosis_ids: diagnosisIds, preview_ids: previewIds, social_audit_ids: socialAuditIds };
    const bound = await proposalArtifactsBelongToLead(db, String(body.lead_slug ?? ""), refs);
    if ("error" in bound) return storageUnavailable();
    if (!bound.ok) return out({ error: "proposal_artifacts_cross_lead" }, 409);
    const base = Number(commercialSnapshot.list_price), price = Number(commercialSnapshot.negotiated_price), discount = base - price;
    const row = {
      id: id("prop"),
      lead_slug: body.lead_slug,
      product_id: body.product_id,
      base_price: base,
      negotiated_price: price,
      discount,
      margin: price - Number(product.cost),
      currency: "BRL",
      terms: String(body.terms || commercialSnapshot.specific_terms || "").trim(),
      valid_until: new Date(Date.now() + Number(body.valid_days || 7) * 86400000).toISOString(),
      version: 1,
      status: "draft",
      artifacts: { ...refs, comparator: body.comparator === true, commercial_snapshot: commercialSnapshot },
    };
    const { error } = await db.from("ds_proposals").insert(row);
    if (error) return storageUnavailable();
    await event(db, row.lead_slug, "proposal.created", row.id);
    return out(row);
  }
  if (root === "emails" && parts[2] === "transition") { if (body.status === "sent_simulated") await hydrateEmailRecipient(db, parts[1]); return transitionEmail(db, parts[1], body.status, body.fixture); }
  if (root === "emails" && parts[2] === "follow-up") return followUp(db, parts[1]);
  if (root === "emails") { const row = { id: id("email"), lead_slug: body.lead_slug, proposal_id: body.proposal_id || null, subject: String(body.subject || "Proposta DattaSeller"), body: String(body.body || "Olá, segue a proposta para sua revisão."), status: "draft", provider: "mock", attempt: 0 }; const { error } = await db.from("ds_emails").insert(row); if (error) return storageUnavailable(); await event(db, row.lead_slug, "email.draft", row.id); return out(row); }
  if (root === "orders" && parts[2] === "checkout") return checkout(db, parts[1], body.result);
  if (root === "orders" && parts[2] === "payment") return payment(db, parts[1], body.status || "pending");
  if (root === "orders" && parts[2] === "contract") return contract(db, parts[1]);
  if (root === "orders" && parts[2] === "handoff") return handoff(db, parts[1], body.status || "sent");
  if (root === "orders") return createOrder(db, body.proposal_id);
  if (root === "contracts" && parts[2] === "transition") { if (!["generated","sent_simulated","signed","refused","cancelled"].includes(body.status)) return out({ error: "Estado de contrato inválido" }, 400); const { data: c } = await db.from("ds_contracts").update({ status: body.status, updated_at: now() }).eq("id", parts[1]).select().single(); if (c) { const { data: o } = await db.from("ds_orders").select("lead_slug").eq("id", c.order_id).single(); await event(db, o?.lead_slug, `contract.${body.status}`, c.id); } return out(c); }
  if (root === "qualifications") { if (!isSafeLeadSlug(body.lead_slug)) return out({ error: "invalid_lead_slug" }, 400); const qualification = normalizeQualification(body) as NormalizedQualification; if (qualification.error || !qualification.value) return out({ error: qualification.error || "qualification_required" }, 400); const row = await saveQualification(db, body.lead_slug, qualification.value); return "error" in row ? storageUnavailable() : out(row); }
  if (root === "diagnoses") { const row = { id: id("diag"), lead_slug: body.lead_slug, criteria: body.criteria || [] }; const { error } = await db.from("ds_site_diagnoses").insert(row); if (error) return storageUnavailable(); await event(db, row.lead_slug, "site_diagnosis.created", row.id); return out(row); }
  if (root === "social-audits") { const disallowed = firstDisallowedKey(body, SOCIAL_AUDIT_INPUT_KEYS); if (disallowed) return out({ error: "social_audit_field_not_allowed" }, 400); const row = { id: id("social"), ...body }; const { error } = await db.from("ds_social_audits").insert(row); if (error) return storageUnavailable(); await event(db, row.lead_slug, "social_audit.created", row.id); return out(row); }
  if (root === "previews") { const { data: lead, error: leadError } = await db.from("ds_leads").select("nome,site_antigo,nicho").eq("slug", body.lead_slug).maybeSingle(); if (leadError) return storageUnavailable(); if (!lead) return out({ error: "Lead não encontrado" }, 404); const pid = id("preview"), content = renderProspectorRedesign({ clientName: lead.nome || body.lead_slug, sourceUrl: lead.site_antigo, niche: lead.nicho }); const row = { id: pid, lead_slug: body.lead_slug, kind: body.kind || "redesign", url: `/api/previews/${pid}`, content, status: "published_mock" }; const { error } = await db.from("ds_previews").insert(row); if (error) return storageUnavailable(); await event(db, row.lead_slug, "preview.published_mock", row.id); return out(row); }
  return out({ error: "route_not_found" }, 404);
}

export async function PUT(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const auth = await context(); if (!auth) return out({ error: "unauthorized" }, 401); const { db } = auth; const parts = (await params).path; const body = await request.json().catch(() => ({}));
  if (parts[0] === "leads" && parts[1]) { if (!isSafeLeadSlug(parts[1])) return out({ error: "invalid_lead_slug" }, 400); const disallowed = firstDisallowedKey(body, LEAD_INPUT_KEYS); if (disallowed) return out({ error: "lead_field_not_allowed" }, 400); const row = uiToLead(body); delete row.slug; if (row.status === "fechado") { const value = Number(row.valor_fechado ?? row.valor); if (body.closingConfirmed !== true || value <= 0) return out({ error: "Fechamento exige confirmação explícita e valor_fechado positivo." }, 400); row.valor = value; row.valor_fechado = value; row.closing_confirmed_at = now(); } row.updated_at = now(); const { error } = await db.from("ds_leads").update(row).eq("slug", parts[1]).is("deleted_at", null); return error ? storageUnavailable() : out({ ok: true }); }
  if (parts[0] === "settings") { const allowed = new Set(["company_name","seller_name","signature","phone","whatsapp","region","identity","language","demo_mode","limits","email_provider","email_sender","email_reply_to","spf_status","dkim_status","dmarc_status","hour_limit","day_limit","followup_days","public_base_url"]); const rows = Object.entries(body).filter(([key]) => allowed.has(key) && !/(secret|key|password)/i.test(key)).map(([key, value]) => ({ key, value, updated_at: now() })); if (rows.length) await db.from("ds_settings").upsert(rows); return out(await settings(db)); }
  if (parts[0] === "products" && parts[1]) { const allowed = ["name","billing","public_price","base_price","cost","commission_pct","max_discount_pct","currency","active","terms","description","checkout_url","cta_label","availability"]; const row = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key))); row.updated_at = now(); const { data, error } = await db.from("ds_products").update(row).eq("id", parts[1]).select().single(); return error ? storageUnavailable() : out(data); }
  if (parts[0] === "emails" && parts[1]) { if (!String(body.subject || "").trim() || !String(body.body || "").trim()) return out({ error: "Assunto e corpo são obrigatórios" }, 400); const { data: current } = await db.from("ds_emails").select("*").eq("id", parts[1]).single(); if (!current || !["draft","reviewed","failed"].includes(current.status)) return out({ error: "Somente rascunhos, e-mails em revisão ou envios que falharam podem ser editados" }, 400); const patch: Record<string, unknown> = { subject: body.subject.trim(), body: body.body.trim(), updated_at: now() }; if (current.status === "failed") { patch.status = "draft"; patch.error = null; } const { data } = await db.from("ds_emails").update(patch).eq("id", parts[1]).select().single(); await event(db, current.lead_slug, "email.edited", current.id); return out(data); }
  if (parts[0] === "proposals" && parts[1]) { const { data: p } = await db.from("ds_proposals").select("*,ds_products(cost,max_discount_pct,public_price)").eq("id", parts[1]).single(); if (!p) return out({ error: "Proposta não encontrada" }, 404); const price = Number(body.negotiated_price ?? p.negotiated_price), discount = Number(p.base_price) - price, product = p.ds_products as unknown as { cost: number; max_discount_pct: number; public_price: number }; const priceError = negotiatedPriceError({ publicPrice: product.public_price, basePrice: p.base_price, negotiatedPrice: price, maxDiscountPct: product.max_discount_pct }); if (priceError === "negotiated_price_not_positive" || priceError === "discount_above_max") return out({ error: "Preço inválido ou desconto acima do máximo" }, 400); if (priceError) return out({ error: priceError }, 400); await db.from("ds_proposals").update({ status: "revised" }).eq("id", p.id); const row = { ...p, ds_products: undefined, id: id("prop"), negotiated_price: price, discount, margin: price - Number(product.cost), terms: body.terms ?? p.terms, valid_until: new Date(Date.now() + Number(body.valid_days || 7) * 86400000).toISOString(), version: Number(p.version) + 1, status: "draft", created_at: now() }; await db.from("ds_proposals").insert(row); await event(db, p.lead_slug, "proposal.revised", row.id); return out(row); }
  if (parts[0] === "previews" && parts[1]) { const content = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><body style="font-family:system-ui;max-width:760px;margin:40px auto;padding:24px"><small>PREVIEW / DEMO — revisão humana obrigatória</small><h1>${escapeHtml(body.title)}</h1><p>${escapeHtml(body.body)}</p><p><b>CTA:</b> ${escapeHtml(body.cta)}</p><p><b>Contato:</b> ${escapeHtml(body.contact)}</p></body>`; const { data } = await db.from("ds_previews").update({ content }).eq("id", parts[1]).select().single(); return out(data); }
  return out({ error: "route_not_found" }, 404);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ path: string[] }> }) { const auth = await context(); if (!auth) return out({ error: "unauthorized" }, 401); const parts = (await params).path; if (parts[0] === "leads" && parts[1]) { if (!isSafeLeadSlug(parts[1])) return out({ error: "invalid_lead_slug" }, 400); const { data: paidOrder, error: paidOrderError } = await auth.db.from("ds_orders").select("id").eq("lead_slug", parts[1]).eq("status", "paid").limit(1).maybeSingle(); if (paidOrderError) return storageUnavailable(); if (paidOrder) return out({ error: "lead_delete_forbidden_paid_order" }, 409); const { error } = await auth.db.from("ds_leads").update({ deleted_at: now(), updated_at: now() }).eq("slug", parts[1]).is("deleted_at", null); return error ? storageUnavailable() : out({ ok: true }); } return out({ error: "route_not_found" }, 404); }

async function transitionEmail(db: Db, emailId: string, status: string, fixture = "") { const allowed = ["reviewed","approved","sent_simulated","delivered_simulated","positive_reply","negative_reply","bounce","failed","no_reply","generic_reply"]; if (!allowed.includes(status)) return out({ error: "Estado de e-mail inválido" }, 400); const { data: email } = await db.from("ds_emails").select("*").eq("id", emailId).single(); if (!email) return out({ error: "E-mail não encontrado" }, 404); if (status === "sent_simulated" && email.status !== "approved") return out({ error: "Somente rascunho aprovado pode ser enviado" }, 400); let provider = email.provider, provider_message_id = email.provider_message_id, finalStatus = status, error: string | null = null; if (status === "sent_simulated") { const cfg = await settings(db); const configurationError = resendConfigurationError(cfg.email_provider, Boolean(process.env.RESEND_API_KEY)); if (configurationError) { error = configurationError; finalStatus = "failed"; } else if (cfg.email_provider === "resend") { try { const result = await new Resend(process.env.RESEND_API_KEY!).emails.send({ from: String(cfg.email_sender), to: [email.recipient], replyTo: cfg.email_reply_to ? String(cfg.email_reply_to) : undefined, subject: email.subject, text: email.body, headers: { "X-Entity-Ref-ID": email.id } }); if (result.error) throw new Error(result.error.message); provider = "resend"; provider_message_id = result.data?.id; finalStatus = "sent"; } catch { error = "provider_send_failed"; finalStatus = "failed"; } } } const { data } = await db.from("ds_emails").update({ status: finalStatus, provider, provider_message_id, error, attempt: Number(email.attempt) + (status === "sent_simulated" ? 1 : 0), updated_at: now() }).eq("id", emailId).select().single(); await event(db, email.lead_slug, `email.${finalStatus}`, fixture || emailId); return out(data ?? { ok: true, status: finalStatus }); }
async function createOrder(db: Db, proposalId: string) { const { data: p } = await db.from("ds_proposals").select("*,ds_products(*)").eq("id", proposalId).single(); if (!p) return out({ error: "Proposta não encontrada" }, 404); const cfg = await settings(db), seller = String(cfg.seller_name ?? "").trim(), product = p.ds_products as unknown as Record<string, unknown>; if (!seller) return out({ error: "seller_name_required" }, 409); const priceError = negotiatedPriceError({ publicPrice: product.public_price, basePrice: p.base_price, negotiatedPrice: p.negotiated_price, maxDiscountPct: product.max_discount_pct }); if (priceError) return out({ error: priceError }, 400); const orderId = id("ord"), coupon = planOrderCoupon({ reference: orderId, order: p, product }) as Record<string, unknown>; const row = { id: orderId, lead_slug: p.lead_slug, product_id: p.product_id, offer_name: product.name, seller, base_price: p.base_price, public_price: coupon.public_price ?? null, negotiated_price: p.negotiated_price, discount: p.discount, cost: product.cost, margin: p.margin, currency: p.currency, commission_pct: product.commission_pct, coupon_code: coupon.coupon_code, coupon_status: coupon.coupon_status, status: "open" }; const { error } = await db.from("ds_orders").insert(row); if (error) return storageUnavailable(); await db.from("ds_proposals").update({ status: "accepted" }).eq("id", proposalId); await event(db, row.lead_slug, coupon.required ? "order.coupon_issued" : "order.created", row.id); return out({ ...row, checkout_url: coupon.checkout_url, checkout_url_with_coupon: coupon.checkout_url_with_coupon }); }
async function checkout(db: Db, orderId: string, result?: string) { const { data: order } = await db.from("ds_orders").select("lead_slug").eq("id", orderId).single(); if (!order) return out({ error: "Pedido não encontrado" }, 404); let { data: ck } = await db.from("ds_checkouts").select("*").eq("order_id", orderId).maybeSingle(); if (!ck) { ck = { id: id("checkout"), order_id: orderId, status: "open", expires_at: new Date(Date.now() + 86400000).toISOString() }; await db.from("ds_checkouts").insert(ck); await event(db, order.lead_slug, "checkout.open", ck.id); } if (result && ["completed","abandoned","expired"].includes(result)) { ck.status = result; await db.from("ds_checkouts").update({ status: result }).eq("order_id", orderId); await event(db, order.lead_slug, `checkout.${result}`, ck.id); } return out(ck); }
async function payment(db: Db, orderId: string, status: string) { if (!["pending","approved","declined","cancelled","refunded"].includes(status)) return out({ error: "Pagamento inválido" }, 400); const { data: order } = await db.from("ds_orders").select("*").eq("id", orderId).single(); if (!order) return out({ error: "Pedido não encontrado" }, 404); let { data: pay } = await db.from("ds_payments").select("*").eq("order_id", orderId).maybeSingle(); if (pay?.status === "approved") return out(pay); if (pay) { const response = await db.from("ds_payments").update({ status, updated_at: now() }).eq("order_id", orderId).select().single(); pay = response.data; } else { pay = { id: id("pay"), order_id: orderId, status, amount: order.negotiated_price, currency: order.currency }; await db.from("ds_payments").insert(pay); } await db.from("ds_orders").update({ status: status === "approved" ? "paid" : status }).eq("id", orderId); await event(db, order.lead_slug, `payment.${status}`, orderId); if (status === "approved") { await db.from("ds_handoffs").upsert({ id: id("hand"), order_id: orderId, product_id: order.product_id, client: order.lead_slug, seller: order.seller, requirements: "", status: "pending", retry_count: 0 }, { onConflict: "order_id", ignoreDuplicates: true }); await db.from("ds_commissions").upsert({ id: id("comm"), order_id: orderId, seller: order.seller, base: order.negotiated_price, pct: order.commission_pct, amount: Number(order.negotiated_price) * Number(order.commission_pct) / 100, state: "pending" }, { onConflict: "order_id", ignoreDuplicates: true }); await event(db, order.lead_slug, "handoff.created", orderId); } return out(pay); }
async function contract(db: Db, orderId: string) { const { data: o } = await db.from("ds_orders").select("*,ds_leads(nome,empresa,cidade),ds_products(is_demo,terms)").eq("id", orderId).single(); if (!o) return out({ error: "Pedido não encontrado" }, 404); const product = o.ds_products as unknown as { is_demo?: boolean; terms?: string }; if (product?.is_demo === true) return out({ error: "demo_product_contract_forbidden" }, 409); const lead = o.ds_leads as unknown as Record<string, string>, html = `<!doctype html><meta charset="utf-8"><title>Contrato DattaSeller</title><body style="font-family:serif;max-width:800px;margin:40px auto;line-height:1.55"><h1>Contrato de prestação de serviços</h1><p><b>Cliente:</b> ${escapeHtml(lead?.nome || o.lead_slug)}</p><p><b>Oferta:</b> ${escapeHtml(o.offer_name)}</p><p><b>Valor:</b> ${escapeHtml(o.currency)} ${Number(o.negotiated_price).toFixed(2)}</p><p><b>Condições:</b> ${escapeHtml(product?.terms || "a confirmar")}</p><p>Documento gerado pelo fluxo DattaSeller. Revisão humana obrigatória antes da assinatura.</p></body>`; const existing = await db.from("ds_contracts").select("id").eq("order_id", orderId).maybeSingle(); const row = { id: existing.data?.id || id("contract"), order_id: orderId, status: "generated", html, updated_at: now() }; await db.from("ds_contracts").upsert(row, { onConflict: "order_id" }); await event(db, o.lead_slug, "contract.generated", orderId); return out(row); }
async function handoff(db: Db, orderId: string, status: string) { if (!["pending","sent","executing","delivered","failed"].includes(status)) return out({ error: "Handoff inválido" }, 400); const { data: h } = await db.from("ds_handoffs").select("*").eq("order_id", orderId).single(); if (!h) return out({ error: "Handoff só existe após pagamento aprovado" }, 400); const retry = status === "sent" && h.status === "failed", patch = { status, retry_count: Number(h.retry_count) + (retry ? 1 : 0), error: retry ? null : h.error, updated_at: now() }; const { data } = await db.from("ds_handoffs").update(patch).eq("order_id", orderId).select().single(); const { data: o } = await db.from("ds_orders").select("lead_slug").eq("id", orderId).single(); await event(db, o?.lead_slug, retry ? "handoff.retry" : `handoff.${status}`, orderId); return out(data); }
const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
async function saveProspect(db: Db, raw: Record<string, unknown>, response = true): Promise<Response | Record<string, unknown>> { const row = uiToLead(raw); if (!isSafeLeadSlug(row.slug) || !String(row.nome ?? "").trim() || !isPublicHttpUrl(row.source_url)) return response ? out({ error: "slug, nome e source_url público HTTP(S) são obrigatórios" }, 400) : { error: "invalid_candidate" }; const { data: leads, error: read } = await db.from("ds_leads").select("*").is("deleted_at", null); if (read) return response ? storageUnavailable() : { error: "storage_unavailable" }; const match = duplicateOf(row, leads ?? []), target = match?.lead ?? {}; const evidence = Array.isArray(target.contact_evidence) ? target.contact_evidence : []; if (row.source_url && !evidence.some((x: { source_url?: unknown }) => x?.source_url === row.source_url)) evidence.push({ source: row.source, source_url: row.source_url, checked_at: row.source_checked_at, contact_type: row.public_contact_type }); const merged = { ...target, ...Object.fromEntries(Object.entries(row).filter(([, v]) => v !== null && v !== "")), slug: target.slug || row.slug, source: target.source || row.source || "manual", source_url: target.source_url || row.source_url, contact_evidence: evidence, phone_normalized: normalizePhone(row.telefone || row.whatsapp) || null, email_normalized: normalizeEmail(row.email) || null, domain_normalized: normalizeUrl(row.site_antigo, true) || null, instagram_normalized: normalizeUrl(row.instagram_url) || null, updated_at: now() }; const { error } = await db.from("ds_leads").upsert(merged); const result = error ? { error: "storage_unavailable" } : { ok: true, lead: merged.slug, deduplicated: Boolean(match), criterion: match?.criterion ?? null }; return response ? out(result, error ? 503 : 200) : result; }
async function saveQualification(db: Db, leadSlug: string, qualification: Qualification): Promise<SavedQualification | { error: string }> { const row: SavedQualification = { id: id("qual"), lead_slug: leadSlug, ...qualification }; const { error } = await db.from("ds_qualifications").insert(row); if (error) return { error: "storage_unavailable" }; const { error: leadError } = await db.from("ds_leads").update({ product_suggested: row.recommendation === "insufficient" ? "" : row.recommendation, product_reason: row.reason, next_action: row.next_action, qualification_json: JSON.stringify(qualification) }).eq("slug", row.lead_slug); if (leadError) return { error: "storage_unavailable" }; await event(db, row.lead_slug, "qualification.created", row.id); return row; }
