import type { Metadata } from "next";
import "@fontsource-variable/nunito-sans";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://solocalculator.com"),
  title: "SoloCalculator | Quick, accurate everyday calculators",
  description: "Free, easy-to-use calculators for everyday maths, dates, loans, conversions and more.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
