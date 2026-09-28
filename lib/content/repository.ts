import type { PageSeoRecord, PostRecord, RedirectRecord, SeoRecord, SiteSettings, TaxonomyRecord } from "./types";
import { emptySeo, getDefaultPageSeo } from "@/lib/seo/defaults";
import { tools } from "@/lib/tools/catalog";

type DatabaseRow = Record<string, unknown>;

function mapSeo(value: unknown, fallbackSlug = ""): SeoRecord {
  const input = value && typeof value === "object" ? value as Partial<SeoRecord> : {};
  return {
    ...emptySeo,
    ...input,
    slug: input.slug || fallbackSlug,
    openGraph: { ...emptySeo.openGraph, ...input.openGraph },
    xCard: { ...emptySeo.xCard, ...input.xCard },
    supportingKeywords: input.supportingKeywords ?? [],
    faqItems: input.faqItems ?? [],
    schemaProperties: input.schemaProperties ?? {},
  };
}

export function mapPublishedPost(row: DatabaseRow): PostRecord {
  const publishedAt = String(row.published_at ?? "");
  const slug = String(row.slug ?? "");
  return {
    id: String(row.post_id ?? row.id ?? ""),
    title: String(row.title ?? ""),
    slug,
    excerpt: String(row.excerpt ?? ""),
    editorDocument: { type: "doc", content: [] },
    sanitizedHtml: String(row.sanitized_html ?? ""),
    sourceHtml: null,
    status: "published",
    featuredImageId: row.featured_image_id ? String(row.featured_image_id) : null,
    socialImageId: row.social_image_id ? String(row.social_image_id) : null,
    authorDisplayName: String(row.author_display_name ?? "SoloCalculator"),
    seo: mapSeo(row.seo, slug),
    categoryIds: [],
    tagIds: [],
    relatedPageKeys: Array.isArray(row.related_page_keys) ? row.related_page_keys.map(String) : [],
    relatedPostIds: Array.isArray(row.related_post_ids) ? row.related_post_ids.map(String) : [],
    version: Number(row.revision ?? 1),
    scheduledAt: null,
    publishedAt: publishedAt || null,
    createdAt: publishedAt,
    updatedAt: publishedAt,
  };
}

export interface ContentDataSource {
  getPageSeo(pageKey: string): Promise<Partial<PageSeoRecord> | null>;
}

async function defaultDataSource(): Promise<ContentDataSource> {
  const { createServerClient } = await import("@/lib/supabase/server");
  const supabase = await createServerClient();
  return {
    async getPageSeo(pageKey) {
      const { data, error } = await supabase.from("page_seo").select("*").eq("page_key", pageKey).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id, pageKey: data.page_key, pathname: data.pathname,
        title: data.browser_title, description: data.meta_description,
        introductionHtml: data.introduction_html, supportingSections: data.supporting_sections,
        canonical: data.canonical_url, breadcrumbLabel: data.breadcrumb_label,
        noIndex: data.no_index, noFollow: data.no_follow, includeInSitemap: data.include_in_sitemap,
        sitemapPriority: Number(data.sitemap_priority), changeFrequency: data.change_frequency,
        openGraph: data.open_graph, xCard: data.x_card,
        targetKeyword: data.keywords?.[0] ?? "", supportingKeywords: data.keywords?.slice(1) ?? [],
        schemaType: data.schema_config?.type, schemaProperties: data.schema_config?.properties ?? {}, faqItems: data.faq_items,
        relatedPageKeys: data.related_page_keys, relatedPostIds: data.related_post_ids,
        createdAt: data.created_at, updatedAt: data.updated_at,
      } as Partial<PageSeoRecord>;
    },
  };
}

export async function getPageSeo(pageKey: string, source?: ContentDataSource): Promise<PageSeoRecord> {
  const fallback = getDefaultPageSeo(pageKey);
  try {
    const record = await (source ?? await defaultDataSource()).getPageSeo(pageKey);
    return record ? { ...fallback, ...record } : fallback;
  } catch {
    return fallback;
  }
}

