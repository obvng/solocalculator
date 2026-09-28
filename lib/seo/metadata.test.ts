import { describe, expect, it } from "vitest";
import { toNextMetadata } from "./metadata";
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
});
