"use client";

import { useEffect, useState } from "react";
import type { EditorDocument, PostRecord } from "@/lib/content/types";
import { savePost } from "@/app/admin/(dashboard)/posts/actions";
import { RichTextEditor } from "./editor/RichTextEditor";
import { SeoPanel } from "./SeoPanel";
import styles from "@/app/admin/(dashboard)/admin.module.css";

export function PostForm({ post }: { post: PostRecord }) {
  const action = savePost.bind(null, post.id);
  const [title, setTitle] = useState(post.title); const [slug, setSlug] = useState(post.slug);
  const [document, setDocument] = useState<EditorDocument>(post.editorDocument); const [html, setHtml] = useState(post.sourceHtml ?? post.sanitizedHtml);
  const [seo, setSeo] = useState(post.seo); const [version, setVersion] = useState(post.version);
  const [dirty, setDirty] = useState(false); const [saveState, setSaveState] = useState<"saved" | "saving" | "failed">("saved");
  useEffect(() => { const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); }; window.addEventListener("beforeunload", beforeUnload); return () => window.removeEventListener("beforeunload", beforeUnload); }, [dirty]);
  useEffect(() => { if (!dirty) return; const timer = window.setTimeout(async () => { setSaveState("saving"); try { const response = await fetch("/api/admin/autosave", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: post.id, title, slug, sourceHtml: html, editorDocument: document, seo, version }) }); if (!response.ok) throw new Error("autosave"); const saved = await response.json(); setVersion(saved.version); setDirty(false); setSaveState("saved"); } catch { setSaveState("failed"); } }, 1500); return () => window.clearTimeout(timer); }, [dirty, document, html, post.id, seo, slug, title, version]);
  return <form action={action} className={styles.postForm}>
    <div className={styles.editorTop}><div><label htmlFor="title">Article title</label><input id="title" name="title" value={title} onChange={(event) => { setTitle(event.target.value); setDirty(true); }} required /></div><div className={styles.actions}><span className={styles.saveState}>{saveState === "saving" ? "Saving…" : saveState === "failed" ? "Autosave failed" : "Saved"}</span><button name="intent" value="draft">Save draft</button><button className={styles.publish} name="intent" value="publish">Publish</button></div></div>
    <div className={styles.editorGrid}><section><label htmlFor="slug">URL slug</label><input id="slug" name="slug" value={slug} onChange={(event) => { setSlug(event.target.value); setDirty(true); }} /><label htmlFor="excerpt">Excerpt</label><textarea id="excerpt" name="excerpt" rows={3} defaultValue={post.excerpt} onChange={() => setDirty(true)} /><label>Article content</label><RichTextEditor value={document} html={html} onChange={(nextDocument, nextHtml) => { setDocument(nextDocument); setHtml(nextHtml); setDirty(true); }} onUploadRequest={() => window.open("/admin/media?picker=1", "media-library", "width=1100,height=760")} /></section><aside><h2>Publishing</h2><label htmlFor="scheduledAt">Schedule date</label><input id="scheduledAt" name="scheduledAt" type="datetime-local" /><label className={styles.checkbox}><input type="checkbox" name="createRedirect" defaultChecked /> Create a redirect if the published URL changes</label><a href={`/api/admin/preview?id=${post.id}`} target="_blank" rel="noreferrer">Preview article</a><p>Status: <strong>{post.status}</strong></p></aside></div>
    <SeoPanel value={seo} pathname={`/blog/${slug}`} onChange={(next) => { setSeo(next); setDirty(true); }} />
  </form>;
}
