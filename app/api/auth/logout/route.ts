import { NextResponse } from "next/server";
import { signOutSafely } from "@/lib/auth/logout";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

export async function POST() {
  try {
    const db = await createSupabaseServerClient();
    const result = await signOutSafely(db);
    if (!result.ok) {
      return NextResponse.json(result, { status: 500, headers: noStore });
    }
    return NextResponse.json(result, { headers: noStore });
  } catch {
    return NextResponse.json({ ok: false, error: "logout_failed" }, { status: 500, headers: noStore });
  }
}
