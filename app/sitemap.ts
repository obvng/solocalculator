import type { MetadataRoute } from "next";
import { listPublicPageSeo, listPublishedPosts } from "@/lib/content/repository";
import { PRODUCTION_ORIGIN } from "@/lib/seo/metadata";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [pages, posts] = await Promise.all([listPublicPageSeo(), listPublishedPosts()]);
  const visiblePages = pages.filter((page) => page.includeInSitemap && !page.noIndex);
  return [
    ...visiblePages.map((page) => ({ url: `${PRODUCTION_ORIGIN}${page.pathname === "/" ? "" : page.pathname}`, lastModified: page.updatedAt || undefined, changeFrequency: page.changeFrequency, priority: page.sitemapPriority })),
    { url: `${PRODUCTION_ORIGIN}/blog`, changeFrequency: "weekly", priority: .7 },
    ...posts.filter((post) => post.seo.includeInSitemap && !post.seo.noIndex).map((post) => ({ url: `${PRODUCTION_ORIGIN}/blog/${post.slug}`, lastModified: post.updatedAt || post.publishedAt || undefined, changeFrequency: post.seo.changeFrequency, priority: post.seo.sitemapPriority })),
  ];
}
