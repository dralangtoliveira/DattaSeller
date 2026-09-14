import { Resend } from "resend";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const id = (prefix: string) => `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
const now = () => new Date().toISOString();
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

function validEmail(value: unknown) {
  const text = String(value ?? "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) && !text.endsWith(".invalid");
}

function validFrom(value: unknown) {
  const text = String(value ?? "").trim();
  const match = text.match(/<([^>]+)>$/);
  return validEmail(match ? match[1] : text);
}

export async function POST(request: Request) {
  const db = await createSupabaseServerClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return json({ error: "unauthorized" }, 401);

  const { data: profile } = await db.from("ds_users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return json({ error: "forbidden" }, 403);

  const body = await request.json().catch(() => ({}));
  const emailId = String(body.email_id || "").trim();
  if (!emailId) return json({ error: "email_id é obrigatório" }, 400);

  const { data: email, error: emailError } = await db.from("ds_emails").select("*").eq("id", emailId).maybeSingle();
  if (emailError) return json({ error: emailError.message }, 400);
  if (!email) return json({ error: "E-mail não encontrado" }, 404);
  if (email.status !== "approved") return json({ error: "O e-mail precisa estar aprovado antes do envio real." }, 409);
  if (!String(email.subject || "").trim() || !String(email.body || "").trim()) return json({ error: "Assunto e corpo são obrigatórios." }, 400);

  const { data: lead } = await db.from("ds_leads").select("email").eq("slug", email.lead_slug).maybeSingle();
  const recipient = String(email.recipient || lead?.email || "").trim();
  if (!validEmail(recipient)) return json({ error: "O lead não possui e-mail válido para envio." }, 400);

  const { data: rows } = await db.from("ds_settings").select("key,value").in("key", ["email_sender", "email_reply_to"]);
  const settings = Object.fromEntries((rows ?? []).map((row) => [row.key, row.value]));
  const configuredFrom = String(settings.email_sender || "").trim();
  const from = validFrom(configuredFrom) ? configuredFrom : "Datta360 <noreply@mail.datta360.com.br>";
  const configuredReplyTo = String(settings.email_reply_to || "").trim();
  const replyTo = validEmail(configuredReplyTo) ? configuredReplyTo : undefined;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return json({ error: "RESEND_API_KEY não configurada no servidor." }, 503);

  const attempt = Number(email.attempt || 0) + 1;
  try {
    const result = await new Resend(apiKey).emails.send({
      from,
      to: [recipient],
      replyTo,
      subject: String(email.subject),
      text: String(email.body),
      headers: { "X-Entity-Ref-ID": email.id },
    });

    if (result.error) throw new Error(result.error.message);

    const providerMessageId = result.data?.id || null;
    const { error: updateError } = await db.from("ds_emails").update({
      status: "sent",
      provider: "resend",
      provider_message_id: providerMessageId,
      recipient,
      sender: from,
      reply_to: replyTo || null,
      error: null,
      attempt,
      updated_at: now(),
    }).eq("id", email.id);
    if (updateError) return json({ error: updateError.message }, 500);

    await db.from("ds_timeline").insert({
      id: id("evt"),
      lead_slug: email.lead_slug,
      event: "email.sent",
      detail: providerMessageId || "resend",
      is_demo: false,
    });

    return json({ ok: true, status: "sent", provider: "resend", provider_message_id: providerMessageId, recipient });
  } catch (error) {
    const message = error instanceof Error ? error.message : "provider_send_failed";
    await db.from("ds_emails").update({
      status: "failed",
      provider: "resend",
      error: "provider_send_failed",
      attempt,
      updated_at: now(),
    }).eq("id", email.id);
    await db.from("ds_timeline").insert({
      id: id("evt"),
      lead_slug: email.lead_slug,
      event: "email.failed",
      detail: "provider_send_failed",
      is_demo: false,
    });
    return json({ error: "Falha no envio pelo Resend.", detail: message }, 502);
  }
}
