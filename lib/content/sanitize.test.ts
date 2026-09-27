import { describe, expect, it } from "vitest";
import { sanitizeArticleHtml } from "./sanitize";

describe("sanitizeArticleHtml", () => {
  it("removes scripts, event handlers, and unsafe links", () => {
    const html = '<p onclick="steal()">Hi <a href="javascript:steal()">there</a></p><script>steal()</script>';
    expect(sanitizeArticleHtml(html)).toBe("<p>Hi <a>there</a></p>");
  });

  it("keeps article tables and secure YouTube embeds", () => {
    const html = '<table><tbody><tr><td>Total</td></tr></tbody></table><iframe src="https://www.youtube.com/embed/abc" title="Video"></iframe>';
    expect(sanitizeArticleHtml(html)).toBe(html);
  });

  it("removes unsupported embeds", () => {
    expect(sanitizeArticleHtml('<iframe src="https://tracker.example/embed/1"></iframe>')).toBe("");
  });
});
