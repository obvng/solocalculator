import type { ChangeFrequency, FaqItem, SchemaType, SocialMetadata } from "@/lib/content/types";
import type { pageSeo } from "@/lib/db/schema";
import type { SeoRecord } from "@/lib/content/types";
import { sanitizeArticleHtml } from "@/lib/content/sanitize";
type SupportingSection = { heading: string; html: string };

export function submittedPageSeo(formData: FormData): SeoRecord & { supportingSections: SupportingSection[] } {
  const snapshot = JSON.parse(String(formData.get("seoJson") ?? "{}")) as SeoRecord & { supportingSections?: SupportingSection[] };
  const headings = formData.getAll("supportingHeading");
  const sections = formData.getAll("supportingHtml");
  const questions = formData.getAll("faqQuestion");
  const answers = formData.getAll("faqAnswer");
  if (headings.length !== sections.length || questions.length !== answers.length) throw new Error("Incomplete content fields");
  return {
    ...snapshot,
    supportingSections: formData.has("supportingSectionsPresent") || headings.length
      ? headings.map((heading, index) => ({ heading: String(heading).trim(), html: String(sections[index]).trim() })).filter((section) => section.html)
      : snapshot.supportingSections ?? [],
    faqItems: questions.length ? questions.map((question, index) => ({ question: String(question), answer: String(answers[index]) }))
      : formData.has("faqItems") ? JSON.parse(String(formData.get("faqItems"))) : snapshot.faqItems,
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
  supportingSections?: SupportingSection[];
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
    introductionHtml: sanitizeArticleHtml(input.introductionHtml),
    supportingSections: (input.supportingSections ?? []).map((section) => ({ heading: section.heading.trim(), html: sanitizeArticleHtml(section.html) })),
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
