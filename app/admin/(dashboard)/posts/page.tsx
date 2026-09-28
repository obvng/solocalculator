import Link from "next/link";
import { createPost } from "./actions";
import { PostActions } from "@/components/admin/PostActions";
import { listAdminPosts } from "@/lib/admin/repository";
import styles from "../admin.module.css";

export default async function PostsPage() {
  const data = await listAdminPosts();
  return <><header className={styles.sectionHeader}><div><h1>Posts</h1><p>Draft, schedule and publish articles.</p></div><form action={createPost}><button>New article</button></form></header><div className={styles.list}>{data.map((post) => <article key={post.id}><div><strong>{post.title}</strong><span>/{post.slug}</span></div><span>{post.status}</span><PostActions id={post.id} slug={post.slug} published={post.status === "published"} /></article>)}{!data.length ? <div className={styles.empty}><h2>No articles yet</h2><p>Create the first SoloCalculator guide.</p><form action={createPost}><button>Write the first article</button></form></div> : null}</div><Link href="/admin">Back to overview</Link></>;
}
