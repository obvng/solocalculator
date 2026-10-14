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
    ]);

    await expect(sitemap()).resolves.toContainEqual(expect.objectContaining({
      url: "https://www.solocalculator.com/discount-calculator",
      lastModified: "2026-10-14T08:30:00.000Z",
    }));
  });
});
