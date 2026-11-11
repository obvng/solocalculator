import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({ insert: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ getDb: () => database }));

import { buildRevisionSnapshot, saveAdminPost, updatePageSeo } from "./repository";
import { posts, postRevisions } from "@/lib/db/schema";

describe("withdrawing an article", () => {
  it("changes the draft status and retires public revisions in one transaction", async () => {
    const saved = { id: "source", status: "draft" };
    const setPost = vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn(async () => [saved]) })) }));
    const setRevisions = vi.fn(() => ({ where: vi.fn(async () => undefined) }));
    const update = vi.fn((table) => ({ set: table === posts ? setPost : setRevisions }));
    database.transaction.mockImplementation(async (work) => work({ update }));
    await expect(saveAdminPost("source", { status: "draft" })).resolves.toEqual(saved);
    expect(database.transaction).toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(postRevisions);
    expect(setRevisions).toHaveBeenCalledWith({ isCurrent: false });
  });
  it("does not touch public revisions if the article does not exist", async () => {
    const update = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn(async () => []) })) })) }));
    database.transaction.mockImplementation(async (work) => work({ update }));
    await expect(saveAdminPost("missing", { status: "draft" })).resolves.toBeNull();
    expect(update).toHaveBeenCalledTimes(1);
  });
});

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

describe("updatePageSeo", () => {
  beforeEach(() => vi.clearAllMocks());

  it("upserts by page key and returns the stored row", async () => {
    const stored = { id: "page-1", pageKey: "tip-calculator", pathname: "/tip-calculator" };
    const returning = vi.fn().mockResolvedValue([stored]);
    const onConflictDoUpdate = vi.fn().mockReturnValue({ returning });
    const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
    database.insert.mockReturnValue({ values });

    await expect(updatePageSeo("tip-calculator", {
      pageKey: "tip-calculator",
      pathname: "/tip-calculator",
      browserTitle: "Saved title",
    })).resolves.toEqual(stored);

    expect(values).toHaveBeenCalledWith(expect.objectContaining({
      pageKey: "tip-calculator",
      pathname: "/tip-calculator",
      browserTitle: "Saved title",
    }));
    expect(onConflictDoUpdate).toHaveBeenCalledOnce();
  });

  it("does not report success when the database returns no row", async () => {
    const returning = vi.fn().mockResolvedValue([]);
    database.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({ onConflictDoUpdate: vi.fn().mockReturnValue({ returning }) }),
    });

    await expect(updatePageSeo("tip-calculator", {
      pageKey: "tip-calculator",
      pathname: "/tip-calculator",
    })).rejects.toThrow("Page SEO was not saved");
  });

  it("surfaces a pathname conflict", async () => {
    const conflict = new Error("duplicate key value violates unique constraint page_seo_pathname_unique");
    const returning = vi.fn().mockRejectedValue(conflict);
    database.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({ onConflictDoUpdate: vi.fn().mockReturnValue({ returning }) }),
    });

    await expect(updatePageSeo("tip-calculator", {
      pageKey: "tip-calculator",
      pathname: "/other-page",
    })).rejects.toBe(conflict);
  });
});
