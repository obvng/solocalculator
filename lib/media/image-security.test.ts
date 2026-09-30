import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { MEDIA_MAX_BYTES, sanitizeImage } from "./image-security";

describe("sanitizeImage", () => {
  it("detects and rebuilds JPEG bytes without filename or browser MIME data", async () => {
    const input = await sharp({
      create: { width: 4, height: 3, channels: 3, background: "#2468ff" },
    }).jpeg().toBuffer();

    const result = await sanitizeImage(input);

    expect(result).toMatchObject({
      mimeType: "image/jpeg",
      extension: "jpg",
      width: 4,
      height: 3,
      processingVersion: 1,
    });
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.byteSize).toBe(result.bytes.byteLength);
  });

  it("keeps transparent PNG pixels in a PNG container", async () => {
    const input = await sharp({
      create: { width: 3, height: 2, channels: 4, background: { r: 24, g: 70, b: 180, alpha: 0.5 } },
    }).png().toBuffer();

    const result = await sanitizeImage(input);

    expect(result).toMatchObject({ mimeType: "image/png", extension: "png", width: 3, height: 2 });
    expect(result.byteSize).toBe(result.bytes.byteLength);
  });

  it("detects and rebuilds a single-frame WebP", async () => {
    const input = await sharp({
      create: { width: 5, height: 4, channels: 3, background: "#ff6d55" },
    }).webp().toBuffer();

    const result = await sanitizeImage(input);

    expect(result).toMatchObject({ mimeType: "image/webp", extension: "webp", width: 5, height: 4 });
    expect(result.byteSize).toBe(result.bytes.byteLength);
  });

  it.each([
    ["PHP", Buffer.from("<?php system($_GET.x); ?>")],
    ["HTML", Buffer.from("<html><script>alert(1)</script></html>")],
    ["JavaScript", Buffer.from("alert(document.cookie)")],
    ["SVG", Buffer.from("<svg onload='alert(1)'></svg>")],
    ["ZIP", Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0])],
    ["ELF", Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0, 0, 0, 0])],
  ])("rejects %s bytes regardless of a claimed image name or MIME", async (_label, input) => {
    await expect(sanitizeImage(input)).rejects.toMatchObject({ code: "unsupported" });
  });

  it("rejects empty and oversized input before decoding", async () => {
    await expect(sanitizeImage(new Uint8Array())).rejects.toMatchObject({ code: "empty" });
    await expect(sanitizeImage(new Uint8Array(MEDIA_MAX_BYTES + 1))).rejects.toMatchObject({ code: "too_large" });
  });

  it("rejects rebuilt output above the byte limit", async () => {
    const width = 2_400;
    const height = 2_400;
    const pixels = Buffer.alloc(width * height * 4);
    let state = 0x12345678;
    for (let offset = 0; offset < pixels.length; offset += 4) {
      state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
      pixels[offset] = state;
      pixels[offset + 1] = state >>> 8;
      pixels[offset + 2] = state >>> 16;
      pixels[offset + 3] = 128;
    }
    const input = await sharp(pixels, { raw: { width, height, channels: 4 } }).webp().toBuffer();

    await expect(sanitizeImage(input)).rejects.toMatchObject({ code: "too_large" });
  }, 15_000);

  it("rejects truncated image data", async () => {
    const jpeg = await sharp({
      create: { width: 4, height: 3, channels: 3, background: "#2468ff" },
    }).jpeg().toBuffer();

    await expect(sanitizeImage(jpeg.subarray(0, 30))).rejects.toMatchObject({ code: "corrupt" });
  });

  it("removes appended script and archive payloads by rebuilding pixels", async () => {
    const jpeg = await sharp({
      create: { width: 4, height: 3, channels: 3, background: "#2468ff" },
    }).jpeg().toBuffer();
    const scriptMarker = Buffer.from("<?php BACKDOOR_MARKER ?>");
    const zipMarker = Buffer.from("PK\u0003\u0004ARCHIVE_MARKER");

    const result = await sanitizeImage(Buffer.concat([jpeg, scriptMarker, zipMarker]));
    const rebuilt = Buffer.from(result.bytes);

    expect(rebuilt.includes(scriptMarker)).toBe(false);
    expect(rebuilt.includes(zipMarker)).toBe(false);
  });

  it("strips EXIF metadata from rebuilt output", async () => {
    const input = await sharp({
      create: { width: 4, height: 3, channels: 3, background: "#2468ff" },
    }).withMetadata({ exif: { IFD0: { Artist: "untrusted author" } } }).jpeg().toBuffer();

    const result = await sanitizeImage(input);
    const metadata = await sharp(result.bytes).metadata();

    expect(metadata.exif).toBeUndefined();
    expect(metadata.icc).toBeUndefined();
  });

  it("rejects an image wider than the maximum axis", async () => {
    const input = await sharp({
      create: { width: 12_001, height: 1, channels: 3, background: "#2468ff" },
    }).png().toBuffer();

    await expect(sanitizeImage(input)).rejects.toMatchObject({ code: "dimensions" });
  });

  it("rejects an image above the pixel limit", async () => {
    const input = await sharp({
      create: { width: 6_325, height: 6_325, channels: 3, background: "#2468ff" },
    }).png({ compressionLevel: 9 }).toBuffer();

    await expect(sanitizeImage(input)).rejects.toMatchObject({ code: "dimensions" });
  });

  it("rejects animated WebP input", async () => {
    const first = await sharp({ create: { width: 2, height: 2, channels: 4, background: "#2468ff" } }).png().toBuffer();
    const second = await sharp({ create: { width: 2, height: 2, channels: 4, background: "#ff6d55" } }).png().toBuffer();
    const animated = await sharp([first, second], { join: { animated: true } })
      .webp({ loop: 0, delay: [100, 100] })
      .toBuffer();

    await expect(sanitizeImage(animated)).rejects.toMatchObject({ code: "animated" });
  });
});
