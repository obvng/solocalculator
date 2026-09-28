import { describe, expect, it } from "vitest";
import { getGoogleAnalyticsScriptSrc } from "./GoogleAnalytics";

describe("getGoogleAnalyticsScriptSrc", () => {
  const enabled = { measurementId: "G-97MT050QEL", enabled: true };

  it("returns the official Google tag URL on public pages", () => {
    expect(getGoogleAnalyticsScriptSrc(enabled, "/calculator")).toBe(
      "https://www.googletagmanager.com/gtag/js?id=G-97MT050QEL",
    );
  });

  it("does not load Analytics inside the admin dashboard", () => {
    expect(getGoogleAnalyticsScriptSrc(enabled, "/admin/settings")).toBeNull();
  });

  it("does not load Analytics when it is disabled", () => {
    expect(getGoogleAnalyticsScriptSrc({ ...enabled, enabled: false }, "/")).toBeNull();
  });
});
