import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAllowedOwner } from "@/lib/auth/owner";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
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

export const config = { matcher: ["/admin/:path*"] };
