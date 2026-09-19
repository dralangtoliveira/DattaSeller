import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (items) => {
          items.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("ds_users").select("role").eq("id", user.id).maybeSingle() : { data: null };
  const isAdmin = profile?.role === "admin";
  const path = request.nextUrl.pathname;
  // O contexto do Worker Agent (DS-VALUE-04) passa pela borda porque a própria
  // rota exige token do worker OU sessão admin; sem isso ela responde 401.
  const isPublic = path === "/login" || path === "/api/auth/logout" || path.startsWith("/api/inbound/") || path === "/api/worker/context";
  if (!isAdmin && !isPublic) {
    if (user) await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (isAdmin && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard.html";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
