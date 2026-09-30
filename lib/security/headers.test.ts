import { describe, expect, it } from "vitest";
import { adminContentSecurityPolicy, publicContentSecurityPolicy, securityHeaderEntries } from "./headers";

function values(entry: (typeof securityHeaderEntries)[number]) {
  return Object.fromEntries(entry.headers.map(({ key, value }) => [key, value]));
}

describe("security headers", () => {
  it("applies common anti-sniffing, referrer, and browser-capability controls", () => {
    const common = values(securityHeaderEntries[0]);
    expect(common["X-Content-Type-Options"]).toBe("nosniff");
    expect(common["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    for (const capability of ["camera=()", "microphone=()", "geolocation=()", "payment=()", "usb=()", "browsing-topics=()"]) {
      expect(common["Permissions-Policy"]).toContain(capability);
    }
  });

  it("keeps admin pages unindexed, unframed, and uncached", () => {
    const admin = values(securityHeaderEntries.find((entry) => entry.source === "/admin/:path*")!);
    expect(admin["X-Robots-Tag"]).toBe("noindex, nofollow");
    expect(admin["Cache-Control"]).toBe("no-store");
    expect(admin["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(admin["Content-Security-Policy"]).toContain("object-src 'none'");
  });

  it("allows only the named analytics, advertising, and image delivery origins", () => {
    for (const origin of [
      "https://www.googletagmanager.com",
      "https://www.google-analytics.com",
      "https://*.google-analytics.com",
      "https://pagead2.googlesyndication.com",
      "https://googleads.g.doubleclick.net",
      "https://tpc.googlesyndication.com",
      "https://*.public.blob.vercel-storage.com",
    ]) expect(publicContentSecurityPolicy).toContain(origin);

    expect(publicContentSecurityPolicy).toContain("object-src 'none'");
    expect(publicContentSecurityPolicy).toContain("base-uri 'self'");
    expect(publicContentSecurityPolicy).toContain("form-action 'self'");
    expect(publicContentSecurityPolicy).not.toMatch(/script-src[^;]*\s\*/);
    expect(publicContentSecurityPolicy).not.toMatch(/script-src[^;]*data:/);
    expect(adminContentSecurityPolicy).not.toContain("googlesyndication.com");
  });
});
