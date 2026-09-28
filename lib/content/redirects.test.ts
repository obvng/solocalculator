import { describe, expect, it } from "vitest";
import { resolveRedirect, validateRedirectGraph } from "./redirects";
import type { RedirectRecord } from "./types";

const redirect = (sourcePath: string, destination: string, statusCode: 301 | 302 | 307 | 308 = 308, enabled = true): RedirectRecord => ({ id: sourcePath, sourcePath, destination, statusCode, enabled, createdAt: "", updatedAt: "" });

describe("redirect rules", () => {
  it("rejects indirect loops", () => {
    expect(() => validateRedirectGraph([redirect("/a", "/b"), redirect("/b", "/a")])).toThrow(/loop/i);
  });

  it("resolves a multi-hop path to its final destination", () => {
    expect(resolveRedirect("/old", [redirect("/old", "/middle", 301), redirect("/middle", "/new", 308)])).toEqual({ destination: "/new", permanent: true, statusCode: 308 });
  });

  it("ignores disabled rules and rejects unsafe schemes", () => {
    expect(resolveRedirect("/old", [redirect("/old", "/new", 302, false)])).toBeNull();
    expect(() => validateRedirectGraph([redirect("/old", "javascript:alert(1)")])).toThrow(/HTTPS|path/i);
  });
});
