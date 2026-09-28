import { emptySeo } from "@/lib/seo/defaults";
import type { MediaRecord, PageSeoRecord, PostRecord, RedirectRecord, SeoRecord, SiteSettings, TaxonomyRecord } from "./types";

export type DatabaseRow = Record<string, unknown>;
const value = (row: DatabaseRow, camel: string, snake: string) => row[camel] ?? row[snake];
const iso = (input: unknown) => input instanceof Date ? input.toISOString() : String(input ?? "");

export function mapSeo(inputValue: unknown, fallbackSlug = ""): SeoRecord {
  const input = inputValue && typeof inputValue === "object" ? inputValue as Partial<SeoRecord> : {};
  return { ...emptySeo, ...input, slug: input.slug || fallbackSlug, openGraph: { ...emptySeo.openGraph, ...input.openGraph }, xCard: { ...emptySeo.xCard, ...input.xCard }, supportingKeywords: input.supportingKeywords ?? [], faqItems: input.faqItems ?? [], schemaProperties: input.schemaProperties ?? {} };
}

export function mapPublishedPost(row: DatabaseRow): PostRecord {
  const publishedAt = iso(value(row, "publishedAt", "published_at"));
  const slug = String(row.slug ?? "");
  const pageKeys = value(row, "relatedPageKeys", "related_page_keys");
  const postIds = value(row, "relatedPostIds", "related_post_ids");
  return {
    id: String(value(row, "postId", "post_id") ?? row.id ?? ""), title: String(row.title ?? ""), slug, excerpt: String(row.excerpt ?? ""),
    editorDocument: { type: "doc", content: [] }, sanitizedHtml: String(value(row, "sanitizedHtml", "sanitized_html") ?? ""), sourceHtml: null, status: "published",
    featuredImageId: value(row, "featuredImageId", "featured_image_id") ? String(value(row, "featuredImageId", "featured_image_id")) : null,
    socialImageId: value(row, "socialImageId", "social_image_id") ? String(value(row, "socialImageId", "social_image_id")) : null,
    authorDisplayName: String(value(row, "authorDisplayName", "author_display_name") ?? "SoloCalculator"), seo: mapSeo(row.seo, slug), categoryIds: [], tagIds: [],
    relatedPageKeys: Array.isArray(pageKeys) ? pageKeys.map(String) : [], relatedPostIds: Array.isArray(postIds) ? postIds.map(String) : [],
    version: Number(row.revision ?? 1), scheduledAt: null, publishedAt: publishedAt || null, createdAt: publishedAt, updatedAt: publishedAt,
  };
}

export function mapPageSeo(row: DatabaseRow): Partial<PageSeoRecord> {
  const keywords = (row.keywords as string[] | undefined) ?? [];
  const schemaConfig = (value(row, "schemaConfig", "schema_config") as { type?: PageSeoRecord["schemaType"]; properties?: Record<string, unknown> } | undefined) ?? {};
  return {
    id: String(row.id ?? ""), pageKey: String(value(row, "pageKey", "page_key") ?? ""), pathname: String(row.pathname ?? "/"), title: String(value(row, "browserTitle", "browser_title") ?? ""), description: String(value(row, "metaDescription", "meta_description") ?? ""),
    introductionHtml: String(value(row, "introductionHtml", "introduction_html") ?? ""), supportingSections: (value(row, "supportingSections", "supporting_sections") as PageSeoRecord["supportingSections"]) ?? [], canonical: String(value(row, "canonicalUrl", "canonical_url") ?? ""), breadcrumbLabel: String(value(row, "breadcrumbLabel", "breadcrumb_label") ?? ""),
    noIndex: Boolean(value(row, "noIndex", "no_index")), noFollow: Boolean(value(row, "noFollow", "no_follow")), includeInSitemap: value(row, "includeInSitemap", "include_in_sitemap") !== false, sitemapPriority: Number(value(row, "sitemapPriority", "sitemap_priority") ?? 0.8), changeFrequency: String(value(row, "changeFrequency", "change_frequency") ?? "monthly") as PageSeoRecord["changeFrequency"],
    openGraph: { ...emptySeo.openGraph, ...(value(row, "openGraph", "open_graph") as Partial<PageSeoRecord["openGraph"]> | undefined) }, xCard: { ...emptySeo.xCard, ...(value(row, "xCard", "x_card") as Partial<PageSeoRecord["xCard"]> | undefined) }, targetKeyword: keywords[0] ?? "", supportingKeywords: keywords.slice(1), schemaType: schemaConfig.type ?? "WebPage", schemaProperties: schemaConfig.properties ?? {}, faqItems: (value(row, "faqItems", "faq_items") as PageSeoRecord["faqItems"]) ?? [],
    relatedPageKeys: (value(row, "relatedPageKeys", "related_page_keys") as string[]) ?? [], relatedPostIds: (value(row, "relatedPostIds", "related_post_ids") as string[]) ?? [], createdAt: iso(value(row, "createdAt", "created_at")), updatedAt: iso(value(row, "updatedAt", "updated_at")),
  };
}

