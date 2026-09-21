import { createSupabaseAdminClient } from "@/lib/supabase/admin";
// @ts-expect-error Plain JS helpers are covered by node:test.
import { hashPublicProposalToken, sanitizePublicPreviewHtml } from "@/lib/public-proposal.js";
// @ts-expect-error Plain JS renderer is covered by node:test.
import { renderProspectorProposalCover } from "@/lib/prospector-proposal-cover.js";

export const runtime = "nodejs";

type ArtifactRefs = { preview_ids?: unknown; diagnosis_ids?: unknown; social_audit_ids?: unknown; public_proposal?: unknown };
const stringIds = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0).slice(0, 20) : [];
const publicHeaders = () => ({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow, noarchive", "X-Frame-Options": "DENY", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; frame-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'", "Referrer-Policy": "no-referrer", "Permissions-Policy": "camera=(), microphone=(), geolocation=()" });
const notFound = () => new Response("Not found", { status: 404, headers: publicHeaders() });

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const hash = hashPublicProposalToken((await params).token);
  if (!hash) return notFound();
  let db;
  try { db = createSupabaseAdminClient(); } catch { return new Response("Unavailable", { status: 503, headers: publicHeaders() }); }
  const { data: proposals, error } = await db.from("ds_proposals").select("id,lead_slug,artifacts").contains("artifacts", { public_proposal: { token_hash: hash } }).limit(2);
  if (error) return new Response("Unavailable", { status: 503, headers: publicHeaders() });
  const proposal = proposals?.length === 1 ? proposals[0] : null;
  const artifacts = proposal?.artifacts && typeof proposal.artifacts === "object" ? proposal.artifacts as ArtifactRefs : null;
  const publication = artifacts?.public_proposal && typeof artifacts.public_proposal === "object" ? artifacts.public_proposal as Record<string, unknown> : null;
  if (!proposal || !publication || publication.token_hash !== hash || publication.revoked_at) return notFound();
  const publishedArtifacts = artifacts as ArtifactRefs;
  const previewIds = stringIds(publishedArtifacts.preview_ids), diagnosisIds = stringIds(publishedArtifacts.diagnosis_ids), socialIds = stringIds(publishedArtifacts.social_audit_ids);
  if (!previewIds.length || !diagnosisIds.length || !socialIds.length) return notFound();
  const [lead, preview, diagnosis, social] = await Promise.all([
    db.from("ds_leads").select("nome,site_antigo").eq("slug", proposal.lead_slug).is("deleted_at", null).maybeSingle(),
    db.from("ds_previews").select("id,content").eq("id", previewIds[0]).eq("lead_slug", proposal.lead_slug).maybeSingle(),
    db.from("ds_site_diagnoses").select("id,criteria").eq("lead_slug", proposal.lead_slug).in("id", diagnosisIds),
    db.from("ds_social_audits").select("id,platform,username,factual_notes,consistency_note,recommendation,creative_direction").eq("lead_slug", proposal.lead_slug).in("id", socialIds),
  ]);
  if (lead.error || preview.error || diagnosis.error || social.error || !lead.data || !preview.data || (diagnosis.data?.length ?? 0) !== diagnosisIds.length || (social.data?.length ?? 0) !== socialIds.length) return notFound();
  const diagnosisCriteria = (diagnosis.data ?? []).flatMap((row) => Array.isArray(row.criteria) ? row.criteria : [row.criteria]);
  return new Response(renderProspectorProposalCover({ clientName: lead.data.nome || proposal.lead_slug, oldUrl: lead.data.site_antigo, diagnosisCriteria, socialAudits: social.data ?? [], publicMode: true, previewHtml: sanitizePublicPreviewHtml(preview.data.content) }), { headers: publicHeaders() });
}
