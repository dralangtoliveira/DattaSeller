import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const MAX_PAYLOAD_BYTES = 32_000;

type DbError = { code?: string; status?: number } | null | undefined;
type SupabaseLike = { from: (table: string) => any };
type LogEntry = Record<string, string | number | null>;

type HandleWebhookOptions = {
  raw: string;
  signature: string | null;
  requestId?: string | null;
  secret?: string;
  supabase?: SupabaseLike | (() => SupabaseLike);
  now?: () => string;
  idGenerator?: () => string;
  log?: (entry: LogEntry) => void;
};

export function signDatta360Payload(raw: string, secret: string) {
  return createHmac("sha256", secret).update(raw).digest("hex");
}

export function hasValidDatta360Signature(raw: string, supplied: string | null, secret?: string) {
  if (!secret || !supplied) return false;
  const received = supplied.trim().replace(/^sha256=/i, "");
  if (!/^[a-f0-9]{64}$/i.test(received)) return false;
  const expected = Buffer.from(signDatta360Payload(raw, secret), "hex");
  const actual = Buffer.from(received, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const clean = (value: unknown, max = 500) => String(value ?? "").trim().slice(0, max) || null;
const slugify = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 72);

function requestIdFor(value: string | null | undefined, idGenerator: () => string) {
  return clean(value, 160) ?? idGenerator();
}

function safeErrorCode(error: DbError) {
  return typeof error?.code === "string" && /^[A-Za-z0-9_]+$/.test(error.code) ? error.code : "unknown";
}

function response(body: Record<string, unknown>, status: number) {
  return Response.json(body, { status });
}

function storageFailure(requestId: string, stage: string, error: DbError, log: (entry: LogEntry) => void) {
  log({ event: "datta360_webhook", request_id: requestId, stage, outcome: "storage_failure", db_code: safeErrorCode(error) });
  return response({ error: "storage_unavailable", request_id: requestId }, 503);
}

export async function handleDatta360Webhook({
  raw,
  signature,
  requestId: suppliedRequestId,
  secret,
  supabase,
  now = () => new Date().toISOString(),
  idGenerator = randomUUID,
  log = (entry) => console.info(JSON.stringify(entry)),
}: HandleWebhookOptions) {
  const requestId = requestIdFor(suppliedRequestId, idGenerator);

  if (!hasValidDatta360Signature(raw, signature, secret)) {
    log({ event: "datta360_webhook", request_id: requestId, stage: "signature", outcome: "rejected", status: 401 });
    return response({ error: "unauthorized", request_id: requestId }, 401);
  }

  if (Buffer.byteLength(raw, "utf8") > MAX_PAYLOAD_BYTES) {
    log({ event: "datta360_webhook", request_id: requestId, stage: "payload", outcome: "rejected", status: 413 });
    return response({ error: "payload_too_large", request_id: requestId }, 413);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    log({ event: "datta360_webhook", request_id: requestId, stage: "payload", outcome: "rejected", status: 400 });
    return response({ error: "invalid_json", request_id: requestId }, 400);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    log({ event: "datta360_webhook", request_id: requestId, stage: "payload", outcome: "rejected", status: 400 });
    return response({ error: "invalid_json", request_id: requestId }, 400);
  }

  const body = parsed as Record<string, unknown>;
  const email = clean(body.email, 320)?.toLowerCase() ?? null;
  const telefone = clean(body.telefone ?? body.phone, 40);
  const nome = clean(body.nome ?? body.name, 160);
  if (!nome || (!email && !telefone)) {
    log({ event: "datta360_webhook", request_id: requestId, stage: "validation", outcome: "rejected", status: 422 });
    return response({ error: "name_and_contact_required", request_id: requestId }, 422);
  }

  const slug = `${slugify(nome)}-${signDatta360Payload(email ?? telefone!, secret!).slice(0, 10)}`;
  let client: SupabaseLike;
  try {
    client = typeof supabase === "function" ? supabase() : supabase!;
  } catch {
    return storageFailure(requestId, "client_init", null, log);
  }

  const event = { source: "datta360.com.br", request_id: requestId, payload: body, status: "received" };
  let eventResult: { error?: DbError };
  try {
    eventResult = await client.from("ds_inbound_events").insert(event);
  } catch {
    return storageFailure(requestId, "inbound_event_insert", null, log);
  }
  if (eventResult.error?.code === "23505") {
    log({ event: "datta360_webhook", request_id: requestId, stage: "inbound_event_insert", outcome: "duplicate", status: 200 });
    return response({ ok: true, duplicate: true, slug, request_id: requestId }, 200);
  }
  if (eventResult.error) return storageFailure(requestId, "inbound_event_insert", eventResult.error, log);

  const lead = {
    slug, nome, empresa: clean(body.empresa ?? body.company, 160), email, telefone,
    whatsapp: clean(body.whatsapp, 40), message: clean(body.mensagem ?? body.message, 4000),
    source: "datta360.com.br", source_url: clean(body.source_url, 1000), referrer: clean(body.referrer, 1000),
    utm_source: clean(body.utm_source, 160), utm_medium: clean(body.utm_medium, 160), utm_campaign: clean(body.utm_campaign, 160),
    utm_content: clean(body.utm_content, 160), utm_term: clean(body.utm_term, 160), consents: body.consents && typeof body.consents === "object" ? body.consents : {},
    status: "novo", is_demo: false, updated_at: now(),
  };

  let leadResult: { error?: DbError };
  try {
    leadResult = await client.from("ds_leads").upsert(lead, { onConflict: "slug" });
  } catch {
    return storageFailure(requestId, "lead_upsert", null, log);
  }
  try {
    const updateResult = await client.from("ds_inbound_events").update({ status: leadResult.error ? "failed" : "processed", error_sanitized: leadResult.error ? "lead_upsert_failed" : null }).eq("request_id", requestId);
    if (updateResult?.error) log({ event: "datta360_webhook", request_id: requestId, stage: "inbound_event_update", outcome: "failed", db_code: safeErrorCode(updateResult.error) });
  } catch {
    log({ event: "datta360_webhook", request_id: requestId, stage: "inbound_event_update", outcome: "failed", db_code: "unknown" });
  }
  if (leadResult.error) return storageFailure(requestId, "lead_upsert", leadResult.error, log);

  try {
    const timelineResult = await client.from("ds_timeline").insert({ id: `evt_${idGenerator()}`, lead_slug: slug, event: "lead.received", detail: "datta360.com.br", is_demo: false });
    if (timelineResult?.error) log({ event: "datta360_webhook", request_id: requestId, stage: "timeline_insert", outcome: "failed", db_code: safeErrorCode(timelineResult.error) });
  } catch {
    log({ event: "datta360_webhook", request_id: requestId, stage: "timeline_insert", outcome: "failed", db_code: "unknown" });
  }

  log({ event: "datta360_webhook", request_id: requestId, stage: "complete", outcome: "processed", status: 201 });
  return response({ ok: true, slug, request_id: requestId }, 201);
}
