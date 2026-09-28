import type { Metadata } from "next";
import { AdSenseScript } from "@/components/AdSenseScript";
import { getPublicSettings } from "@/lib/content/repository";
import "@fontsource-variable/nunito-sans";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://solocalculator.com"),
  title: "SoloCalculator | Quick, accurate everyday calculators",
  description: "Free, easy-to-use calculators for everyday maths, dates, loans, conversions and more.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const settings = await getPublicSettings();
  return (
    <html lang="en">
      <body>{children}<AdSenseScript publisherId={settings?.adsensePublisherId ?? ""} enabled={settings?.adsenseEnabled ?? false} /></body>
    </html>
  );
}
