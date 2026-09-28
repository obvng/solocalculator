import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { SiteSettingsForm } from "./SiteSettingsForm";

vi.mock("@/app/admin/(dashboard)/actions", () => ({ saveSiteSettings: vi.fn() }));

it("shows Analytics and AdSense controls", () => {
  render(<SiteSettingsForm settings={{ siteName: "SoloCalculator", titleTemplate: "%s | SoloCalculator", defaultDescription: "", defaultSocialImageId: null, organization: {}, socialProfiles: [], verificationTokens: {}, robotsRules: {}, googleAnalyticsMeasurementId: "", googleAnalyticsEnabled: false, adsensePublisherId: "", adsenseCode: "", adsenseEnabled: false, updatedAt: "" }} />);
  expect(screen.getByLabelText("Google Analytics Measurement ID")).toBeInTheDocument();
  expect(screen.getByLabelText("Enable Google Analytics on public pages")).toBeInTheDocument();
  expect(screen.getByLabelText("AdSense publisher ID")).toBeInTheDocument();
  expect(screen.getByLabelText("AdSense code")).toBeInTheDocument();
  expect(screen.getByLabelText("Enable AdSense on public pages")).toBeInTheDocument();
});
