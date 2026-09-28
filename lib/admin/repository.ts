import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { categories, media, pageSeo, postRevisions, posts, redirectHistory, redirects, seoAuditResults, siteSettings, tags } from "@/lib/db/schema";
import { mapPageSeo, mapRedirect, mapSeo, mapSiteSettings } from "@/lib/content/mappers";
import type { PostRecord, RedirectRecord, SiteSettings } from "@/lib/content/types";

type PublishablePost = Pick<typeof posts.$inferSelect, "id" | "title" | "slug" | "excerpt" | "sanitizedHtml" | "authorDisplayName" | "featuredImageId" | "socialImageId" | "seo" | "relatedPageKeys" | "relatedPostIds" | "publishedAt">;

export function buildRevisionSnapshot(post: PublishablePost, revision: number, now = new Date()) {
  return {
    postId: post.id, revision, title: post.title, slug: post.slug, excerpt: post.excerpt,
    sanitizedHtml: post.sanitizedHtml, authorDisplayName: post.authorDisplayName,
    featuredImageId: post.featuredImageId, socialImageId: post.socialImageId, seo: post.seo,
    relatedPageKeys: post.relatedPageKeys, relatedPostIds: post.relatedPostIds,
    publishedAt: post.publishedAt ?? now, isCurrent: true,
  };
}

export async function getOverview() {
  const database = getDb();
  const [[postCount], [scheduledCount], audits] = await Promise.all([
    database.select({ value: count() }).from(posts),
    database.select({ value: count() }).from(posts).where(eq(posts.status, "scheduled")),
    database.select({ issues: seoAuditResults.issues }).from(seoAuditResults).limit(50),
  ]);
  return { posts: postCount.value, scheduled: scheduledCount.value, issues: audits.flatMap((row) => Array.isArray(row.issues) ? row.issues : []).length };
}

export async function listAdminPosts() { return getDb().select({ id: posts.id, title: posts.title, slug: posts.slug, status: posts.status, updatedAt: posts.updatedAt }).from(posts).orderBy(desc(posts.updatedAt)); }

export async function createDraftPost() {
  const [post] = await getDb().insert(posts).values({ title: "Untitled article", slug: `untitled-${Date.now()}`, status: "draft" }).returning({ id: posts.id });
  return post.id;
}

export async function getAdminPost(id: string): Promise<PostRecord | null> {
  const [row] = await getDb().select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!row) return null;
  const storedSeo = row.seo && typeof row.seo === "object" ? row.seo : {};
  return {
    id: row.id, title: row.title, slug: row.slug, excerpt: row.excerpt,
    editorDocument: row.editorDocument as PostRecord["editorDocument"], sanitizedHtml: row.sanitizedHtml, sourceHtml: row.sourceHtml,
    status: row.status, featuredImageId: row.featuredImageId, socialImageId: row.socialImageId, authorDisplayName: row.authorDisplayName,
    seo: mapSeo(storedSeo, row.slug), categoryIds: [], tagIds: [], relatedPageKeys: row.relatedPageKeys, relatedPostIds: row.relatedPostIds,
    version: row.version, scheduledAt: row.scheduledAt?.toISOString() ?? null, publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  };
}

export async function saveAdminPost(id: string, values: Partial<typeof posts.$inferInsert>) {
  const [row] = await getDb().update(posts).set({ ...values, updatedAt: new Date() }).where(eq(posts.id, id)).returning();
  return row ?? null;
}

export async function publishPost(id: string) {
  return getDb().transaction(async (tx) => {
    const [post] = await tx.select().from(posts).where(eq(posts.id, id)).for("update").limit(1);
    if (!post || post.status !== "published") throw new Error("Publishable post not found.");
    const [latest] = await tx.select({ revision: postRevisions.revision }).from(postRevisions).where(eq(postRevisions.postId, id)).orderBy(desc(postRevisions.revision)).limit(1);
    await tx.update(postRevisions).set({ isCurrent: false }).where(and(eq(postRevisions.postId, id), eq(postRevisions.isCurrent, true)));
    await tx.insert(postRevisions).values(buildRevisionSnapshot(post, (latest?.revision ?? 0) + 1));
  });
}

export async function listAdminPages() { return getDb().select().from(pageSeo).orderBy(asc(pageSeo.pathname)); }
export async function listAdminTaxonomies() { const database = getDb(); const [categoryRows, tagRows] = await Promise.all([database.select().from(categories).orderBy(asc(categories.name)), database.select().from(tags).orderBy(asc(tags.name))]); return { categories: categoryRows, tags: tagRows }; }
export async function saveTaxonomy(kind: "category" | "tag", input: { name: string; slug: string; description: string }) { const table = kind === "category" ? categories : tags; await getDb().insert(table).values(input); }
export async function listAdminRedirects(): Promise<RedirectRecord[]> { return (await getDb().select().from(redirects).orderBy(asc(redirects.sourcePath))).map(mapRedirect); }
export async function createAdminRedirect(input: typeof redirects.$inferInsert) { const [created] = await getDb().insert(redirects).values(input).returning(); await getDb().insert(redirectHistory).values({ redirectId: created.id, previousValue: { action: "created", ...input } }); return created; }
export async function deleteAdminRedirect(id: string) { const [row] = await getDb().select().from(redirects).where(eq(redirects.id, id)).limit(1); if (!row) return; await getDb().insert(redirectHistory).values({ redirectId: id, previousValue: { action: "deleted", ...row } }); await getDb().delete(redirects).where(eq(redirects.id, id)); }

export async function getAdminSettings(): Promise<SiteSettings> {
  const [row] = await getDb().select().from(siteSettings).where(eq(siteSettings.id, true)).limit(1);
  if (row) return mapSiteSettings(row);
  const [created] = await getDb().insert(siteSettings).values({ id: true }).returning();
  return mapSiteSettings(created);
}

export async function updateAdminSettings(values: Partial<typeof siteSettings.$inferInsert>) { await getDb().update(siteSettings).set({ ...values, updatedAt: new Date() }).where(eq(siteSettings.id, true)); }
export async function updatePageSeo(pageKey: string, values: Partial<typeof pageSeo.$inferInsert>) { await getDb().update(pageSeo).set({ ...values, updatedAt: new Date() }).where(eq(pageSeo.pageKey, pageKey)); }
export async function listAdminMedia() { return getDb().select().from(media).orderBy(desc(media.createdAt)); }
