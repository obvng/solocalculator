import { describe, expect, it } from "vitest";
import { auditSeoDocument, type SeoAuditDocument } from "./audit";

const base: SeoAuditDocument = {
  id: "page-1", pathname: "/page", title: "Useful page title", description: "A useful description for this page.",
  canonical: "https://www.solocalculator.com/page", noIndex: false, includeInSitemap: true,
  html: '<h1>Useful page</h1><p>Read the <a href="/calculator">calculator</a> guide.</p>',
  imageAltTexts: ["Calculator screen"], internalLinks: ["/calculator"], validInternalPaths: ["/calculator"],
  inboundLinkCount: 1, schemaType: "WebPage", schemaProperties: { name: "Useful page" },
};

describe("auditSeoDocument", () => {
  it("reports an indexing conflict", () => {
    const issues = auditSeoDocument({ ...base, noIndex: true });
    expect(issues).toContainEqual(expect.objectContaining({ code: "indexing-conflict", field: "includeInSitemap" }));
  });

  it("reports missing structure, image text, links, and schema fields", () => {
    const issues = auditSeoDocument({
      ...base, pathname: "/blog/page", title: "", description: "", canonical: "", html: '<h2>Skipped</h2><img src="/image.jpg">',
      imageAltTexts: [""], internalLinks: ["/missing"], validInternalPaths: [], inboundLinkCount: 0,
      schemaType: "Article", schemaProperties: {},
    });
    expect(issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "missing-title", "missing-description", "missing-canonical", "missing-h1", "heading-order",
      "missing-alt", "broken-link", "orphan-content", "incomplete-schema",
    ]));
  });

  it("returns no errors for a healthy page", () => {
    expect(auditSeoDocument(base).filter((issue) => issue.severity === "error")).toEqual([]);
  });
});
