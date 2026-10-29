import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultPageSeo } from "@/lib/seo/defaults";

const content = vi.hoisted(() => ({
  listPublicPageSeo: vi.fn(),
  listPublishedPosts: vi.fn(),
}));

vi.mock("@/lib/content/repository", () => content);

import sitemap from "./sitemap";

describe("sitemap", () => {
  beforeEach(() => {
    content.listPublishedPosts.mockResolvedValue([]);
  });

  it("uses the stored page update time as lastmod", async () => {
    content.listPublicPageSeo.mockResolvedValue([
      { ...getDefaultPageSeo("discount-calculator"), updatedAt: "2026-10-14T08:30:00.000Z" },
      { ...getDefaultPageSeo("calculator"), pathname: "/calculator", updatedAt: "2026-10-14T08:30:00.000Z" },
      ...["blog", "percentage-of-calculator", "percentage-increase-calculator"].map((slug) => getDefaultPageSeo(slug)),
    ]);

    const entries = await sitemap();
    expect(entries).toContainEqual(expect.objectContaining({
      url: "https://www.solocalculator.com/discount-calculator",
      lastModified: "2026-10-14T08:30:00.000Z",
    }));
    expect(entries).toContainEqual(expect.objectContaining({
      url: "https://www.solocalculator.com/calculators",
    }));
    expect(entries).not.toContainEqual(expect.objectContaining({
      url: "https://www.solocalculator.com/calculator",
    }));
    expect(entries.filter((entry) => entry.url.endsWith("/blog"))).toHaveLength(1);
    expect(entries.some((entry) => /percentage-(of|increase)-calculator$/.test(entry.url))).toBe(false);
  });
  it("includes the blog once a published post exists", async () => {
    content.listPublicPageSeo.mockResolvedValue([]);
    content.listPublishedPosts.mockResolvedValue([{ slug: "guide", seo: { includeInSitemap: true, noIndex: false } }]);
    expect(await sitemap()).toContainEqual(expect.objectContaining({ url: "https://www.solocalculator.com/blog" }));
  });
});
