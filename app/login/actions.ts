"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminProfile } from "@/lib/hardening/guards";

export async function login(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent("Credenciais inválidas ou usuário sem acesso.")}`);
  const { data: profile, error: profileError } = await supabase.from("ds_users").select("role").eq("id", (await supabase.auth.getUser()).data.user?.id ?? "").maybeSingle();
  if (profileError || !isAdminProfile(profile)) {
    await supabase.auth.signOut();
    redirect(`/login?error=${encodeURIComponent("Credenciais inválidas ou usuário sem acesso.")}`);
  }
  redirect("/dashboard.html");
}
