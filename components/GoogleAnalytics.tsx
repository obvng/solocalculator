"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

interface GoogleAnalyticsConfig {
  measurementId: string;
  enabled: boolean;
}

export function getGoogleAnalyticsScriptSrc(config: GoogleAnalyticsConfig, pathname: string) {
  const measurementId = config.measurementId.trim().toUpperCase();
  if (!config.enabled || pathname.startsWith("/admin") || !/^G-[A-Z0-9]+$/.test(measurementId)) return null;
  return `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
}

export function GoogleAnalytics({ measurementId, enabled }: GoogleAnalyticsConfig) {
  const pathname = usePathname();
  const src = getGoogleAnalyticsScriptSrc({ measurementId, enabled }, pathname);
  const id = measurementId.trim().toUpperCase();
  if (!src) return null;

  return <>
    <Script id="google-analytics-loader" async src={src} strategy="afterInteractive" />
    <Script id="google-analytics-config" strategy="afterInteractive">{`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}');`}</Script>
  </>;
}
