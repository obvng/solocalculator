"use client";

import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { TableKit } from "@tiptap/extension-table";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";
import { sanitizeArticleHtml } from "@/lib/content/sanitize";
import type { EditorDocument } from "@/lib/content/types";
import { EditorToolbar } from "./EditorToolbar";
import { SourceEditor } from "./SourceEditor";
import styles from "./editor.module.css";

export function RichTextEditor({ value, html, onChange, onUploadRequest }: { value: EditorDocument; html: string; onChange(document: EditorDocument, html: string): void; onUploadRequest(): void }) {
  const [sourceMode, setSourceMode] = useState(false); const [source, setSource] = useState(html);
  const editor = useEditor({ immediatelyRender: false, extensions: [StarterKit.configure({ heading: { levels: [2, 3, 4, 5, 6] }, link: false, underline: false }), Underline, Link.configure({ openOnClick: false }), Image, TableKit.configure({ table: { resizable: true } })], content: value,
    onUpdate: ({ editor: current }) => { const nextHtml = current.getHTML(); setSource(nextHtml); onChange(current.getJSON() as EditorDocument, nextHtml); },
  });
  const toggleSource = () => { if (sourceMode && editor) { const safe = sanitizeArticleHtml(source); editor.commands.setContent(safe); setSource(safe); onChange(editor.getJSON() as EditorDocument, safe); } setSourceMode((current) => !current); };
  return <div className={styles.editor}><EditorToolbar editor={editor} sourceMode={sourceMode} onToggleSource={toggleSource} />{sourceMode ? <SourceEditor value={source} onChange={(next) => { setSource(next); onChange(value, next); }} /> : <EditorContent editor={editor} className={styles.canvas} />}<button className={styles.mediaButton} type="button" onClick={onUploadRequest}>Choose from media library</button><input type="hidden" name="sourceHtml" value={source} /><input type="hidden" name="editorDocument" value={JSON.stringify(editor?.getJSON() ?? value)} /></div>;
}