export async function getPublishedPostBySlug(slug: string): Promise<PostRecord | null> {
  try {
    const { createServerClient } = await import("@/lib/supabase/server");
    const supabase = await createServerClient();
    const { data } = await supabase.from("post_revisions").select("*").eq("slug", slug).eq("is_current", true).lte("published_at", new Date().toISOString()).maybeSingle();
    return data ? mapPublishedPost(data) : null;
  } catch { return null; }
}

export async function listPublishedPosts(): Promise<PostRecord[]> {
  try {
    const { createServerClient } = await import("@/lib/supabase/server");
    const supabase = await createServerClient();
    const { data } = await supabase.from("post_revisions").select("*").eq("is_current", true).lte("published_at", new Date().toISOString()).order("published_at", { ascending: false });
    return (data ?? []).map(mapPublishedPost);
  } catch { return []; }
}

export async function getPublicTaxonomy(kind: "category" | "tag", slug: string): Promise<TaxonomyRecord | null> {
  try {
    const { createServerClient } = await import("@/lib/supabase/server");
    const supabase = await createServerClient();
    const table = kind === "category" ? "categories" : "tags";
    const { data } = await supabase.from(table).select("*").eq("slug", slug).maybeSingle();
    if (!data) return null;
    return {
      id: data.id, kind, name: data.name, slug: data.slug, description: data.description,
      seo: mapSeo(data.seo, data.slug), createdAt: data.created_at, updatedAt: data.updated_at,
    };
  } catch { return null; }
}

export async function listPublishedPostsForTaxonomy(kind: "category" | "tag", taxonomyId: string): Promise<PostRecord[]> {
  try {
    const { createServerClient } = await import("@/lib/supabase/server");
    const supabase = await createServerClient();
    const joinTable = kind === "category" ? "post_categories" : "post_tags";
    const foreignKey = kind === "category" ? "category_id" : "tag_id";
    const { data: links } = await supabase.from(joinTable).select("post_id").eq(foreignKey, taxonomyId);
    const postIds = (links ?? []).map((link) => link.post_id);
    if (!postIds.length) return [];
    const { data } = await supabase.from("post_revisions").select("*").in("post_id", postIds).eq("is_current", true).lte("published_at", new Date().toISOString()).order("published_at", { ascending: false });
    return (data ?? []).map(mapPublishedPost);
  } catch { return []; }
}

export async function listPublicRedirects(): Promise<RedirectRecord[]> {
  try {
    const { createServerClient } = await import("@/lib/supabase/server");
    const supabase = await createServerClient();
    const { data } = await supabase.from("redirects").select("*").eq("enabled", true);
    return (data ?? []) as unknown as RedirectRecord[];
  } catch { return []; }
}

export async function listPublicPageSeo(): Promise<PageSeoRecord[]> {
  const defaultKeys = ["home", ...tools.map((tool) => tool.slug)];
  try {
    const { createServerClient } = await import("@/lib/supabase/server");
    const supabase = await createServerClient();
    const { data } = await supabase.from("page_seo").select("page_key");
    const keys = new Set([...defaultKeys, ...(data ?? []).map((row) => row.page_key)]);
    return Promise.all([...keys].map((pageKey) => getPageSeo(pageKey)));
  } catch { return defaultKeys.map(getDefaultPageSeo); }
}

export async function getPublicSettings(): Promise<SiteSettings | null> {
  try {
    const { createServerClient } = await import("@/lib/supabase/server");
    const supabase = await createServerClient();
    const { data } = await supabase.from("site_settings").select("*").eq("id", true).maybeSingle();
    if (!data) return null;
    return {
      siteName: data.site_name, titleTemplate: data.title_template,
      defaultDescription: data.default_description, defaultSocialImageId: data.default_social_image_id,
      organization: data.organization, socialProfiles: data.social_profiles,
      verificationTokens: data.verification_tokens, robotsRules: data.robots_rules,
      updatedAt: data.updated_at,
    };
  } catch { return null; }
}
