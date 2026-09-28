import { notFound } from "next/navigation";
import { PostForm } from "@/components/admin/PostForm";
import { createServerClient } from "@/lib/supabase/server";
import type { PostRecord } from "@/lib/content/types";
import { emptySeo } from "@/lib/seo/defaults";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const supabase = await createServerClient();
  const { data } = await supabase.from("posts").select("*").eq("id", id).single(); if (!data) notFound();
  const storedSeo = (data.seo ?? {}) as Partial<PostRecord["seo"]>;
  const seo = { ...emptySeo, ...storedSeo, slug: storedSeo.slug ?? data.slug, openGraph: { ...emptySeo.openGraph, ...storedSeo.openGraph }, xCard: { ...emptySeo.xCard, ...storedSeo.xCard }, faqItems: storedSeo.faqItems ?? [] };
  const post = { ...data, seo, editorDocument: data.editor_document, sanitizedHtml: data.sanitized_html, sourceHtml: data.source_html, featuredImageId: data.featured_image_id, socialImageId: data.social_image_id, authorDisplayName: data.author_display_name, categoryIds: [], tagIds: [], relatedPageKeys: data.related_page_keys, relatedPostIds: data.related_post_ids, scheduledAt: data.scheduled_at, publishedAt: data.published_at, createdAt: data.created_at, updatedAt: data.updated_at } as unknown as PostRecord;
  return <PostForm post={post} />;
}
