import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { OWNER_COOKIE_NAME } from "@/lib/auth/constants";
import { listPublicRedirects } from "@/lib/content/repository";
import { resolveRedirect } from "@/lib/content/redirects";

type LegacySeoDecision =
  | { type: "redirect"; destination: string; statusCode: 308 }
  | { type: "gone" };

const legacyRedirects = new Map<string, string>([
  ["/index.html", "/"],
  ["/home.html", "/"],
  ["/percentage-calculator.html", "/percentage-calculator"],
  ["/mortgage-calculator.html", "/loan-calculator"],
]);

const removedLegacyPaths = new Set([
  "/cgi-sys/suspendedpage.cgi",
  "/about-us.html",
  "/contact-us.html",
  "/bmi-calculator.html",
]);

export function getLegacySeoDecision(pathname: string): LegacySeoDecision | null {
  const destination = legacyRedirects.get(pathname);
  if (destination) return { type: "redirect", destination, statusCode: 308 };
  if (removedLegacyPaths.has(pathname)) return { type: "gone" };
  return null;
}

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
    const legacy = getLegacySeoDecision(pathname);
    if (legacy?.type === "redirect") {
      return NextResponse.redirect(new URL(legacy.destination, request.url), legacy.statusCode);
    }
    if (legacy?.type === "gone") {
      return new NextResponse("Gone", {
        status: 410,
        headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex" },
      });
    }
    const redirect = resolveRedirect(pathname, await listPublicRedirects());
    if (redirect) return NextResponse.redirect(new URL(redirect.destination, request.url), redirect.statusCode);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