export function mapTaxonomy(row: DatabaseRow, kind: "category" | "tag"): TaxonomyRecord { const slug = String(row.slug ?? ""); return { id: String(row.id), kind, name: String(row.name), slug, description: String(row.description ?? ""), seo: mapSeo(row.seo, slug), createdAt: iso(value(row, "createdAt", "created_at")), updatedAt: iso(value(row, "updatedAt", "updated_at")) }; }
export function mapRedirect(row: DatabaseRow): RedirectRecord { return { id: String(row.id), sourcePath: String(value(row, "sourcePath", "source_path")), destination: String(row.destination), statusCode: Number(value(row, "statusCode", "status_code")) as RedirectRecord["statusCode"], enabled: Boolean(row.enabled), createdAt: iso(value(row, "createdAt", "created_at")), updatedAt: iso(value(row, "updatedAt", "updated_at")) }; }
export function mapMedia(row: DatabaseRow): MediaRecord { return { id: String(row.id), storagePath: String(value(row, "storagePath", "storage_path")), publicUrl: String(value(row, "publicUrl", "public_url")), originalFilename: String(value(row, "originalFilename", "original_filename")), mimeType: String(value(row, "mimeType", "mime_type")) as MediaRecord["mimeType"], width: Number(row.width), height: Number(row.height), byteSize: Number(value(row, "byteSize", "byte_size")), altText: String(value(row, "altText", "alt_text") ?? ""), caption: String(row.caption ?? ""), createdAt: iso(value(row, "createdAt", "created_at")), updatedAt: iso(value(row, "updatedAt", "updated_at")) }; }

export function mapSiteSettings(row: DatabaseRow): SiteSettings {
  return {
    siteName: String(value(row, "siteName", "site_name") ?? "SoloCalculator"), titleTemplate: String(value(row, "titleTemplate", "title_template") ?? "%s | SoloCalculator"), defaultDescription: String(value(row, "defaultDescription", "default_description") ?? ""), defaultSocialImageId: value(row, "defaultSocialImageId", "default_social_image_id") ? String(value(row, "defaultSocialImageId", "default_social_image_id")) : null,
    organization: (row.organization as Record<string, unknown>) ?? {}, socialProfiles: (value(row, "socialProfiles", "social_profiles") as string[]) ?? [], verificationTokens: (value(row, "verificationTokens", "verification_tokens") as Record<string, string>) ?? {}, robotsRules: (value(row, "robotsRules", "robots_rules") as Record<string, unknown>) ?? {},
    googleAnalyticsMeasurementId: String(value(row, "googleAnalyticsMeasurementId", "google_analytics_measurement_id") ?? ""), googleAnalyticsEnabled: Boolean(value(row, "googleAnalyticsEnabled", "google_analytics_enabled")),
    adsensePublisherId: String(value(row, "adsensePublisherId", "adsense_publisher_id") ?? ""), adsenseCode: String(value(row, "adsenseCode", "adsense_code") ?? ""), adsenseEnabled: Boolean(value(row, "adsenseEnabled", "adsense_enabled")), updatedAt: iso(value(row, "updatedAt", "updated_at")),
  };
}
