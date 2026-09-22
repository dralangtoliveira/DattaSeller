import { createSupabaseServerClient } from "@/lib/supabase/server";
// @ts-expect-error helper is deliberately implemented in plain JS and covered by node:test.
import { hashPublicProposalToken, isPublicProposalToken, publicProposalReadiness } from "@/lib/public-proposal.js";
// @ts-expect-error Plain JS commercial contract is covered by node:test.
import { validateCommercialSnapshot } from "@/lib/commercial/datta360-catalog.js";
// @ts-expect-error helper is deliberately implemented in plain JS and covered by node:test.
import { buildProspectorDraft, diagnosisFactsFromCriteria } from "@/lib/email/prospector-draft.js";

export const runtime = "nodejs";

const ids = (value: unknown) => Array.isArray(value) ? value.filter((x): x is string => typeof x === "string" && x.length > 0) : [];
const id = () => `email_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = await createSupabaseServerClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { data: profile } = await db.from("ds_users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return Response.json({ error: "forbidden" }, { status: 403 });
  const { id: proposalId } = await params;
  const body = await request.json().catch(() => ({}));
  const { data: proposal } = await db.from("ds_proposals").select("id,lead_slug,artifacts,negotiated_price,currency,terms,valid_until").eq("id", proposalId).maybeSingle();
  if (!proposal) return Response.json({ error: "proposal_not_found" }, { status: 404 });
  const artifacts = proposal.artifacts && typeof proposal.artifacts === "object" ? proposal.artifacts as Record<string, unknown> : {};
  const publication = artifacts.public_proposal && typeof artifacts.public_proposal === "object" ? artifacts.public_proposal as Record<string, unknown> : null;
  if (!publication || typeof publication.token_hash !== "string" || publication.revoked_at) return Response.json({ error: "public_proposal_required" }, { status: 409 });
  const snapshot = artifacts.commercial_snapshot && typeof artifacts.commercial_snapshot === "object" ? artifacts.commercial_snapshot as Record<string, unknown> : null;
  if (!validateCommercialSnapshot(snapshot)) return Response.json({ error: "proposal_commercial_snapshot_incomplete" }, { status: 409 });
  const commercial = snapshot as Record<string, unknown>;
  const previewIds = ids(artifacts.preview_ids), diagnosisIds = ids(artifacts.diagnosis_ids), socialIds = ids(artifacts.social_audit_ids);
  const [leadResult, previewResult, diagnosisResult, socialResult, settingsResult] = await Promise.all([
    db.from("ds_leads").select("nome,email,nota,avaliacoes,site_antigo").eq("slug", proposal.lead_slug).is("deleted_at", null).maybeSingle(),
    previewIds[0] ? db.from("ds_previews").select("id").eq("id", previewIds[0]).eq("lead_slug", proposal.lead_slug).maybeSingle() : Promise.resolve({ data: null }),
    diagnosisIds.length ? db.from("ds_site_diagnoses").select("criteria").eq("lead_slug", proposal.lead_slug).in("id", diagnosisIds) : Promise.resolve({ data: [] }),
    socialIds.length ? db.from("ds_social_audits").select("id").eq("lead_slug", proposal.lead_slug).in("id", socialIds) : Promise.resolve({ data: [] }),
    db.from("ds_settings").select("key,value"),
  ]);
  const lead = leadResult.data;
  if (!lead?.email) return Response.json({ error: "lead_email_required" }, { status: 409 });
  const settings = Object.fromEntries((settingsResult.data ?? []).map((row) => [row.key, row.value]));
  const requestOrigin = new URL(request.url).origin;
  const base = String(settings.public_base_url ?? process.env.DATTASELLER_PUBLIC_URL ?? requestOrigin).replace(/\/$/, "");
  if (!/^https:\/\/[^/?#]+$/i.test(base)) return Response.json({ error: "public_base_url_required" }, { status: 409 });
  const publicUrl = String(body.public_proposal_url ?? "").trim();
  let parsed: URL;
  try { parsed = new URL(publicUrl); } catch { return Response.json({ error: "public_proposal_url_required" }, { status: 400 }); }
  const token = parsed.pathname.match(/^\/p\/([A-Za-z0-9_-]{43})$/)?.[1] ?? "";
  if (parsed.origin !== base || !isPublicProposalToken(token) || publication.token_hash !== hashPublicProposalToken(token)) return Response.json({ error: "public_proposal_not_available" }, { status: 409 });
  const readiness = publicProposalReadiness({ token, previewIds, diagnosisIds, socialIds, price: commercial.negotiated_price, currency: commercial.currency, terms: proposal.terms || commercial.specific_terms, validUntil: proposal.valid_until, oldUrl: lead.site_antigo, previewFound: Boolean(previewResult.data), diagnosesFound: (diagnosisResult.data ?? []).length === diagnosisIds.length, socialFound: (socialResult.data ?? []).length === socialIds.length, commercialSnapshot: commercial });
  if (!readiness.ready) return Response.json({ error: "public_proposal_incomplete", missing: readiness.missing }, { status: 409 });
  const criteria = diagnosisFactsFromCriteria((diagnosisResult.data ?? []).flatMap((row) => Array.isArray(row.criteria) ? row.criteria : [row.criteria]));
  const firstLine = lead.nota
    ? `Vi a avaliação pública de ${lead.nota}${lead.avaliacoes ? ` (${lead.avaliacoes} avaliações)` : ""} para ${lead.nome}.`
    : criteria[0]
      ? `No diagnóstico de ${lead.nome}, foi observado: ${criteria[0]}`
      : `Revisei a apresentação pública de ${lead.nome} e preparei uma observação específica sobre o site.`;
  let draft;
  try { draft = buildProspectorDraft({ businessName: lead.nome, firstLine, diagnosis: criteria.slice(1), publicUrl, sellerName: settings.seller_name, identity: settings.identity, whatsapp: settings.whatsapp }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "prospector_draft_invalid" }, { status: 409 }); }
  const row = { id: id(), lead_slug: proposal.lead_slug, proposal_id: proposal.id, recipient: lead.email, subject: draft.subject, body: draft.body, status: "draft", provider: "mock", attempt: 0 };
  const { data, error } = await db.from("ds_emails").insert(row).select().single();
  if (error) return Response.json({ error: "storage_unavailable" }, { status: 503 });
  await db.from("ds_timeline").insert({ id: `evt_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`, lead_slug: proposal.lead_slug, event: "email.prospector_draft", detail: data.id, is_demo: false });
  return Response.json(data, { status: 201 });
}
