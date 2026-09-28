import { describe, expect, it } from "vitest";
import { mapSiteSettings } from "./mappers";

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
      adsensePublisherId: "ca-pub-1234567890",
      adsenseCode: "official-code",
      adsenseEnabled: true,
      updatedAt: new Date("2026-09-28T12:00:00.000Z"),
      id: true,
    });

    expect(settings.adsensePublisherId).toBe("ca-pub-1234567890");
    expect(settings.adsenseEnabled).toBe(true);
    expect(settings.updatedAt).toBe("2026-09-28T12:00:00.000Z");
  });
});
