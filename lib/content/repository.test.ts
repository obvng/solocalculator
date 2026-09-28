import { describe, expect, it } from "vitest";
import { getPageSeo, mapPublishedPost } from "./repository";

describe("getPageSeo", () => {
  it("uses code defaults when the database read fails", async () => {
    const record = await getPageSeo("loan-calculator", {
      getPageSeo: async () => { throw new Error("offline"); },
    });
    expect(record.pageKey).toBe("loan-calculator");
    expect(record.title).toBe("Loan calculator | SoloCalculator");
    expect(record.pathname).toBe("/loan-calculator");
  });
});

describe("mapPublishedPost", () => {
  it("maps immutable revision columns into the public post model", () => {
    const post = mapPublishedPost({
      post_id: "post-1", revision: 4, title: "A useful guide", slug: "useful-guide",
      excerpt: "Short summary", sanitized_html: "<p>Safe article</p>",
      author_display_name: "SoloCalculator", featured_image_id: null, social_image_id: null,
      seo: { title: "Search title", openGraph: { title: "Social title" } },
      related_page_keys: ["percentage-calculator"], related_post_ids: [],
      published_at: "2026-09-28T09:00:00.000Z",
    });

    expect(post).toEqual(expect.objectContaining({
      id: "post-1", version: 4, status: "published", sanitizedHtml: "<p>Safe article</p>",
      publishedAt: "2026-09-28T09:00:00.000Z",
    }));
    expect(post.seo.openGraph.title).toBe("Social title");
    expect(post.seo.openGraph.description).toBe("");
  });
});
