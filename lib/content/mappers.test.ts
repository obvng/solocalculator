import { describe, expect, it } from "vitest";
import { mapPageSeo, mapSiteSettings } from "./mappers";

describe("mapPageSeo", () => {
  it("fills required social fields when Neon stores empty JSON objects", () => {
    const seo = mapPageSeo({
      pageKey: "calculator",
      pathname: "/calculator",
      openGraph: {},
      xCard: {},
    });

    expect(seo.openGraph).toEqual({ title: "", description: "", imageId: null });
    expect(seo.xCard).toEqual({ title: "", description: "", imageId: null });
  });
});

describe("mapSiteSettings", () => {
  it("maps AdSense settings from the database row", () => {
    const settings = mapSiteSettings({
      siteName: "SoloCalculator",
      titleTemplate: "%s | SoloCalculator",
      defaultDescription: "Calculators",
      defaultSocialImageId: null,
      organization: {},
      socialProfiles: [],
      verificationTokens: {},
      robotsRules: {},
      googleAnalyticsMeasurementId: "G-97MT050QEL",
      googleAnalyticsEnabled: true,
      adsensePublisherId: "ca-pub-1234567890",
      adsenseCode: "official-code",
      adsenseEnabled: true,
      updatedAt: new Date("2026-09-28T12:00:00.000Z"),
      id: true,
    });

    expect(settings.googleAnalyticsMeasurementId).toBe("G-97MT050QEL");
    expect(settings.googleAnalyticsEnabled).toBe(true);
    expect(settings.adsensePublisherId).toBe("ca-pub-1234567890");
    expect(settings.adsenseEnabled).toBe(true);
    expect(settings.updatedAt).toBe("2026-09-28T12:00:00.000Z");
  });
});
