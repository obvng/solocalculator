"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth/owner";
import { sanitizeArticleHtml } from "@/lib/content/sanitize";
import { normalizeSlug, postInputSchema, taxonomyInputSchema } from "@/lib/content/validation";
import { createServerClient } from "@/lib/supabase/server";

export async function createPost() {
  await requireOwner();
  const supabase = await createServerClient();
  const slug = `untitled-${Date.now()}`;
  const { data, error } = await supabase.from("posts").insert({ title: "Untitled article", slug, status: "draft" }).select("id").single();
  if (error) redirect("/admin/posts?error=create");
  redirect(`/admin/posts/${data.id}`);
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

  const supabase = await createServerClient();
  const { data: current } = await supabase.from("posts").select("slug,status,version").eq("id", id).single();
  if (!current) redirect("/admin/posts?error=missing");
  const publishedAt = status === "published" ? new Date().toISOString() : null;
  const { error } = await supabase.from("posts").update({
    title, slug, excerpt: String(formData.get("excerpt") ?? ""), source_html: sourceHtml, sanitized_html: sanitizedHtml,
    editor_document: JSON.parse(String(formData.get("editorDocument") ?? '{"type":"doc","content":[]}')), seo,
    status, published_at: publishedAt, scheduled_at: status === "scheduled" ? String(formData.get("scheduledAt") ?? "") || null : null,
    version: current.version + 1,
  }).eq("id", id);
  if (error) redirect(`/admin/posts/${id}?error=save`);

  if (status === "published") {
    const { error: publishError } = await supabase.rpc("publish_post", { p_post_id: id });
    if (publishError) redirect(`/admin/posts/${id}?error=publish`);
    if (current.status === "published" && current.slug !== slug && formData.get("createRedirect") === "on") {
      await supabase.from("redirects").insert({ source_path: `/blog/${current.slug}`, destination: `/blog/${slug}`, status_code: 308, enabled: true });
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
  const supabase = await createServerClient();
  const { error } = await supabase.from(kind === "category" ? "categories" : "tags").insert({ name: input.name, slug: input.slug, description: input.description });
  if (error) redirect("/admin/taxonomies?error=save");
  revalidatePath("/admin/taxonomies");
}
