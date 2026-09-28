import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { OWNER_COOKIE_NAME } from "@/lib/auth/constants";
import { listPublicRedirects } from "@/lib/content/repository";
import { resolveRedirect } from "@/lib/content/redirects";

export function getAdminRouteDecision(pathname: string, hasSessionCookie: boolean): "allow" | "login" {
  if (!pathname.startsWith("/admin") || pathname === "/admin/login") return "allow";
  return hasSessionCookie ? "allow" : "login";
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (getAdminRouteDecision(pathname, request.cookies.has(OWNER_COOKIE_NAME)) === "login") {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  if (!pathname.startsWith("/admin")) {
    const redirect = resolveRedirect(pathname, await listPublicRedirects());
    if (redirect) return NextResponse.redirect(new URL(redirect.destination, request.url), redirect.statusCode);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
