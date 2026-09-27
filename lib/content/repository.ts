import type { PageSeoRecord, PostRecord, RedirectRecord, SiteSettings } from "./types";
import { getDefaultPageSeo } from "@/lib/seo/defaults";

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
        openGraph: data.open_graph, xCard: data.x_card, supportingKeywords: data.keywords,
        schemaProperties: data.schema_config, faqItems: data.faq_items,
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
    return data as unknown as PostRecord | null;
  } catch { return null; }
}

export async function listPublishedPosts(): Promise<PostRecord[]> {
  try {
    const { createServerClient } = await import("@/lib/supabase/server");
    const supabase = await createServerClient();
    const { data } = await supabase.from("post_revisions").select("*").eq("is_current", true).lte("published_at", new Date().toISOString()).order("published_at", { ascending: false });
    return (data ?? []) as unknown as PostRecord[];
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

export async function getPublicSettings(): Promise<SiteSettings | null> {
  try {
    const { createServerClient } = await import("@/lib/supabase/server");
    const supabase = await createServerClient();
    const { data } = await supabase.from("site_settings").select("*").eq("id", true).maybeSingle();
    return data as unknown as SiteSettings | null;
  } catch { return null; }
}
