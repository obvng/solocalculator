import { describe, expect, it, vi } from "vitest";
import { ImageSecurityError, type SanitizedImage } from "../lib/media/image-security";
import { assertPublicBlobUrl, readResponseBytes, rebuildMediaRow, type RebuildDependencies } from "./rebuild-media";

const row = {
  id: "media-1",
  storagePath: "media/legacy.gif",
  publicUrl: "https://blob.example/legacy.gif",
  processingVersion: 0,
};

const image: SanitizedImage = {
  bytes: Uint8Array.from([1, 2, 3]), mimeType: "image/png", extension: "png", width: 10, height: 10,
  byteSize: 3, sha256: "a".repeat(64), processingVersion: 1,
};

function dependencies(overrides: Partial<RebuildDependencies> = {}) {
  return {
    fetchBytes: vi.fn(async () => Uint8Array.from([9, 8, 7])),
    sanitize: vi.fn(async () => image),
    put: vi.fn(async () => ({ pathname: "media/new.png", url: "https://blob.example/new.png" })),
    update: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
    ...overrides,
  } satisfies RebuildDependencies;
}

describe("rebuildMediaRow", () => {
  it("skips rows already processed by version 1", async () => {
    const deps = dependencies();
    await expect(rebuildMediaRow({ ...row, processingVersion: 1 }, deps, "apply")).resolves.toEqual({ id: row.id, status: "skipped" });
    expect(deps.fetchBytes).not.toHaveBeenCalled();
  });

  it("inspects legacy rows without mutating in dry-run mode", async () => {
    const deps = dependencies();
    await expect(rebuildMediaRow(row, deps, "dry-run")).resolves.toEqual({ id: row.id, status: "safe" });
    expect(deps.put).not.toHaveBeenCalled();
    expect(deps.update).not.toHaveBeenCalled();
    expect(deps.remove).not.toHaveBeenCalled();
  });

  it("reports rejected bytes without deleting the legacy object", async () => {
    const deps = dependencies({ sanitize: vi.fn(async () => { throw new ImageSecurityError("unsupported"); }) });
    await expect(rebuildMediaRow(row, deps, "apply")).resolves.toEqual({ id: row.id, status: "rejected", reasonCode: "unsupported" });
    expect(deps.put).not.toHaveBeenCalled();
    expect(deps.remove).not.toHaveBeenCalled();
  });

  it("reports fetch and upload failures without deleting the old object", async () => {
    const fetchDeps = dependencies({ fetchBytes: vi.fn(async () => { throw new Error("token URL"); }) });
    await expect(rebuildMediaRow(row, fetchDeps, "apply")).resolves.toEqual({ id: row.id, status: "failed", reasonCode: "fetch_failed" });
    expect(fetchDeps.remove).not.toHaveBeenCalled();

    const putDeps = dependencies({ put: vi.fn(async () => { throw new Error("Blob token"); }) });
    await expect(rebuildMediaRow(row, putDeps, "apply")).resolves.toEqual({ id: row.id, status: "failed", reasonCode: "storage_failed" });
    expect(putDeps.remove).not.toHaveBeenCalled();
  });

  it("cleans only the new Blob when the database update fails", async () => {
    const deps = dependencies({ update: vi.fn(async () => { throw new Error("database URL"); }) });
    await expect(rebuildMediaRow(row, deps, "apply")).resolves.toEqual({ id: row.id, status: "failed", reasonCode: "database_failed" });
    expect(deps.remove).toHaveBeenCalledTimes(1);
    expect(deps.remove).toHaveBeenCalledWith("media/new.png");
    expect(deps.remove).not.toHaveBeenCalledWith("media/legacy.gif");
  });

  it("retains the old Blob because published article HTML may contain its literal URL", async () => {
    const deps = dependencies();
    await expect(rebuildMediaRow(row, deps, "apply")).resolves.toEqual({ id: row.id, status: "replaced" });
    expect(deps.update).toHaveBeenCalledTimes(1);
    expect(deps.remove).not.toHaveBeenCalledWith(row.storagePath);
  });
});

describe("readResponseBytes", () => {
  it("refuses non-Vercel and deceptive Blob hosts", () => {
    expect(() => assertPublicBlobUrl("https://store.public.blob.vercel-storage.com/media/image.png")).not.toThrow();
    expect(() => assertPublicBlobUrl("https://127.0.0.1/admin")).toThrow("untrusted_blob_url");
    expect(() => assertPublicBlobUrl("https://store.public.blob.vercel-storage.com.evil.example/image.png")).toThrow("untrusted_blob_url");
  });

  it("stops a streamed response above 10 MiB", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(6 * 1024 * 1024));
        controller.enqueue(new Uint8Array(5 * 1024 * 1024));
        controller.close();
      },
    });
    await expect(readResponseBytes(new Response(stream))).rejects.toThrow("too_large");
  });
});
