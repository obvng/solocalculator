import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { PostList } from "@/components/content/PostList";
import { listPublishedPosts } from "@/lib/content/repository";
import styles from "./blog.module.css";
import { DEFAULT_SOCIAL_IMAGE } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
  title: { absolute: "Helpful calculator guides" },
  description: "Straightforward guides for everyday calculations, dates, money and conversions.",
  alternates: { canonical: "https://www.solocalculator.com/blog" },
  robots: { index: true, follow: true },
  openGraph: { type: "website", title: "Helpful calculator guides", description: "Straightforward guides for everyday calculations, dates, money and conversions.", url: "https://www.solocalculator.com/blog", images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630, alt: "SoloCalculator calculator guides" }] },
  twitter: { card: "summary_large_image", title: "Helpful calculator guides", description: "Straightforward guides for everyday calculations, dates, money and conversions.", images: [DEFAULT_SOCIAL_IMAGE] },
  };
}

export default async function BlogPage() {
  const posts = await listPublishedPosts();
  return <main className={styles.viewport}><div className={styles.shell}><Header /><div className={styles.content}><header className={styles.hero}><span className={styles.eyebrow}>SoloCalculator blog</span><h1>Clear answers for everyday calculations</h1><p>Practical guides that explain the numbers without making them harder than they need to be.</p></header><PostList posts={posts} /></div></div></main>;
}
