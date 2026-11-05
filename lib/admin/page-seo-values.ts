import type { ChangeFrequency, FaqItem, SchemaType, SocialMetadata } from "@/lib/content/types";
import type { pageSeo } from "@/lib/db/schema";
import type { SeoRecord } from "@/lib/content/types";

export function submittedPageSeo(formData: FormData): SeoRecord {
  const snapshot = JSON.parse(String(formData.get("seoJson") ?? "{}")) as SeoRecord;
  return {
    ...snapshot,
    title: formData.has("seoTitle") ? String(formData.get("seoTitle")) : snapshot.title,
    description: formData.has("seoDescription") ? String(formData.get("seoDescription")) : snapshot.description,
    canonical: formData.has("canonical") ? String(formData.get("canonical")) : snapshot.canonical,
  };
}

export interface EditablePageSeoInput {
  pageKey: string;
  pathname: string;
  title: string;
  description: string;
  introductionHtml: string;
  canonical: string;
  breadcrumbLabel: string;
  noIndex: boolean;
  noFollow: boolean;
  includeInSitemap: boolean;
  sitemapPriority: number;
  changeFrequency: ChangeFrequency;
  openGraph: SocialMetadata;
  xCard: SocialMetadata;
  targetKeyword: string;
  supportingKeywords: string[];
  schemaType: SchemaType;
  schemaProperties: Record<string, unknown>;
  faqItems: FaqItem[];
}

export function buildPageSeoValues(input: EditablePageSeoInput): typeof pageSeo.$inferInsert {
  return {
    pageKey: input.pageKey,
    pathname: input.pathname,
    browserTitle: input.title,
    metaDescription: input.description,
    introductionHtml: input.introductionHtml,
    canonicalUrl: input.canonical,
    breadcrumbLabel: input.breadcrumbLabel,
    noIndex: input.noIndex,
    noFollow: input.noFollow,
    includeInSitemap: input.includeInSitemap,
    sitemapPriority: String(input.sitemapPriority),
    changeFrequency: input.changeFrequency,
    openGraph: input.openGraph,
    xCard: input.xCard,
    keywords: [input.targetKeyword, ...input.supportingKeywords].filter(Boolean),
    schemaConfig: { type: input.schemaType, properties: input.schemaProperties },
    faqItems: input.faqItems,
  };
}
