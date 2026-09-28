import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { ArticleBody } from "@/components/content/ArticleBody";
import { JsonLd } from "@/components/content/JsonLd";
import { getPublishedPostBySlug, getPublicSettings } from "@/lib/content/repository";
import { toNextMetadata } from "@/lib/seo/metadata";
import { buildJsonLd } from "@/lib/seo/schema";
import styles from "../blog.module.css";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [post, settings] = await Promise.all([getPublishedPostBySlug(slug), getPublicSettings()]);
  if (!post) return {};
  return toNextMetadata(post.seo, {
    siteName: settings?.siteName ?? "SoloCalculator",
    titleTemplate: settings?.titleTemplate ?? "%s | SoloCalculator",
    defaultDescription: settings?.defaultDescription ?? post.excerpt,
    defaultImageUrl: null,
  }, `/blog/${post.slug}`);
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) notFound();
  const description = post.seo.description || post.excerpt;
  const records = buildJsonLd({ type: post.seo.schemaType === "BlogPosting" ? "BlogPosting" : "Article", title: post.title, description, pathname: `/blog/${post.slug}`, author: post.authorDisplayName, publishedAt: post.publishedAt, modifiedAt: post.updatedAt, breadcrumbs: [{ name: "Home", path: "/" }, { name: "Blog", path: "/blog" }, { name: post.seo.breadcrumbLabel || post.title, path: `/blog/${post.slug}` }] });
  return <main className={styles.viewport}><div className={styles.shell}><Header /><article className={`${styles.content} ${styles.article}`}><JsonLd records={records} /><nav className={styles.breadcrumbs} aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/blog">Blog</Link><span>/</span><span>{post.seo.breadcrumbLabel || post.title}</span></nav><header className={styles.articleHeader}><span className={styles.eyebrow}>Guide</span><h1>{post.title}</h1>{post.excerpt && <p>{post.excerpt}</p>}<div className={styles.articleMeta}><span>By {post.authorDisplayName}</span>{post.publishedAt && <time dateTime={post.publishedAt}>{new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(post.publishedAt))}</time>}</div></header><ArticleBody html={post.sanitizedHtml} /></article></div></main>;
}
