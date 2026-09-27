import { describe, expect, it } from "vitest";
import { normalizeSlug, postInputSchema, redirectInputSchema } from "./validation";

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
});
