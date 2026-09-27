import { describe, expect, it, vi } from "vitest";
import { canTransition, savePostRecord, type PostMutationDependencies } from "./mutations";
import type { PostRecord } from "./types";

const post: PostRecord = {
  id: "post-1", title: "Old title", slug: "old-slug", excerpt: "", editorDocument: { type: "doc", content: [] },
  sanitizedHtml: "<p>Published copy</p>", sourceHtml: null, status: "published", featuredImageId: null,
  socialImageId: null, authorDisplayName: "SoloCalculator", categoryIds: [], tagIds: [], relatedPageKeys: [],
  relatedPostIds: [], version: 3, scheduledAt: null, publishedAt: "2026-09-27T08:00:00.000Z",
  createdAt: "2026-09-27T07:00:00.000Z", updatedAt: "2026-09-27T08:00:00.000Z",
  seo: {
    title: "Old title", description: "Description", slug: "old-slug", canonical: "/blog/old-slug",
    targetKeyword: "", supportingKeywords: [], noIndex: false, noFollow: false, includeInSitemap: true,
    sitemapPriority: .7, changeFrequency: "monthly", openGraph: { title: "", description: "", imageId: null },
    xCard: { title: "", description: "", imageId: null }, schemaType: "Article", schemaProperties: {},
    breadcrumbLabel: "Old title", faqItems: [],
  },
};

describe("post mutations", () => {
  it.each([
    ["draft", "published", true], ["draft", "scheduled", true], ["published", "draft", true],
    ["published", "archived", true], ["archived", "published", false],
  ] as const)("allows %s to %s: %s", (from, to, allowed) => {
    expect(canTransition(from, to)).toBe(allowed);
  });

  it("creates a permanent redirect after a published slug changes", async () => {
    const dependencies: PostMutationDependencies = {
      saveDraft: vi.fn(async (next) => next),
      createRedirect: vi.fn(async () => undefined),
      savePublishedRevision: vi.fn(async () => undefined),
    };
    const result = await savePostRecord(post, { ...post, slug: "new-slug", status: "published" }, true, dependencies);
    expect(result.ok).toBe(true);
    expect(dependencies.createRedirect).toHaveBeenCalledWith({ sourcePath: "/blog/old-slug", destination: "/blog/new-slug", statusCode: 308, enabled: true });
  });

  it("stores a publication snapshot without replacing the editable draft", async () => {
    const dependencies: PostMutationDependencies = {
      saveDraft: vi.fn(async (next) => next), createRedirect: vi.fn(async () => undefined),
      savePublishedRevision: vi.fn(async () => undefined),
    };
    await savePostRecord({ ...post, status: "draft", publishedAt: null }, { ...post, status: "published" }, false, dependencies);
    expect(dependencies.saveDraft).toHaveBeenCalledOnce();
    expect(dependencies.savePublishedRevision).toHaveBeenCalledWith(expect.objectContaining({ slug: "old-slug", sanitizedHtml: "<p>Published copy</p>" }));
  });
});
