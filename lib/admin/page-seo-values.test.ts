import { describe, expect, it } from "vitest";
import type { PageSeoRecord } from "@/lib/content/types";
import { buildPageSeoValues } from "./page-seo-values";

const page: PageSeoRecord = {
  id: "page-1",
  pageKey: "tip-calculator",
  pathname: "/tip-calculator",
  title: "Tip Calculator: Split a Bill",
  description: "Calculate a tip and split the total bill.",
  slug: "tip-calculator",
  canonical: "https://www.solocalculator.com/tip-calculator",
  targetKeyword: "tip calculator",
  supportingKeywords: ["split bill", "tip percentage"],
  noIndex: false,
  noFollow: false,
  includeInSitemap: true,
  sitemapPriority: 0.8,
  changeFrequency: "monthly",
  openGraph: { title: "Tip calculator", description: "Split a bill.", imageId: null },
  xCard: { title: "Tip calculator", description: "Split a bill.", imageId: null },
  schemaType: "SoftwareApplication",
  schemaProperties: { applicationCategory: "UtilitiesApplication" },
  breadcrumbLabel: "Tip",
  faqItems: [{ question: "How much should I tip?", answer: "Choose the rate that fits the service." }],
  introductionHtml: "<p>Enter the bill.</p>",
  supportingSections: [],
  relatedPageKeys: [],
  relatedPostIds: [],
  createdAt: "",
  updatedAt: "",
};

describe("buildPageSeoValues", () => {
  it("maps validated page SEO data to every editable database column", () => {
    expect(buildPageSeoValues(page)).toEqual({
      pageKey: "tip-calculator",
      pathname: "/tip-calculator",
      browserTitle: "Tip Calculator: Split a Bill",
      metaDescription: "Calculate a tip and split the total bill.",
      introductionHtml: "<p>Enter the bill.</p>",
      canonicalUrl: "https://www.solocalculator.com/tip-calculator",
      breadcrumbLabel: "Tip",
      noIndex: false,
      noFollow: false,
      includeInSitemap: true,
      sitemapPriority: "0.8",
      changeFrequency: "monthly",
      openGraph: page.openGraph,
      xCard: page.xCard,
      keywords: ["tip calculator", "split bill", "tip percentage"],
      schemaConfig: { type: "SoftwareApplication", properties: { applicationCategory: "UtilitiesApplication" } },
      faqItems: page.faqItems,
    });
  });
});
