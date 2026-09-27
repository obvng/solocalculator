import type { PostRecord } from "@/lib/content/types";
import { savePost } from "@/app/admin/(dashboard)/posts/actions";
import styles from "@/app/admin/(dashboard)/admin.module.css";

export function PostForm({ post }: { post: PostRecord }) {
  const action = savePost.bind(null, post.id);
  return <form action={action} className={styles.postForm}>
    <div className={styles.editorTop}><div><label htmlFor="title">Article title</label><input id="title" name="title" defaultValue={post.title} required /></div><div className={styles.actions}><button name="intent" value="draft">Save draft</button><button className={styles.publish} name="intent" value="publish">Publish</button></div></div>
    <div className={styles.editorGrid}><section>
      <label htmlFor="slug">URL slug</label><input id="slug" name="slug" defaultValue={post.slug} />
      <label htmlFor="excerpt">Excerpt</label><textarea id="excerpt" name="excerpt" rows={3} defaultValue={post.excerpt} />
      <label htmlFor="sourceHtml">Article content</label><textarea id="sourceHtml" name="sourceHtml" rows={20} defaultValue={post.sourceHtml ?? post.sanitizedHtml} />
    </section><aside><h2>Publishing</h2><label htmlFor="scheduledAt">Schedule date</label><input id="scheduledAt" name="scheduledAt" type="datetime-local" /><label className={styles.checkbox}><input type="checkbox" name="createRedirect" defaultChecked /> Create a redirect if the published URL changes</label><a href={`/api/admin/preview?id=${post.id}`} target="_blank" rel="noreferrer">Preview article</a><p>Status: <strong>{post.status}</strong></p></aside></div>
  </form>;
}
