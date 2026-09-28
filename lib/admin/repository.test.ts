import { describe, expect, it } from "vitest";
import { buildRevisionSnapshot } from "./repository";

describe("buildRevisionSnapshot", () => {
  it("copies publishable fields into the next immutable revision", () => {
    const snapshot = buildRevisionSnapshot({
      id: "post-1", title: "Guide", slug: "guide", excerpt: "Summary",
      sanitizedHtml: "<p>Safe</p>", authorDisplayName: "SoloCalculator",
      featuredImageId: null, socialImageId: null, seo: { title: "Search" },
      relatedPageKeys: ["calculator"], relatedPostIds: [], publishedAt: null,
    }, 3, new Date("2026-09-28T12:00:00.000Z"));

    expect(snapshot).toEqual(expect.objectContaining({
      postId: "post-1", revision: 3, title: "Guide", slug: "guide",
      sanitizedHtml: "<p>Safe</p>", isCurrent: true,
      publishedAt: new Date("2026-09-28T12:00:00.000Z"),
    }));
  });
});
