interface HeaderValue { key: string; value: string }
interface HeaderEntry { source: string; headers: HeaderValue[] }

function policy(directives: string[]) {
  return directives.join("; ");
}

const blobImages = "https://*.public.blob.vercel-storage.com";

export const publicContentSecurityPolicy = policy([
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://pagead2.googlesyndication.com",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: ${blobImages} https://www.google-analytics.com https://*.google-analytics.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net`,
  "font-src 'self' data:",
  "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net",
  "frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
]);

export const adminContentSecurityPolicy = policy([
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: ${blobImages}`,
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
]);

const commonHeaders: HeaderValue[] = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const adminHeaders: HeaderValue[] = [
  { key: "Content-Security-Policy", value: adminContentSecurityPolicy },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "Cache-Control", value: "no-store" },
];

export const securityHeaderEntries: HeaderEntry[] = [
  { source: "/:path*", headers: commonHeaders },
  { source: "/admin/:path*", headers: adminHeaders },
  { source: "/api/admin/:path*", headers: adminHeaders },
  {
    source: "/:path((?!admin(?:/|$)|api/admin(?:/|$)).*)",
    headers: [{ key: "Content-Security-Policy", value: publicContentSecurityPolicy }],
  },
];
