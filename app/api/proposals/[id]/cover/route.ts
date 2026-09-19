import { createSupabaseServerClient } from "@/lib/supabase/server";
// @ts-expect-error helper is deliberately implemented in plain JS and covered by node:test.
import { renderProspectorProposalCover } from "@/lib/prospector-proposal-cover.js";

export const runtime = "nodejs";

type ArtifactRefs = {
  preview_ids?: unknown;
  diagnosis_ids?: unknown;
  social_audit_ids?: unknown;
};

const stringIds = (value: unknown) => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === "string" && item.length > 0).slice(0, 20)
  : [];

async function adminContext() {
  const db = await createSupabaseServerClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data: profile } = await db.from("ds_users").select("role").eq("id", user.id).maybeSingle();
  return profile?.role === "admin" ? { db } : null;
}

async function settings(db: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const { data, error } = await db.from("ds_settings").select("key,value");
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((row) => [row.key, row.value]));
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await adminContext();
  if (!auth) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const { db } = auth;
  const { data: proposal, error: proposalError } = await db
    .from("ds_proposals")
    .select("id,lead_slug,artifacts")
    .eq("id", id)
    .maybeSingle();

  if (proposalError) return Response.json({ error: "storage_unavailable" }, { status: 503 });
  if (!proposal) return Response.json({ error: "proposal_not_found" }, { status: 404 });

  const artifacts = proposal.artifacts && typeof proposal.artifacts === "object"
    ? proposal.artifacts as ArtifactRefs
    : {};
  const previewIds = stringIds(artifacts.preview_ids);
  const diagnosisIds = stringIds(artifacts.diagnosis_ids);
  const socialIds = stringIds(artifacts.social_audit_ids);
  const previewId = previewIds[0];
  if (!previewId) return Response.json({ error: "proposal_requires_preview" }, { status: 409 });

  const leadResult = await db
    .from("ds_leads")
    .select("nome,site_antigo")
    .eq("slug", proposal.lead_slug)
    .is("deleted_at", null)
    .maybeSingle();
  const previewResult = await db
    .from("ds_previews")
    .select("id")
    .eq("id", previewId)
    .eq("lead_slug", proposal.lead_slug)
    .maybeSingle();
  const diagnosisResult = diagnosisIds.length
    ? await db.from("ds_site_diagnoses").select("id,criteria").eq("lead_slug", proposal.lead_slug).in("id", diagnosisIds)
    : { data: [], error: null };
  const socialResult = socialIds.length
    ? await db.from("ds_social_audits").select("id,platform,username,factual_notes,consistency_note,recommendation,creative_direction").eq("lead_slug", proposal.lead_slug).in("id", socialIds)
    : { data: [], error: null };

  if (leadResult.error || previewResult.error || diagnosisResult.error || socialResult.error) {
    return Response.json({ error: "storage_unavailable" }, { status: 503 });
  }
  if (!leadResult.data || !previewResult.data) {
    return Response.json({ error: "proposal_preview_not_found" }, { status: 404 });
  }

  const diagnosisCriteria = (diagnosisResult.data ?? []).flatMap((row) => Array.isArray(row.criteria) ? row.criteria : [row.criteria]);
  const config = await settings(db).catch(() => null);
  if (!config) return Response.json({ error: "storage_unavailable" }, { status: 503 });

  return new Response(renderProspectorProposalCover({
    clientName: leadResult.data.nome || proposal.lead_slug,
    previewUrl: `/api/previews/${previewResult.data.id}`,
    oldUrl: leadResult.data.site_antigo,
    author: config.seller_name || config.company_name,
    identity: config.identity,
    whatsapp: config.whatsapp,
    diagnosisCriteria,
    socialAudits: socialResult.data ?? [],
  }), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
