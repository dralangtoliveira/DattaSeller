import { createSupabaseServerClient } from "@/lib/supabase/server";
// @ts-expect-error Plain JS helper is covered by node:test.
import { createPublicProposalToken, hashPublicProposalToken } from "@/lib/public-proposal.js";

export const runtime = "nodejs";

async function adminContext() {
  const db = await createSupabaseServerClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data: profile } = await db.from("ds_users").select("role").eq("id", user.id).maybeSingle();
  return profile?.role === "admin" ? { db } : null;
}

const noStore = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const artifactObject = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

async function proposalForPublication(db: Awaited<ReturnType<typeof createSupabaseServerClient>>, id: string) {
  const { data, error } = await db.from("ds_proposals").select("id,lead_slug,artifacts").eq("id", id).maybeSingle();
  if (error) return { error: "storage_unavailable" as const };
  if (!data) return { error: "proposal_not_found" as const };
  const artifacts = artifactObject(data.artifacts);
  const previewIds = Array.isArray(artifacts.preview_ids) ? artifacts.preview_ids.filter((item): item is string => typeof item === "string") : [];
  const diagnosisIds = Array.isArray(artifacts.diagnosis_ids) ? artifacts.diagnosis_ids.filter((item): item is string => typeof item === "string") : [];
  const socialIds = Array.isArray(artifacts.social_audit_ids) ? artifacts.social_audit_ids.filter((item): item is string => typeof item === "string") : [];
  if (!previewIds.length || !diagnosisIds.length || !socialIds.length) return { error: "proposal_artifacts_incomplete" as const };
  const [preview, diagnosis, social] = await Promise.all([
    db.from("ds_previews").select("id").eq("lead_slug", data.lead_slug).in("id", previewIds),
    db.from("ds_site_diagnoses").select("id").eq("lead_slug", data.lead_slug).in("id", diagnosisIds),
    db.from("ds_social_audits").select("id").eq("lead_slug", data.lead_slug).in("id", socialIds),
  ]);
  if (preview.error || diagnosis.error || social.error) return { error: "storage_unavailable" as const };
  if ((preview.data?.length ?? 0) !== previewIds.length || (diagnosis.data?.length ?? 0) !== diagnosisIds.length || (social.data?.length ?? 0) !== socialIds.length) return { error: "proposal_artifacts_cross_lead" as const };
  return { proposal: data, artifacts };
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await adminContext();
  if (!auth) return noStore({ error: "unauthorized" }, 401);
  const loaded = await proposalForPublication(auth.db, (await params).id);
  if ("error" in loaded) return noStore({ error: loaded.error }, loaded.error === "storage_unavailable" ? 503 : 409);
  const existing = artifactObject(loaded.artifacts.public_proposal);
  if (typeof existing.token_hash === "string" && !existing.revoked_at) return noStore({ error: "proposal_already_published" }, 409);
  const token = createPublicProposalToken();
  const publicProposal = { token_hash: hashPublicProposalToken(token), published_at: new Date().toISOString(), revoked_at: null };
  const { error } = await auth.db.from("ds_proposals").update({ artifacts: { ...loaded.artifacts, public_proposal: publicProposal } }).eq("id", loaded.proposal.id);
  if (error) return noStore({ error: "storage_unavailable" }, 503);
  return noStore({ ok: true, url: `/p/${token}` }, 201);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await adminContext();
  if (!auth) return noStore({ error: "unauthorized" }, 401);
  const { data, error } = await auth.db.from("ds_proposals").select("id,artifacts").eq("id", (await params).id).maybeSingle();
  if (error) return noStore({ error: "storage_unavailable" }, 503);
  if (!data) return noStore({ error: "proposal_not_found" }, 404);
  const artifacts = artifactObject(data.artifacts);
  const publicProposal = artifactObject(artifacts.public_proposal);
  if (typeof publicProposal.token_hash !== "string" || publicProposal.revoked_at) return noStore({ error: "proposal_not_published" }, 409);
  const { error: updateError } = await auth.db.from("ds_proposals").update({ artifacts: { ...artifacts, public_proposal: { ...publicProposal, revoked_at: new Date().toISOString() } } }).eq("id", data.id);
  return updateError ? noStore({ error: "storage_unavailable" }, 503) : noStore({ ok: true });
}
