import { describe, expect, it, vi } from "vitest";
import { deleteMedia, validateUpload, type MediaDependencies, type MediaReference } from "./media";

describe("media management", () => {
  it("accepts web images and rejects unsafe or oversized files", () => {
    expect(validateUpload({ name: "photo.webp", type: "image/webp", size: 2000 })).toEqual({ ok: true });
    expect(validateUpload({ name: "graphic.svg", type: "image/svg+xml", size: 2000 })).toEqual(expect.objectContaining({ ok: false }));
    expect(validateUpload({ name: "large.jpg", type: "image/jpeg", size: 10 * 1024 * 1024 + 1 })).toEqual(expect.objectContaining({ ok: false }));
  });

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
