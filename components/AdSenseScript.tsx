"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

export function getAdSenseScriptSrc(config: { publisherId: string; enabled: boolean }, pathname: string) {
  if (!config.enabled || !config.publisherId || pathname.startsWith("/admin")) return null;
  return `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.publisherId}`;
}

export function AdSenseScript({ publisherId, enabled }: { publisherId: string; enabled: boolean }) {
  const pathname = usePathname();
  const src = getAdSenseScriptSrc({ publisherId, enabled }, pathname);
  return src ? <Script id="google-adsense" async src={src} crossOrigin="anonymous" strategy="afterInteractive" /> : null;
}
