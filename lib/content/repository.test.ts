import { describe, expect, it } from "vitest";
import { getPageSeo, listPublishedPosts, mapPublishedPost } from "./repository";

describe("getPageSeo", () => {
  it("does not silently substitute defaults in the admin on a failed read", async () => {
    await expect(getPageSeo("home", { getPageSeo: async () => { throw new Error("offline"); } }, { strict: true })).rejects.toThrow("offline");
  });
  it("preserves stranded directory SEO and normalizes the retired path", async () => {
    const calls: string[] = [];
    const record = await getPageSeo("calculators", { getPageSeo: async (key) => {
      calls.push(key);
      return key === "calculator" ? { pageKey: key, pathname: "/calculator", canonical: "https://www.solocalculator.com/calculator", title: "All Calculators: Age, Percentage, Loan, Date and More", description: "Saved directory description" } : null;
    } });
    expect(calls).toEqual(["calculators", "calculator"]);
    expect(record).toEqual(expect.objectContaining({ pageKey: "calculators", pathname: "/calculators", canonical: "https://www.solocalculator.com/calculators", title: "All Calculators: Age, Percentage, Loan, Date and More", description: "Saved directory description" }));
  });
  it("prefers the canonical directory record once it has been saved", async () => {
    const record = await getPageSeo("calculator", { getPageSeo: async (key) => ({ title: key === "calculators" ? "Updated directory title" : "Old title" }) });
    expect(record.title).toBe("Updated directory title");
    expect(record.pageKey).toBe("calculators");
  });
  it("uses code defaults when the database read fails", async () => {
    const record = await getPageSeo("loan-calculator", {
      getPageSeo: async () => { throw new Error("offline"); },
    });
    expect(record.pageKey).toBe("loan-calculator");
    expect(record.title).toBe("Loan calculator");
    expect(record.pathname).toBe("/loan-calculator");
  });

  it("keeps calculator metadata defaults when stored SEO fields are blank", async () => {
    const record = await getPageSeo("age-calculator", {
      getPageSeo: async () => ({
        title: "",
        description: "   ",
        canonical: "",
        breadcrumbLabel: "",
      }),
    });

    expect(record.title).toBe("Age calculator");
    expect(record.description).toBe("Calculate your exact age in years, months and days.");
    expect(record.canonical).toBe("https://www.solocalculator.com/age-calculator");
    expect(record.breadcrumbLabel).toBe("Age");
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

describe("listPublishedPosts", () => {
  it("returns only current revisions whose publication time has passed", async () => {
    const rows = [
      { post_id: "old", title: "Old", slug: "old", sanitized_html: "<p>Old</p>", is_current: false, published_at: "2026-09-27T10:00:00.000Z" },
      { post_id: "future", title: "Future", slug: "future", sanitized_html: "<p>Future</p>", is_current: true, published_at: "2026-10-01T10:00:00.000Z" },
      { post_id: "current", title: "Current", slug: "current", sanitized_html: "<p>Current</p>", is_current: true, published_at: "2026-09-28T10:00:00.000Z" },
    ];
    const posts = await listPublishedPosts({ listPublishedPostRows: async () => rows }, new Date("2026-09-28T12:00:00.000Z"));

    expect(posts.map((post) => post.title)).toEqual(["Current"]);
  });
});
