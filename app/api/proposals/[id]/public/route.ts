import { createSupabaseServerClient } from "@/lib/supabase/server";
// @ts-expect-error Plain JS helpers are covered by node:test.
import { createPublicProposalToken, hashPublicProposalToken, publicProposalReadiness } from "@/lib/public-proposal.js";
// @ts-expect-error Plain JS commercial contract is covered by node:test.
import { validateCommercialSnapshot } from "@/lib/commercial/datta360-catalog.js";

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
const ids = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0) : [];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await adminContext();
  if (!auth) return noStore({ error: "unauthorized" }, 401);
  const proposalId = (await params).id;
  const { data: proposal, error } = await auth.db.from("ds_proposals").select("id,lead_slug,terms,valid_until,artifacts").eq("id", proposalId).maybeSingle();
  if (error) return noStore({ error: "storage_unavailable" }, 503);
  if (!proposal) return noStore({ error: "proposal_not_found" }, 404);
  const artifacts = artifactObject(proposal.artifacts);
  const existing = artifactObject(artifacts.public_proposal);
  const snapshot = artifactObject(artifacts.commercial_snapshot);
  if (!validateCommercialSnapshot(snapshot)) return noStore({ error: "proposal_commercial_snapshot_incomplete" }, 409);
  const previewIds = ids(artifacts.preview_ids), diagnosisIds = ids(artifacts.diagnosis_ids), socialIds = ids(artifacts.social_audit_ids);
  if (!previewIds.length || !diagnosisIds.length || !socialIds.length) return noStore({ error: "proposal_artifacts_incomplete" }, 409);

  const [lead, previews, diagnoses, social, settings] = await Promise.all([
    auth.db.from("ds_leads").select("site_antigo").eq("slug", proposal.lead_slug).is("deleted_at", null).maybeSingle(),
    auth.db.from("ds_previews").select("id").eq("lead_slug", proposal.lead_slug).in("id", previewIds),
    auth.db.from("ds_site_diagnoses").select("id").eq("lead_slug", proposal.lead_slug).in("id", diagnosisIds),
    auth.db.from("ds_social_audits").select("id").eq("lead_slug", proposal.lead_slug).in("id", socialIds),
    auth.db.from("ds_settings").select("key,value"),
  ]);
  if (lead.error || previews.error || diagnoses.error || social.error || settings.error) return noStore({ error: "storage_unavailable" }, 503);

  const cfg = Object.fromEntries((settings.data ?? []).map((row) => [row.key, row.value]));
  const requestOrigin = new URL(request.url).origin;
  const configured = String(cfg.public_base_url ?? "").replace(/\/$/, "");
  const base = configured || requestOrigin;
  if (!/^https:\/\/[^/?#]+$/i.test(base)) return noStore({ error: "public_base_url_required" }, 409);

  const token = createPublicProposalToken();
  const readiness = publicProposalReadiness({
    token,
    previewIds,
    diagnosisIds,
    socialIds,
    price: snapshot.negotiated_price,
    currency: snapshot.currency,
    terms: proposal.terms || snapshot.specific_terms,
    validUntil: proposal.valid_until,
    oldUrl: lead.data?.site_antigo,
    previewFound: (previews.data?.length ?? 0) === previewIds.length,
    diagnosesFound: (diagnoses.data?.length ?? 0) === diagnosisIds.length,
    socialFound: (social.data?.length ?? 0) === socialIds.length,
    commercialSnapshot: snapshot,
  });
  if (!readiness.ready) return noStore({ error: "proposal_publication_incomplete", missing: readiness.missing }, 409);

  const activeHash = typeof existing.token_hash === "string" && !existing.revoked_at ? existing.token_hash : "";
  if (activeHash) {
    const { data: emails, error: emailError } = await auth.db.from("ds_emails").select("body").eq("proposal_id", proposal.id).order("created_at", { ascending: false }).limit(20);
    if (emailError) return noStore({ error: "storage_unavailable" }, 503);
    for (const email of emails ?? []) {
      const matches = String(email.body ?? "").match(/https:\/\/[^\s]+\/p\/[A-Za-z0-9_-]{43}/g) ?? [];
      const recovered = matches.find((candidate) => {
        try {
          const parsed = new URL(candidate);
          const candidateToken = parsed.pathname.match(/^\/p\/([A-Za-z0-9_-]{43})$/)?.[1] ?? "";
          return parsed.origin === base && hashPublicProposalToken(candidateToken) === activeHash;
        } catch {
          return false;
        }
      });
      if (recovered) return noStore({ ok: true, url: recovered, reused: true }, 200);
    }
  }

  const timestamp = new Date().toISOString();
  const publicProposal = {
    token_hash: hashPublicProposalToken(token),
    published_at: typeof existing.published_at === "string" ? existing.published_at : timestamp,
    ...(activeHash ? { rotated_at: timestamp } : {}),
    revoked_at: null,
  };
  const { error: updateError } = await auth.db.from("ds_proposals").update({ artifacts: { ...artifacts, public_proposal: publicProposal } }).eq("id", proposal.id);
  if (updateError) return noStore({ error: "storage_unavailable" }, 503);

  return noStore({ ok: true, url: new URL(`/p/${token}`, base).toString(), rotated: Boolean(activeHash) }, 201);
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
