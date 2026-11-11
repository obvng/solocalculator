import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ owner: vi.fn(), get: vi.fn(), save: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/auth/owner", () => ({ requireOwner: mocks.owner }));
vi.mock("@/lib/admin/repository", () => ({ getAdminPost: mocks.get, saveAdminPost: mocks.save }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
import { trashDraftPost } from "./actions";

describe("trashDraftPost", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.owner.mockResolvedValue({ id: "owner" }); });
  it("archives only the requested draft while retaining its content", async () => {
    mocks.get.mockResolvedValue({ id: "flagged", status: "draft", version: 2, sourceHtml: "original" });
    mocks.save.mockResolvedValue({ id: "flagged", status: "archived" });
    await expect(trashDraftPost("flagged")).rejects.toThrow("redirect:/admin/posts?trashed=1");
    expect(mocks.save).toHaveBeenCalledWith("flagged", { status: "archived", version: 3 });
  });
  it("refuses to trash a published article", async () => {
    mocks.get.mockResolvedValue({ id: "published", status: "published", version: 2 });
    await expect(trashDraftPost("published")).rejects.toThrow("error=not-draft");
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("requires owner authentication before accessing the draft", async () => {
    mocks.owner.mockRejectedValue(new Error("unauthorized"));
    await expect(trashDraftPost("flagged")).rejects.toThrow("unauthorized");
    expect(mocks.get).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
