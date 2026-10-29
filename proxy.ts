import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { OWNER_COOKIE_NAME } from "@/lib/auth/constants";
import { listPublicRedirects } from "@/lib/content/repository";
import { resolveRedirect } from "@/lib/content/redirects";
import { toolBySlug } from "@/lib/tools/catalog";

type LegacySeoDecision =
  | { type: "redirect"; destination: string; statusCode: 301 | 308 }
  | { type: "gone" };

const legacyRedirects = new Map<string, string>([
  ["/calculator", "/calculators"],
  ["/percentage-of-calculator", "/percentage-calculator"],
  ["/percentage-increase-calculator", "/percentage-calculator"],
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
  if (destination) return { type: "redirect", destination, statusCode: pathname.endsWith(".html") ? 308 : 301 };
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
    const slug = pathname.slice(1);
    const publicRoutes = new Set(["", "blog", "calculators", "social-image"]);
    if (!slug.includes("/") && !slug.includes(".") && !publicRoutes.has(slug) && !toolBySlug.has(slug)) {
      return new NextResponse('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found | SoloCalculator</title><meta name="robots" content="noindex, follow"><meta name="description" content="The page you requested could not be found. Browse SoloCalculator calculators and guides."></head><body style="margin:0;background:#edf7ff;color:#07164f;font-family:system-ui,sans-serif"><main style="max-width:760px;margin:10vh auto;padding:48px;border-radius:24px;background:white"><a href="/" style="color:#006cff">SOLOCALCULATOR.COM</a><p>404</p><h1>Page not found</h1><p>The page may have moved or the address may be incorrect.</p><a href="/calculators" style="color:#006cff">Browse calculators</a></main></body></html>', { status: 404, headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex, follow" } });
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
