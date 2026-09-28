import type { Metadata } from "next";
import { AdSenseScript } from "@/components/AdSenseScript";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { getPublicSettings } from "@/lib/content/repository";
import { toVerificationMetadata } from "@/lib/seo/metadata";
import "@fontsource-variable/nunito-sans";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings();
  return {
    metadataBase: new URL("https://www.solocalculator.com"),
    title: "SoloCalculator | Quick, accurate everyday calculators",
    description: "Free, easy-to-use calculators for everyday maths, dates, loans, conversions and more.",
    verification: toVerificationMetadata(settings?.verificationTokens ?? {}),
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const settings = await getPublicSettings();
  return (
    <html lang="en">
      <body>{children}<GoogleAnalytics measurementId={settings?.googleAnalyticsMeasurementId ?? ""} enabled={settings?.googleAnalyticsEnabled ?? false} /><AdSenseScript publisherId={settings?.adsensePublisherId ?? ""} enabled={settings?.adsenseEnabled ?? false} /></body>
    </html>
  );
}
