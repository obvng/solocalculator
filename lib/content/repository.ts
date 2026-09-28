import { and, desc, eq, inArray, lte } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { categories, pageSeo, postCategories, postRevisions, postTags, redirects, siteSettings, tags } from "@/lib/db/schema";
import { getDefaultPageSeo } from "@/lib/seo/defaults";
import { tools } from "@/lib/tools/catalog";
import { mapPageSeo, mapPublishedPost, mapRedirect, mapSiteSettings, mapTaxonomy, type DatabaseRow } from "./mappers";
import type { PageSeoRecord, PostRecord, RedirectRecord, SiteSettings, TaxonomyRecord } from "./types";

export { mapPublishedPost } from "./mappers";

export interface ContentDataSource {
  getPageSeo(pageKey: string): Promise<Partial<PageSeoRecord> | null>;
  listPublishedPostRows?(): Promise<DatabaseRow[]>;
}

async function defaultDataSource(): Promise<ContentDataSource> {
  return {
    async getPageSeo(pageKey) {
      const [row] = await getDb().select().from(pageSeo).where(eq(pageSeo.pageKey, pageKey)).limit(1);
      return row ? mapPageSeo(row) : null;
    },
    async listPublishedPostRows() {
      return getDb().select().from(postRevisions).where(and(eq(postRevisions.isCurrent, true), lte(postRevisions.publishedAt, new Date()))).orderBy(desc(postRevisions.publishedAt));
    },
  };
}

export async function getPageSeo(pageKey: string, source?: ContentDataSource): Promise<PageSeoRecord> {
  const fallback = getDefaultPageSeo(pageKey);
  try {
    const record = await (source ?? await defaultDataSource()).getPageSeo(pageKey);
    return record ? { ...fallback, ...record } : fallback;
  } catch { return fallback; }
}

export async function getPublishedPostBySlug(slug: string): Promise<PostRecord | null> {
  try {
    const [row] = await getDb().select().from(postRevisions).where(and(eq(postRevisions.slug, slug), eq(postRevisions.isCurrent, true), lte(postRevisions.publishedAt, new Date()))).limit(1);
    return row ? mapPublishedPost(row) : null;
  } catch { return null; }
}

export async function listPublishedPosts(source?: Pick<ContentDataSource, "listPublishedPostRows">, now = new Date()): Promise<PostRecord[]> {
  try {
    const rows = await (source?.listPublishedPostRows?.() ?? (await defaultDataSource()).listPublishedPostRows!());
    return rows.filter((row) => {
      const current = row.isCurrent ?? row.is_current;
      const published = row.publishedAt ?? row.published_at;
      return current === true && published != null && new Date(String(published)).getTime() <= now.getTime();
    }).map(mapPublishedPost);
  } catch { return []; }
}

export async function getPublicTaxonomy(kind: "category" | "tag", slug: string): Promise<TaxonomyRecord | null> {
  try {
    const table = kind === "category" ? categories : tags;
    const [row] = await getDb().select().from(table).where(eq(table.slug, slug)).limit(1);
    return row ? mapTaxonomy(row, kind) : null;
  } catch { return null; }
}

export async function listPublishedPostsForTaxonomy(kind: "category" | "tag", taxonomyId: string): Promise<PostRecord[]> {
  try {
    const links = kind === "category"
      ? await getDb().select({ postId: postCategories.postId }).from(postCategories).where(eq(postCategories.categoryId, taxonomyId))
      : await getDb().select({ postId: postTags.postId }).from(postTags).where(eq(postTags.tagId, taxonomyId));
    const postIds = links.map((link) => link.postId);
    if (!postIds.length) return [];
    const rows = await getDb().select().from(postRevisions).where(and(inArray(postRevisions.postId, postIds), eq(postRevisions.isCurrent, true), lte(postRevisions.publishedAt, new Date()))).orderBy(desc(postRevisions.publishedAt));
    return rows.map(mapPublishedPost);
  } catch { return []; }
}

export async function listPublicRedirects(): Promise<RedirectRecord[]> {
  try { return (await getDb().select().from(redirects).where(eq(redirects.enabled, true))).map(mapRedirect); }
  catch { return []; }
}

export async function listPublicPageSeo(): Promise<PageSeoRecord[]> {
  const defaultKeys = ["home", ...tools.map((tool) => tool.slug)];
  try {
    const rows = await getDb().select({ pageKey: pageSeo.pageKey }).from(pageSeo);
    const keys = new Set([...defaultKeys, ...rows.map((row) => row.pageKey)]);
    return Promise.all([...keys].map((pageKey) => getPageSeo(pageKey)));
  } catch { return defaultKeys.map(getDefaultPageSeo); }
}

export async function getPublicSettings(): Promise<SiteSettings | null> {
  try {
    const [row] = await getDb().select().from(siteSettings).where(eq(siteSettings.id, true)).limit(1);
    return row ? mapSiteSettings(row) : null;
  } catch { return null; }
}
