import { createSupabaseServerClient } from "@/lib/supabase/server";
// @ts-expect-error helper is deliberately implemented in plain JS and covered by node:test.
import { buildProspectorDraft } from "@/lib/email/prospector-draft.js";

export const runtime = "nodejs";

const ids = (value: unknown) => Array.isArray(value) ? value.filter((x): x is string => typeof x === "string" && x.length > 0) : [];
const id = () => `email_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = await createSupabaseServerClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { data: profile } = await db.from("ds_users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return Response.json({ error: "forbidden" }, { status: 403 });
  const { id: proposalId } = await params;
  const { data: proposal } = await db.from("ds_proposals").select("id,lead_slug,artifacts").eq("id", proposalId).maybeSingle();
  if (!proposal) return Response.json({ error: "proposal_not_found" }, { status: 404 });
  const artifacts = proposal.artifacts && typeof proposal.artifacts === "object" ? proposal.artifacts as Record<string, unknown> : {};
  const token = typeof artifacts.public_token === "string" && /^[A-Za-z0-9_-]{32,128}$/.test(artifacts.public_token) ? artifacts.public_token : "";
  if (!token) return Response.json({ error: "public_proposal_required" }, { status: 409 });
  const [leadResult, diagnosisResult, settingsResult] = await Promise.all([
    db.from("ds_leads").select("nome,email,nota,avaliacoes").eq("slug", proposal.lead_slug).is("deleted_at", null).maybeSingle(),
    ids(artifacts.diagnosis_ids).length ? db.from("ds_site_diagnoses").select("criteria").eq("lead_slug", proposal.lead_slug).in("id", ids(artifacts.diagnosis_ids)) : Promise.resolve({ data: [] }),
    db.from("ds_settings").select("key,value"),
  ]);
  const lead = leadResult.data;
  if (!lead?.email) return Response.json({ error: "lead_email_required" }, { status: 409 });
  const settings = Object.fromEntries((settingsResult.data ?? []).map((row) => [row.key, row.value]));
  const base = String(settings.public_base_url ?? process.env.DATTASELLER_PUBLIC_URL ?? "").replace(/\/$/, "");
  if (!/^https:\/\/[^/?#]+$/i.test(base)) return Response.json({ error: "public_base_url_required" }, { status: 409 });
  const criteria = (diagnosisResult.data ?? []).flatMap((row) => Array.isArray(row.criteria) ? row.criteria : [row.criteria]).map((x: unknown) => typeof x === "string" ? x : String((x as { detail?: unknown })?.detail ?? "")).filter(Boolean);
  const firstLine = lead.nota ? `Vi a avaliação pública de ${lead.nota}${lead.avaliacoes ? ` (${lead.avaliacoes} avaliações)` : ""} para ${lead.nome}.` : `Vi a apresentação pública de ${lead.nome} e preparei uma observação específica sobre o site.`;
  let draft;
  try { draft = buildProspectorDraft({ businessName: lead.nome, firstLine, diagnosis: criteria, publicUrl: `${base}/p/${token}`, sellerName: settings.seller_name, identity: settings.identity, whatsapp: settings.whatsapp }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "prospector_draft_invalid" }, { status: 409 }); }
  const row = { id: id(), lead_slug: proposal.lead_slug, proposal_id: proposal.id, recipient: lead.email, subject: draft.subject, body: draft.body, status: "draft", provider: "mock", attempt: 0 };
  const { data, error } = await db.from("ds_emails").insert(row).select().single();
  if (error) return Response.json({ error: "storage_unavailable" }, { status: 503 });
  await db.from("ds_timeline").insert({ id: `evt_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`, lead_slug: proposal.lead_slug, event: "email.prospector_draft", detail: data.id, is_demo: false });
  return Response.json(data, { status: 201 });
}
