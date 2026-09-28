import { describe, expect, it } from "vitest";
import { getAdSenseScriptSrc } from "./AdSenseScript";

describe("getAdSenseScriptSrc", () => {
  const enabled = { publisherId: "ca-pub-1234567890", enabled: true };
  it("returns no script for admin pages", () => expect(getAdSenseScriptSrc(enabled, "/admin/settings")).toBeNull());
  it("returns no script when disabled", () => expect(getAdSenseScriptSrc({ ...enabled, enabled: false }, "/")).toBeNull());
  it("returns one official loader URL on public pages", () => expect(getAdSenseScriptSrc(enabled, "/calculator")).toBe("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890"));
});
