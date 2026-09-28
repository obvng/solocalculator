import { describe, expect, it } from "vitest";
import { toNextMetadata, toVerificationMetadata } from "./metadata";
import { emptySeo } from "./defaults";

describe("toNextMetadata", () => {
  it("forces canonical URLs onto the production host", () => {
    const metadata = toNextMetadata({ ...emptySeo, title: "Test article", canonical: "/blog/test" }, { siteName: "SoloCalculator", titleTemplate: "%s | SoloCalculator", defaultDescription: "Default description", defaultImageUrl: null }, "/blog/test");
    expect(metadata.alternates?.canonical).toBe("https://www.solocalculator.com/blog/test");
    expect(metadata.title).toBe("Test article | SoloCalculator");
  });

  it("maps robots and social fallbacks", () => {
    const metadata = toNextMetadata({ ...emptySeo, title: "Guide", description: "Guide description", noIndex: true, noFollow: true }, { siteName: "SoloCalculator", titleTemplate: "%s | SoloCalculator", defaultDescription: "Default", defaultImageUrl: null }, "/blog/guide");
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.openGraph).toEqual(expect.objectContaining({ title: "Guide", description: "Guide description", url: "https://www.solocalculator.com/blog/guide" }));
  });

  it("does not append the site name twice", () => {
    const metadata = toNextMetadata({ ...emptySeo, title: "SoloCalculator | Quick calculators" }, { siteName: "SoloCalculator", titleTemplate: "%s | SoloCalculator", defaultDescription: "Default", defaultImageUrl: null }, "/");
    expect(metadata.title).toBe("SoloCalculator | Quick calculators");
  });
});

describe("toVerificationMetadata", () => {
  it("maps the saved Google Search Console token to Next metadata", () => {
    expect(toVerificationMetadata({ google: "Jge5MGXCQcyf6KKNcBARp0GN14NVh5-seOEWCK8btrA" })).toEqual({
      google: "Jge5MGXCQcyf6KKNcBARp0GN14NVh5-seOEWCK8btrA",
    });
  });

  it("ignores empty verification tokens", () => {
    expect(toVerificationMetadata({ google: "  " })).toBeUndefined();
  });
});
