import Link from "next/link";
import { getOverview } from "@/lib/admin/repository";
import styles from "./admin.module.css";

export default async function AdminOverview() {
  const overview = await getOverview().catch(() => ({ posts: 0, scheduled: 0, issues: 0 }));
  return <>
    <header className={styles.pageHeader}><div><p>Sunday, 27 September</p><h1>Everything that needs your attention.</h1></div><Link href="/admin/posts/new">Write a post</Link></header>
    <section className={styles.metrics} aria-label="Content summary">
      <article><span>Posts</span><strong>{overview.posts}</strong><Link href="/admin/posts">Open posts</Link></article>
      <article><span>Scheduled</span><strong>{overview.scheduled}</strong><Link href="/admin/posts?status=scheduled">View schedule</Link></article>
      <article className={styles.issueMetric}><span>SEO issues</span><strong>{overview.issues}</strong><Link href="/admin/pages">Review pages</Link></article>
    </section>
    <section className={styles.workQueue}><div><h2>Start here</h2><p>Write the first article or update the search description on an existing calculator page.</p></div><div><Link href="/admin/posts/new">New article</Link><Link href="/admin/pages">Edit page SEO</Link></div></section>
  </>;
}
