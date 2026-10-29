import { describe, expect, it } from "vitest";
import { toNextMetadata, toVerificationMetadata } from "./metadata";
import { emptySeo } from "./defaults";

describe("toNextMetadata", () => {
  it("uses website sharing metadata and a branded fallback image on tools", () => {
    const metadata = toNextMetadata({ ...emptySeo, title: "Age calculator" }, { siteName: "SoloCalculator", titleTemplate: "%s", defaultDescription: "Calculate age", defaultImageUrl: null }, "/age-calculator");
    expect(metadata.openGraph).toEqual(expect.objectContaining({ type: "website", images: [{ url: "https://www.solocalculator.com/social-image" }] }));
    expect(metadata.twitter).toEqual(expect.objectContaining({ card: "summary_large_image" }));
  });
  it("forces canonical URLs onto the production host", () => {
    const metadata = toNextMetadata({ ...emptySeo, title: "Test article", canonical: "/blog/test" }, { siteName: "SoloCalculator", titleTemplate: "%s | SoloCalculator", defaultDescription: "Default description", defaultImageUrl: null }, "/blog/test");
    expect(metadata.alternates?.canonical).toBe("https://www.solocalculator.com/blog/test");
    expect(metadata.title).toBe("Test article");
  });

  it("maps robots and social fallbacks", () => {
    const metadata = toNextMetadata({ ...emptySeo, title: "Guide", description: "Guide description", noIndex: true, noFollow: true }, { siteName: "SoloCalculator", titleTemplate: "%s | SoloCalculator", defaultDescription: "Default", defaultImageUrl: null }, "/blog/guide");
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.openGraph).toEqual(expect.objectContaining({ title: "Guide", description: "Guide description", url: "https://www.solocalculator.com/blog/guide" }));
  });

  it("uses the saved SEO title exactly as written", () => {
    const metadata = toNextMetadata({ ...emptySeo, title: "SoloCalculator | Quick calculators" }, { siteName: "SoloCalculator", titleTemplate: "%s | SoloCalculator", defaultDescription: "Default", defaultImageUrl: null }, "/");
    expect(metadata.title).toBe("SoloCalculator | Quick calculators");
  });

  it("does not append the site name to a long saved title", () => {
    const metadata = toNextMetadata({ ...emptySeo, title: "Age Calculator: Exact Age in Years, Months and Days" }, { siteName: "SoloCalculator", titleTemplate: "%s | SoloCalculator", defaultDescription: "Default", defaultImageUrl: null }, "/age-calculator");
    expect(metadata.title).toBe("Age Calculator: Exact Age in Years, Months and Days");
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
