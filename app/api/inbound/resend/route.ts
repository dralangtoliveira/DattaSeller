import { Resend } from "resend";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { handleResendReply } from "@/lib/integrations/resend-reply-webhook";
export const runtime = "nodejs";
export async function POST(request: Request) { const raw = await request.text(), resend = new Resend(process.env.RESEND_API_KEY); return handleResendReply({ raw, headers: request.headers, secret: process.env.RESEND_WEBHOOK_SECRET, verify: (input: unknown) => resend.webhooks.verify(input as never), db: createSupabaseAdminClient }); }
