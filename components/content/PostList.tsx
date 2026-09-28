import Link from "next/link";
import type { PostRecord } from "@/lib/content/types";
import styles from "./content.module.css";

function readableDate(value: string | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

export function PostList({ posts }: { posts: PostRecord[] }) {
  if (!posts.length) return <p className={styles.empty}>No articles have been published here yet.</p>;
  return (
    <div className={styles.postGrid}>
      {posts.map((post) => (
        <article className={styles.postCard} key={post.id}>
          <time dateTime={post.publishedAt ?? undefined}>{readableDate(post.publishedAt)}</time>
          <h2><Link href={`/blog/${post.slug}`}>{post.title}</Link></h2>
          {post.excerpt && <p>{post.excerpt}</p>}
          <Link className={styles.readLink} href={`/blog/${post.slug}`}>Read article</Link>
        </article>
      ))}
    </div>
  );
}
