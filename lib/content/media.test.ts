import { describe, expect, it, vi } from "vitest";
import { deleteMedia, type MediaDependencies, type MediaReference } from "./media";

describe("media management", () => {
  it("blocks deletion while an image is referenced", async () => {
    const references: MediaReference[] = [{ type: "post", id: "post-1", label: "Percentage guide" }];
    const dependencies: MediaDependencies = { findReferences: vi.fn(async () => references), deleteRecord: vi.fn(), deleteObject: vi.fn() };
    expect(await deleteMedia("media-1", "posts/image.webp", dependencies)).toEqual({ ok: false, references });
    expect(dependencies.deleteRecord).not.toHaveBeenCalled();
    expect(dependencies.deleteObject).not.toHaveBeenCalled();
  });

  it("removes the storage object only after deleting an unreferenced record", async () => {
    const order: string[] = [];
    const dependencies: MediaDependencies = {
      findReferences: vi.fn(async () => []), deleteRecord: vi.fn(async () => { order.push("record"); }),
      deleteObject: vi.fn(async () => { order.push("object"); }),
    };
    expect(await deleteMedia("media-1", "posts/image.webp", dependencies)).toEqual({ ok: true });
    expect(order).toEqual(["record", "object"]);
  });
});
