"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth/owner";
import { createAdminRedirect, createDraftPost, getAdminPost, publishPost, saveAdminPost, saveTaxonomy as saveTaxonomyRecord } from "@/lib/admin/repository";
import { sanitizeArticleHtml } from "@/lib/content/sanitize";
import { normalizeSlug, postInputSchema, taxonomyInputSchema } from "@/lib/content/validation";

export async function createPost() {
  await requireOwner();
  try { redirect(`/admin/posts/${await createDraftPost()}`); } catch (error) { if ((error as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw error; redirect("/admin/posts?error=create"); }
}

export async function savePost(id: string, formData: FormData) {
  await requireOwner();
  const intent = String(formData.get("intent") ?? "draft");
  const title = String(formData.get("title") ?? "").trim();
  const slug = normalizeSlug(String(formData.get("slug") ?? title));
  const sourceHtml = String(formData.get("sourceHtml") ?? "");
  const sanitizedHtml = sanitizeArticleHtml(sourceHtml);
  let seo: Record<string, unknown> = {};
  try { seo = JSON.parse(String(formData.get("seoJson") ?? "{}")); } catch { redirect(`/admin/posts/${id}?error=seo`); }
  const status = intent === "publish" ? "published" : intent === "schedule" ? "scheduled" : "draft";
  const parsed = postInputSchema.safeParse({ title, slug, sanitizedHtml, status });
  if (!parsed.success) redirect(`/admin/posts/${id}?error=validation`);

  const current = await getAdminPost(id);
  if (!current) redirect("/admin/posts?error=missing");
  const publishedAt = status === "published" ? new Date() : null;
  const saved = await saveAdminPost(id, {
    title, slug, excerpt: String(formData.get("excerpt") ?? ""), sourceHtml, sanitizedHtml,
    editorDocument: JSON.parse(String(formData.get("editorDocument") ?? '{"type":"doc","content":[]}')), seo,
    status, publishedAt, scheduledAt: status === "scheduled" ? new Date(String(formData.get("scheduledAt") ?? "")) : null,
    version: current.version + 1,
  });
  if (!saved) redirect(`/admin/posts/${id}?error=save`);

  if (status === "published") {
    try { await publishPost(id); } catch { redirect(`/admin/posts/${id}?error=publish`); }
    if (current.status === "published" && current.slug !== slug && formData.get("createRedirect") === "on") {
      await createAdminRedirect({ sourcePath: `/blog/${current.slug}`, destination: `/blog/${slug}`, statusCode: 308, enabled: true });
    }
  }
  revalidatePath("/blog"); revalidatePath(`/blog/${slug}`); revalidatePath("/sitemap.xml"); revalidatePath("/feed.xml");
  redirect(`/admin/posts/${id}?saved=1`);
}

export async function saveTaxonomy(kind: "category" | "tag", formData: FormData) {
  await requireOwner();
  const input = { name: String(formData.get("name") ?? ""), slug: normalizeSlug(String(formData.get("slug") ?? formData.get("name") ?? "")), description: String(formData.get("description") ?? ""), seo: {} };
  const parsed = taxonomyInputSchema.safeParse(input);
  if (!parsed.success) redirect("/admin/taxonomies?error=validation");
  try { await saveTaxonomyRecord(kind, input); } catch { redirect("/admin/taxonomies?error=save"); }
  revalidatePath("/admin/taxonomies");
}
