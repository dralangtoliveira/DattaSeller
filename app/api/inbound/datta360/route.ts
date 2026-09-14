import { createHmac, timingSafeEqual } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function validSignature(raw: string, supplied: string | null) {
  const secret = process.env.DATTA360_WEBHOOK_SECRET;
  if (!secret || !supplied) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const received = supplied.replace(/^sha256=/, "");
  return received.length === expected.length && timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

const clean = (value: unknown, max = 500) => String(value ?? "").trim().slice(0, max) || null;
const slugify = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 72);

export async function POST(request: Request) {
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get("x-dattaseller-signature"))) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (raw.length > 32_000) return Response.json({ error: "payload_too_large" }, { status: 413 });
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { return Response.json({ error: "invalid_json" }, { status: 400 }); }
  const email = clean(body.email, 320)?.toLowerCase() ?? null;
  const telefone = clean(body.telefone ?? body.phone, 40);
  const nome = clean(body.nome ?? body.name, 160);
  if (!nome || (!email && !telefone)) return Response.json({ error: "name_and_contact_required" }, { status: 422 });
  const requestId = clean(request.headers.get("x-request-id"), 160) ?? crypto.randomUUID();
  const slug = `${slugify(nome)}-${createHmac("sha256", process.env.DATTA360_WEBHOOK_SECRET!).update(email ?? telefone!).digest("hex").slice(0, 10)}`;
  const supabase = createSupabaseAdminClient();
  const event = { source: "datta360.com.br", request_id: requestId, payload: body, status: "received" };
  const { error: eventError } = await supabase.from("ds_inbound_events").insert(event);
  if (eventError?.code === "23505") return Response.json({ ok: true, duplicate: true, slug });
  if (eventError) return Response.json({ error: "storage_unavailable" }, { status: 503 });
  const lead = {
    slug, nome, empresa: clean(body.empresa ?? body.company, 160), email, telefone,
    whatsapp: clean(body.whatsapp, 40), message: clean(body.mensagem ?? body.message, 4000),
    source: "datta360.com.br", source_url: clean(body.source_url, 1000), referrer: clean(body.referrer, 1000),
    utm_source: clean(body.utm_source, 160), utm_medium: clean(body.utm_medium, 160), utm_campaign: clean(body.utm_campaign, 160),
    utm_content: clean(body.utm_content, 160), utm_term: clean(body.utm_term, 160), consents: body.consents && typeof body.consents === "object" ? body.consents : {},
    status: "novo", is_demo: false, updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("ds_leads").upsert(lead, { onConflict: "slug" });
  await supabase.from("ds_inbound_events").update({ status: error ? "failed" : "processed", error_sanitized: error ? "lead_upsert_failed" : null }).eq("request_id", requestId);
  if (error) return Response.json({ error: "storage_unavailable" }, { status: 503 });
  await supabase.from("ds_timeline").insert({ id: `evt_${crypto.randomUUID()}`, lead_slug: slug, event: "lead.received", detail: "datta360.com.br", is_demo: false });
  return Response.json({ ok: true, slug }, { status: 201 });
}
