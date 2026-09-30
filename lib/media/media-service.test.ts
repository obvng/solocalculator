import { describe, expect, it, vi } from "vitest";
import { ImageSecurityError, type SanitizedImage } from "./image-security";
import {
  createSanitizedMedia,
  MediaServiceError,
  replaceSanitizedMedia,
  type MediaServiceDependencies,
} from "./media-service";

const sanitized: SanitizedImage = {
  bytes: Uint8Array.from([1, 2, 3]),
  mimeType: "image/png",
  extension: "png",
  width: 20,
  height: 10,
  byteSize: 3,
  sha256: "a".repeat(64),
  processingVersion: 1,
};

function dependencies(overrides: Partial<MediaServiceDependencies> = {}) {
  return {
    sanitize: vi.fn(async () => sanitized),
    put: vi.fn(async () => ({ pathname: "media/new.png", url: "https://blob.example/new.png" })),
    remove: vi.fn(async () => undefined),
    insert: vi.fn(async (values) => ({ id: "media-1", ...values })),
    update: vi.fn(async (id, values) => ({ id, ...values })),
    find: vi.fn(async () => ({ storagePath: "media/old.jpg" })),
    audit: vi.fn(async () => undefined),
    ...overrides,
  } satisfies MediaServiceDependencies;
}

const input = {
  bytes: Uint8Array.from([9, 8, 7]),
  originalFilename: "../../photo.jpg.php\u0000",
  altText: "a".repeat(550),
  caption: "c".repeat(1_100),
};

describe("createSanitizedMedia", () => {
  it("sanitizes, uploads, and inserts authoritative values in order", async () => {
    const order: string[] = [];
    const deps = dependencies({
      sanitize: vi.fn(async () => { order.push("sanitize"); return sanitized; }),
      put: vi.fn(async () => { order.push("put"); return { pathname: "media/new.png", url: "https://blob.example/new.png" }; }),
      insert: vi.fn(async (values) => { order.push("insert"); return values; }),
    });

    const result = await createSanitizedMedia(input, deps);

    expect(order).toEqual(["sanitize", "put", "insert"]);
    expect(deps.insert).toHaveBeenCalledWith(expect.objectContaining({
      storagePath: "media/new.png",
      publicUrl: "https://blob.example/new.png",
      originalFilename: "photo.jpg.php",
      mimeType: "image/png",
      width: 20,
      height: 10,
      byteSize: 3,
      sha256: "a".repeat(64),
      processingVersion: 1,
      altText: "a".repeat(500),
      caption: "c".repeat(1_000),
    }));
    expect(result).toEqual(expect.objectContaining({ processingVersion: 1 }));
  });

  it("removes a new Blob when the database insert fails", async () => {
    const deps = dependencies({ insert: vi.fn(async () => { throw new Error("db secret"); }) });
    await expect(createSanitizedMedia(input, deps)).rejects.toMatchObject({ code: "database_failed" });
    expect(deps.remove).toHaveBeenCalledWith("media/new.png");
  });

  it("does not write a record when Blob storage fails", async () => {
    const deps = dependencies({ put: vi.fn(async () => { throw new Error("blob token"); }) });
    await expect(createSanitizedMedia(input, deps)).rejects.toMatchObject({ code: "storage_failed" });
    expect(deps.insert).not.toHaveBeenCalled();
  });

  it("maps image rejection codes to generic public errors", async () => {
    const deps = dependencies({ sanitize: vi.fn(async () => { throw new ImageSecurityError("unsupported"); }) });
    await expect(createSanitizedMedia(input, deps)).rejects.toEqual(expect.objectContaining({
      code: "unsupported",
      publicMessage: "Upload a JPEG, PNG or WebP image.",
      status: 400,
    }));
  });

  it("never writes to Blob when rebuilt output exceeds the byte limit", async () => {
    const deps = dependencies({ sanitize: vi.fn(async () => { throw new ImageSecurityError("too_large"); }) });
    await expect(createSanitizedMedia(input, deps)).rejects.toMatchObject({ code: "too_large", status: 413 });
    expect(deps.put).not.toHaveBeenCalled();
    expect(deps.insert).not.toHaveBeenCalled();
  });
});

describe("replaceSanitizedMedia", () => {
  it("commits the new record before deleting the old Blob", async () => {
    const order: string[] = [];
    const deps = dependencies({
      find: vi.fn(async () => { order.push("find"); return { storagePath: "media/old.jpg" }; }),
      sanitize: vi.fn(async () => { order.push("sanitize"); return sanitized; }),
      put: vi.fn(async () => { order.push("put"); return { pathname: "media/new.png", url: "https://blob.example/new.png" }; }),
      update: vi.fn(async (_id, values) => { order.push("update"); return values; }),
      remove: vi.fn(async (path) => { order.push(`remove:${path}`); }),
    });

    await replaceSanitizedMedia("media-1", input, deps);

    expect(order).toEqual(["find", "sanitize", "put", "update", "remove:media/old.jpg"]);
  });

  it("keeps the old record and Blob when the database update fails", async () => {
    const deps = dependencies({ update: vi.fn(async () => { throw new Error("database failure"); }) });
    await expect(replaceSanitizedMedia("media-1", input, deps)).rejects.toMatchObject({ code: "database_failed" });
    expect(deps.remove).toHaveBeenCalledWith("media/new.png");
    expect(deps.remove).not.toHaveBeenCalledWith("media/old.jpg");
  });

  it("does not touch the old Blob when sanitization fails", async () => {
    const deps = dependencies({ sanitize: vi.fn(async () => { throw new ImageSecurityError("corrupt"); }) });
    await expect(replaceSanitizedMedia("media-1", input, deps)).rejects.toBeInstanceOf(MediaServiceError);
    expect(deps.put).not.toHaveBeenCalled();
    expect(deps.remove).not.toHaveBeenCalled();
    expect(deps.update).not.toHaveBeenCalled();
  });

  it("returns success and audits when old Blob cleanup fails", async () => {
    const deps = dependencies({
      remove: vi.fn(async (path) => { if (path === "media/old.jpg") throw new Error("delete failed"); }),
    });
    await expect(replaceSanitizedMedia("media-1", input, deps)).resolves.toBeDefined();
    expect(deps.audit).toHaveBeenCalledWith("orphan_cleanup_failed");
  });
});
