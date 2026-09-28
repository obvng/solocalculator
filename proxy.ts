import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAllowedOwner } from "@/lib/auth/owner";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const adminPath = request.nextUrl.pathname.startsWith("/admin");
  if (!adminPath) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (url && key) {
      const supabase = createClient(url, key, { auth: { persistSession: false } });
      const { data } = await supabase.from("redirects").select("destination,status_code").eq("source_path", request.nextUrl.pathname).eq("enabled", true).maybeSingle();
      if (data) return NextResponse.redirect(new URL(data.destination, request.url), data.status_code);
    }
    return NextResponse.next();
  }

  const { response, email } = await updateSession(request);
  const loginPath = request.nextUrl.pathname === "/admin/login";

  if (!email && !loginPath) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  if (email && !isAllowedOwner(email)) {
    return NextResponse.redirect(new URL("/admin/login?error=unauthorized", request.url));
  }
  if (email && loginPath) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
