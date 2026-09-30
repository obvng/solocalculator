import { describe, expect, it } from "vitest";
import { mediaInputSchema, normalizeSlug, postInputSchema, redirectInputSchema } from "./validation";

describe("content validation", () => {
  it("normalizes a readable slug", () => {
    expect(normalizeSlug("  How Much Is 20%?  ")).toBe("how-much-is-20");
  });

  it("allows an incomplete draft but requires publishable content", () => {
    expect(postInputSchema.safeParse({ status: "draft", title: "", slug: "", sanitizedHtml: "" }).success).toBe(true);
    const result = postInputSchema.safeParse({ status: "published", title: "", slug: "", sanitizedHtml: "" });
    expect(result.success).toBe(false);
  });

  it("rejects unsafe canonical URLs and redirect loops", () => {
    expect(postInputSchema.safeParse({ status: "draft", title: "Draft", slug: "draft", sanitizedHtml: "", seo: { canonical: "javascript:alert(1)" } }).success).toBe(false);
    expect(redirectInputSchema.safeParse({ sourcePath: "/old", destination: "/old", statusCode: 308, enabled: true }).success).toBe(false);
    expect(redirectInputSchema.safeParse({ sourcePath: "/old", destination: "ftp://example.com/file", statusCode: 308, enabled: true }).success).toBe(false);
  });

  it("accepts only bounded, hashed, sanitized media records", () => {
    const validMedia = {
      storagePath: "media/2026-09-30/id.png",
      publicUrl: "https://blob.example/id.png",
      originalFilename: "photo.jpg.php",
      mimeType: "image/png" as const,
      width: 100,
      height: 100,
      byteSize: 2_000,
      sha256: "a".repeat(64),
      processingVersion: 1 as const,
      altText: "",
      caption: "",
    };

    expect(mediaInputSchema.parse(validMedia)).toMatchObject(validMedia);
    expect(() => mediaInputSchema.parse({ ...validMedia, mimeType: "image/gif" })).toThrow();
    expect(() => mediaInputSchema.parse({ ...validMedia, width: 12_001 })).toThrow();
    expect(() => mediaInputSchema.parse({ ...validMedia, height: 12_001 })).toThrow();
    expect(() => mediaInputSchema.parse({ ...validMedia, width: 10_000, height: 4_001 })).toThrow();
    expect(() => mediaInputSchema.parse({ ...validMedia, byteSize: 10 * 1024 * 1024 + 1 })).toThrow();
    expect(() => mediaInputSchema.parse({ ...validMedia, sha256: "A".repeat(64) })).toThrow();
  });
});
