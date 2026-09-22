import { createSupabaseAdminClient } from "@/lib/supabase/admin";
// @ts-expect-error helper is deliberately implemented in plain JS and covered by node:test.
import { publicProposalReadiness } from "@/lib/public-proposal.js";
// @ts-expect-error helper is deliberately implemented in plain JS and covered by node:test.
import { renderProspectorProposalCover } from "@/lib/prospector-proposal-cover.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const tokenIsValid = (token: string) => /^[A-Za-z0-9_-]{32,128}$/.test(token);
const stringIds = (value: unknown) => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === "string" && item.length > 0).slice(0, 20)
  : [];

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!tokenIsValid(token)) return new Response("Proposta não encontrada", { status: 404 });
  let db;
  try { db = createSupabaseAdminClient(); } catch { return new Response("Proposta indisponível", { status: 503 }); }
  const { data: proposal, error: proposalError } = await db.from("ds_proposals")
    .select("lead_slug,product_id,negotiated_price,currency,terms,valid_until,artifacts,ds_products(name)")
    .contains("artifacts", { public_token: token }).maybeSingle();
  if (proposalError) return new Response("Proposta indisponível", { status: 503 });
  if (!proposal) return new Response("Proposta não encontrada", { status: 404 });

  const artifacts = proposal.artifacts && typeof proposal.artifacts === "object" ? proposal.artifacts as Record<string, unknown> : {};
  const previewIds = stringIds(artifacts.preview_ids), diagnosisIds = stringIds(artifacts.diagnosis_ids), socialIds = stringIds(artifacts.social_audit_ids);
  const previewId = previewIds[0];
  if (!previewId) return new Response("Proposta ainda não está completa para publicação", { status: 409 });
  const [leadResult, previewResult, diagnosisResult, socialResult, settingsResult] = await Promise.all([
    db.from("ds_leads").select("nome,site_antigo").eq("slug", proposal.lead_slug).is("deleted_at", null).maybeSingle(),
    db.from("ds_previews").select("id,content").eq("id", previewId).eq("lead_slug", proposal.lead_slug).maybeSingle(),
    diagnosisIds.length ? db.from("ds_site_diagnoses").select("criteria").eq("lead_slug", proposal.lead_slug).in("id", diagnosisIds) : Promise.resolve({ data: [], error: null }),
    socialIds.length ? db.from("ds_social_audits").select("platform,username,factual_notes,consistency_note,recommendation,creative_direction").eq("lead_slug", proposal.lead_slug).in("id", socialIds) : Promise.resolve({ data: [], error: null }),
    db.from("ds_settings").select("key,value"),
  ]);
  if (leadResult.error || previewResult.error || diagnosisResult.error || socialResult.error || settingsResult.error) return new Response("Proposta indisponível", { status: 503 });
  if (!leadResult.data || !previewResult.data) return new Response("Proposta não encontrada", { status: 404 });
  const readiness = publicProposalReadiness({ token, previewIds, diagnosisIds, socialIds, price: proposal.negotiated_price, currency: proposal.currency, terms: proposal.terms, validUntil: proposal.valid_until, oldUrl: leadResult.data.site_antigo, previewFound: Boolean(previewResult.data), diagnosesFound: (diagnosisResult.data ?? []).length === diagnosisIds.length, socialFound: (socialResult.data ?? []).length === socialIds.length });
  if (!readiness.ready) return new Response("Proposta ainda não está completa para publicação", { status: 409 });
  const settings = Object.fromEntries((settingsResult.data ?? []).map((row) => [row.key, row.value]));
  const diagnosisCriteria = (diagnosisResult.data ?? []).flatMap((row) => Array.isArray(row.criteria) ? row.criteria : [row.criteria]);
  const product = proposal.ds_products as unknown as { name?: string } | null;
  return new Response(renderProspectorProposalCover({ clientName: leadResult.data.nome || proposal.lead_slug, previewUrl: `/api/previews/${previewResult.data.id}`, previewDocument: previewResult.data.content, oldUrl: leadResult.data.site_antigo, author: settings.seller_name || settings.company_name, identity: settings.identity, whatsapp: settings.whatsapp, productName: product?.name || proposal.product_id, price: proposal.negotiated_price, currency: proposal.currency, terms: proposal.terms, validUntil: proposal.valid_until ? new Date(proposal.valid_until).toLocaleDateString("pt-BR") : null, diagnosisCriteria, socialAudits: socialResult.data ?? [] }), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" },
  });
}
