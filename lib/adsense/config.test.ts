import { describe, expect, it } from "vitest";
import { normalizeAdSenseInput } from "./config";

describe("normalizeAdSenseInput", () => {
  it("extracts the publisher id from the official Google loader", () => {
    const result = normalizeAdSenseInput({
      publisherId: "",
      code: '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890" crossorigin="anonymous"></script>',
      enabled: true,
    });
    expect(result.publisherId).toBe("ca-pub-1234567890");
  });

  it("rejects unrelated script sources", () => {
    expect(() => normalizeAdSenseInput({ publisherId: "", code: '<script src="https://example.com/x.js"></script>', enabled: true })).toThrow("official Google AdSense code");
  });
});
