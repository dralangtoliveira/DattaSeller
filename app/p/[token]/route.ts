import { createSupabaseAdminClient } from "@/lib/supabase/admin";
// @ts-expect-error Plain JS helpers are covered by node:test.
import { hashPublicProposalToken, publicProposalReadiness, sanitizePublicPreviewHtml } from "@/lib/public-proposal.js";
// @ts-expect-error Plain JS renderer is covered by node:test.
import { renderProspectorProposalCover } from "@/lib/prospector-proposal-cover.js";
// @ts-expect-error Plain JS commercial contract is covered by node:test.
import { validateCommercialSnapshot } from "@/lib/commercial/datta360-catalog.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const artifactObject = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const stringIds = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0).slice(0, 20) : [];
const publicHeaders = () => ({
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; frame-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
});
const notFound = () => new Response("Not found", { status: 404, headers: publicHeaders() });

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token;
  const hash = hashPublicProposalToken(token);
  if (!hash) return notFound();

  let db;
  try { db = createSupabaseAdminClient(); }
  catch { return new Response("Unavailable", { status: 503, headers: publicHeaders() }); }

  const { data: proposals, error } = await db.from("ds_proposals")
    .select("id,lead_slug,product_id,negotiated_price,currency,terms,valid_until,artifacts")
    .contains("artifacts", { public_proposal: { token_hash: hash } })
    .limit(2);
  if (error) return new Response("Unavailable", { status: 503, headers: publicHeaders() });

  const proposal = proposals?.length === 1 ? proposals[0] : null;
  if (!proposal) return notFound();
  const artifacts = artifactObject(proposal.artifacts);
  const publication = artifactObject(artifacts.public_proposal);
  if (publication.token_hash !== hash || publication.revoked_at) return notFound();

  const snapshot = artifactObject(artifacts.commercial_snapshot);
  if (!validateCommercialSnapshot(snapshot)) return notFound();
  const paymentTerms = artifactObject(snapshot.payment_terms);

  const previewIds = stringIds(artifacts.preview_ids);
  const diagnosisIds = stringIds(artifacts.diagnosis_ids);
  const socialIds = stringIds(artifacts.social_audit_ids);

  const [leadResult, previewResult, diagnosisResult, socialResult] = await Promise.all([
    db.from("ds_leads").select("nome,site_antigo").eq("slug", proposal.lead_slug).is("deleted_at", null).maybeSingle(),
    previewIds[0] ? db.from("ds_previews").select("id,content").eq("id", previewIds[0]).eq("lead_slug", proposal.lead_slug).maybeSingle() : Promise.resolve({ data: null, error: null }),
    diagnosisIds.length ? db.from("ds_site_diagnoses").select("id,criteria").eq("lead_slug", proposal.lead_slug).in("id", diagnosisIds) : Promise.resolve({ data: [], error: null }),
    socialIds.length ? db.from("ds_social_audits").select("id,platform,username,factual_notes,consistency_note,recommendation,creative_direction").eq("lead_slug", proposal.lead_slug).in("id", socialIds) : Promise.resolve({ data: [], error: null }),
  ]);

  if (leadResult.error || previewResult.error || diagnosisResult.error || socialResult.error || !leadResult.data || !previewResult.data) return notFound();

  const terms = String(
    proposal.terms
    || snapshot.specific_terms
    || `Prazo: ${snapshot.delivery_days} dias · Pagamento: ${paymentTerms.deposit_pct}% na contratação e ${paymentTerms.delivery_pct}% na entrega`
  );
  const readiness = publicProposalReadiness({
    token,
    previewIds,
    diagnosisIds,
    socialIds,
    price: snapshot.negotiated_price,
    currency: snapshot.currency,
    terms,
    validUntil: proposal.valid_until,
    oldUrl: leadResult.data.site_antigo,
    previewFound: Boolean(previewResult.data),
    diagnosesFound: (diagnosisResult.data ?? []).length === diagnosisIds.length,
    socialFound: (socialResult.data ?? []).length === socialIds.length,
    commercialSnapshot: snapshot,
  });
  if (!readiness.ready) return notFound();

  const diagnosisCriteria = (diagnosisResult.data ?? []).flatMap((row) => Array.isArray(row.criteria) ? row.criteria : [row.criteria]);
  return new Response(renderProspectorProposalCover({
    clientName: leadResult.data.nome || proposal.lead_slug,
    previewDocument: sanitizePublicPreviewHtml(previewResult.data.content),
    oldUrl: leadResult.data.site_antigo,
    productName: snapshot.service_name || proposal.product_id,
    price: snapshot.negotiated_price,
    currency: snapshot.currency,
    terms,
    validUntil: proposal.valid_until ? new Date(proposal.valid_until).toLocaleDateString("pt-BR") : null,
    diagnosisCriteria,
    socialAudits: socialResult.data ?? [],
  }), { headers: publicHeaders() });
}
