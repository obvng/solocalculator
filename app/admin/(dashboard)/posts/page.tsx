import Link from "next/link";
import { createPost } from "./actions";
import { PostActions } from "@/components/admin/PostActions";
import { listAdminPosts } from "@/lib/admin/repository";
import styles from "../admin.module.css";

export default async function PostsPage({ searchParams }: { searchParams: Promise<{ view?: string; trashed?: string; error?: string }> }) {
  const query = await searchParams;
  const trash = query.view === "trash";
  const data = (await listAdminPosts()).filter((post) => trash ? post.status === "archived" : post.status !== "archived");
  return <><header className={styles.sectionHeader}><div><h1>{trash ? "Trash" : "Posts"}</h1><p>{trash ? "Open an article and save it as a draft to restore it." : "Draft, schedule and publish articles."}</p><Link href={trash ? "/admin/posts" : "/admin/posts?view=trash"}>{trash ? "Back to posts" : "View Trash"}</Link></div><form action={createPost}><button>New article</button></form></header>{query.trashed ? <p role="status">Draft moved to Trash.</p> : null}{query.error ? <p role="alert">The draft could not be moved to Trash. Only drafts can be trashed.</p> : null}<div className={styles.list}>{data.map((post) => <article key={post.id}><div><strong>{post.title}</strong><span>/{post.slug}</span></div><span>{post.status}</span><PostActions id={post.id} slug={post.slug} published={post.status === "published"} /></article>)}{!data.length ? <div className={styles.empty}><h2>{trash ? "Trash is empty" : "No articles yet"}</h2></div> : null}</div><Link href="/admin">Back to overview</Link></>;
}
