import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { handleDatta360Webhook } from "@/lib/integrations/datta360-webhook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const raw = await request.text();
  return handleDatta360Webhook({
    raw,
    signature: request.headers.get("x-dattaseller-signature"),
    requestId: request.headers.get("x-request-id"),
    secret: process.env.DATTA360_WEBHOOK_SECRET,
    supabase: () => createSupabaseAdminClient(),
  });
}
