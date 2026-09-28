import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { PostList } from "@/components/content/PostList";
import { listPublishedPosts } from "@/lib/content/repository";
import styles from "./blog.module.css";

export const metadata: Metadata = {
  title: "Helpful calculator guides | SoloCalculator",
  description: "Straightforward guides for everyday calculations, dates, money and conversions.",
  alternates: { canonical: "https://www.solocalculator.com/blog" },
};

export default async function BlogPage() {
  const posts = await listPublishedPosts();
  return <main className={styles.viewport}><div className={styles.shell}><Header /><div className={styles.content}><header className={styles.hero}><span className={styles.eyebrow}>SoloCalculator blog</span><h1>Clear answers for everyday calculations</h1><p>Practical guides that explain the numbers without making them harder than they need to be.</p></header><PostList posts={posts} /></div></div></main>;
}
