const clean = (v: unknown, n = 12000) => String(v ?? "").replace(/\0/g, "").trim().slice(0, n);
const json = (body: Record<string, unknown>, status = 200) => Response.json(body, { status });
export async function handleResendReply({ raw, headers, secret, verify, db }: any) {
  if (!secret) return json({ error: "webhook_not_configured" }, 503);
  let event: any; try { event = await verify({ payload: raw, secret, headers: { "svix-id": headers.get("svix-id"), "svix-timestamp": headers.get("svix-timestamp"), "svix-signature": headers.get("svix-signature") } }); } catch { return json({ error: "invalid_webhook" }, 400); }
  if (event?.type !== "email.received") return json({ ok: true, ignored: true });
  const d = event.data ?? {}, inboundId = clean(d.email_id, 160), replyTo = clean(d.in_reply_to ?? d.headers?.["in-reply-to"], 160);
  if (!inboundId || !replyTo) return json({ ok: true, ignored: true, reason: "unmatched_reply" });
  const client = db(), found = await client.from("ds_emails").select("id,lead_slug").eq("provider_message_id", replyTo).maybeSingle();
  if (found.error) return json({ error: "storage_unavailable" }, 503);
  if (!found.data) return json({ ok: true, ignored: true, reason: "unmatched_reply" });
  const duplicate = await client.from("ds_emails").select("id").eq("reply_provider_message_id", inboundId).maybeSingle();
  if (duplicate.error) return json({ error: "storage_unavailable" }, 503);
  if (duplicate.data) return json({ ok: true, duplicate: true });
  const now = new Date().toISOString(), update = await client.from("ds_emails").update({ status: "generic_reply", reply_provider_message_id: inboundId, reply_received_at: now, reply_body: clean(d.text ?? d.html), updated_at: now }).eq("id", found.data.id);
  if (update.error) return json({ error: "storage_unavailable" }, 503);
  const stored = await client.from("ds_inbound_events").insert({ source: "resend", request_id: inboundId, payload: { email_id: inboundId, in_reply_to: replyTo, from: clean(d.from, 320), subject: clean(d.subject, 998) }, status: "processed" });
  if (stored.error) return json({ error: "storage_unavailable" }, 503);
  await client.from("ds_timeline").insert({ lead_slug: found.data.lead_slug, type: "email.reply_received", detail: found.data.id });
  return json({ ok: true, email_id: found.data.id });
}
