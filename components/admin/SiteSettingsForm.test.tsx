import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { SiteSettingsForm } from "./SiteSettingsForm";

vi.mock("@/app/admin/(dashboard)/actions", () => ({ saveSiteSettings: vi.fn() }));

it("shows AdSense code and enable controls", () => {
  render(<SiteSettingsForm settings={{ siteName: "SoloCalculator", titleTemplate: "%s | SoloCalculator", defaultDescription: "", defaultSocialImageId: null, organization: {}, socialProfiles: [], verificationTokens: {}, robotsRules: {}, adsensePublisherId: "", adsenseCode: "", adsenseEnabled: false, updatedAt: "" }} />);
  expect(screen.getByLabelText("AdSense publisher ID")).toBeInTheDocument();
  expect(screen.getByLabelText("AdSense code")).toBeInTheDocument();
  expect(screen.getByLabelText("Enable AdSense on public pages")).toBeInTheDocument();
});
