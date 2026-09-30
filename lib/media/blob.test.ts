import { beforeEach, describe, expect, it, vi } from "vitest";

const { putMock } = vi.hoisted(() => ({
  putMock: vi.fn(),
}));

vi.mock("@vercel/blob", () => ({
  put: putMock,
  del: vi.fn(),
}));

import { makeBlobPath, putMediaBlob } from "./blob";
import type { SanitizedImage } from "./image-security";

describe("verified media blob storage", () => {
  beforeEach(() => {
    putMock.mockReset();
  });

  it("creates a UUID path from the verified output extension", () => {
    expect(makeBlobPath("png", "fixed-id", new Date("2026-09-30T12:00:00.000Z"))).toBe(
      "media/2026-09-30/fixed-id.png",
    );
    expect(() => makeBlobPath("php" as never)).toThrow("Unsupported sanitized extension");
  });

  it("uploads only sanitized bytes with their authoritative MIME type", async () => {
    const image: SanitizedImage = {
      bytes: Uint8Array.from([137, 80, 78, 71]),
      mimeType: "image/png",
      extension: "png",
      width: 1,
      height: 1,
      byteSize: 4,
      sha256: "a".repeat(64),
      processingVersion: 1,
    };
    putMock.mockResolvedValue({ pathname: "media/safe.png", url: "https://blob.example/safe.png" });

    await expect(putMediaBlob(image)).resolves.toEqual({
      pathname: "media/safe.png",
      url: "https://blob.example/safe.png",
    });
    expect(putMock).toHaveBeenCalledWith(
      expect.stringMatching(/^media\/\d{4}-\d{2}-\d{2}\/[0-9a-f-]+\.png$/),
      image.bytes,
      { access: "public", addRandomSuffix: false, contentType: "image/png" },
    );
  });
});
