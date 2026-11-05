import { toolBySlug } from "@/lib/tools/catalog";
import type { PageSeoRecord, SeoRecord } from "@/lib/content/types";

export const emptySeo: SeoRecord = {
  title: "", description: "", slug: "", canonical: "", targetKeyword: "", supportingKeywords: [],
  noIndex: false, noFollow: false, includeInSitemap: true, sitemapPriority: 0.8, changeFrequency: "monthly",
  openGraph: { title: "", description: "", imageId: null },
  xCard: { title: "", description: "", imageId: null }, schemaType: "WebPage", schemaProperties: {},
  breadcrumbLabel: "", faqItems: [],
};

export function getDefaultPageSeo(pageKey: string): PageSeoRecord {
  const home = pageKey === "home";
  const tool = toolBySlug.get(pageKey);
  const pathname = home ? "/" : `/${pageKey}`;
  const title = home ? "SoloCalculator | Quick, accurate everyday calculators" : pageKey === "calculators" ? "All Calculators" : tool?.title ?? "Calculator";
  const description = home
    ? "Free, easy-to-use calculators for everyday maths, dates, loans, conversions and more."
    : pageKey === "calculators" ? "Browse every SoloCalculator tool for percentages, dates, time, money, conversions and everyday calculations." : tool?.description ?? "A free online calculator for everyday calculations.";
  return {
    ...emptySeo, id: `default:${pageKey}`, pageKey, pathname, title, description,
    slug: home ? "" : pageKey, canonical: `https://www.solocalculator.com${pathname}`,
    breadcrumbLabel: home ? "Home" : pageKey === "calculators" ? "All calculators" : tool?.shortTitle ?? "Calculator",
    sitemapPriority: home ? 1 : 0.8, changeFrequency: home ? "weekly" : "monthly",
    openGraph: { title, description, imageId: null }, xCard: { title, description, imageId: null },
    introductionHtml: "", supportingSections: [],
    relatedPageKeys: [], relatedPostIds: [], createdAt: "", updatedAt: "",
  };
}
