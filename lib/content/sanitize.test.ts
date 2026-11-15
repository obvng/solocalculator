import { describe, expect, it } from "vitest";
import { sanitizeArticleHtml, sanitizeArticleHtmlWithReport } from "./sanitize";

describe("sanitizeArticleHtml", () => {
  it("preserves exponents and subscripts without allowing scripts or attributes", () => {
    expect(sanitizeArticleHtml('<p>1.005<sup onclick="bad()">60</sup> and H<sub>2</sub>O</p>')).toBe('<p>1.005<sup>60</sup> and H<sub>2</sub>O</p>');
  });
  it("reports removed tags so the editor can warn before publishing", () => {
    const result = sanitizeArticleHtmlWithReport('<p>1.005<sup>60</sup><widget>Unsupported</widget></p><script>bad()</script>');
    expect(result.html).toBe('<p>1.005<sup>60</sup>Unsupported</p>');
    expect(result.removedTags).toEqual(["script", "widget"]);
  });
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
