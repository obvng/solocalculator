import { describe, expect, it } from "vitest";
import { buildHomeJsonLd, buildJsonLd, serializeJsonLd } from "./schema";

describe("structured data", () => {
  it("builds article and breadcrumb records from validated fields", () => {
    const records = buildJsonLd({ type: "Article", title: "Percentage guide", description: "A guide", pathname: "/blog/percentage-guide", author: "SoloCalculator", publishedAt: "2026-09-28T09:00:00.000Z", modifiedAt: "2026-09-28T10:00:00.000Z", breadcrumbs: [{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }] });
    expect(records).toContainEqual(expect.objectContaining({ "@type": "Article", headline: "Percentage guide" }));
    expect(records).toContainEqual(expect.objectContaining({ "@type": "BreadcrumbList" }));
  });

  it("escapes markup when serializing JSON-LD", () => {
    expect(serializeJsonLd([{ "@context": "https://schema.org", "@type": "WebPage", name: "</script><script>alert(1)</script>" }])).not.toContain("</script>");
  });

  it("omits an incomplete article", () => {
    expect(buildJsonLd({ type: "Article", title: "", description: "", pathname: "/blog/empty", breadcrumbs: [] })).toEqual([]);
  });

  it("builds WebApplication data for calculator pages", () => {
    const [application] = buildJsonLd({
      type: "WebApplication",
      title: "Age calculator",
      description: "Calculate your exact age.",
      pathname: "/age-calculator",
      breadcrumbs: [],
    });

    expect(application).toEqual(expect.objectContaining({
      "@type": "WebApplication",
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any",
    }));
  });

  it("builds Organization and WebSite data for the homepage", () => {
    expect(buildHomeJsonLd("SoloCalculator", "Free online calculators.")).toEqual([
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "SoloCalculator",
        url: "https://www.solocalculator.com",
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "SoloCalculator",
        description: "Free online calculators.",
        url: "https://www.solocalculator.com",
      },
    ]);
  });
});
