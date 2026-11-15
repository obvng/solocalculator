"use client";

import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { TableKit } from "@tiptap/extension-table";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";
import { sanitizeArticleHtmlWithReport } from "@/lib/content/sanitize";
import type { EditorDocument } from "@/lib/content/types";
import { EditorToolbar } from "./EditorToolbar";
import { SourceEditor } from "./SourceEditor";
import styles from "./editor.module.css";

export function RichTextEditor({ value, html, onChange, onUploadRequest }: { value: EditorDocument; html: string; onChange(document: EditorDocument, html: string): void; onUploadRequest(): void }) {
  const [sourceMode, setSourceMode] = useState(false);
  const [source, setSource] = useState(html);
  const [initial] = useState(() => sanitizeArticleHtmlWithReport(html));
  const [removedTags, setRemovedTags] = useState(initial.removedTags);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: { levels: [2, 3, 4, 5, 6] }, link: false, underline: false }), Underline, Link.configure({ openOnClick: false }), Image, Subscript, Superscript, TableKit.configure({ table: { resizable: true } })],
    content: html ? initial.html : value,
    onUpdate: ({ editor: current }) => {
      const nextHtml = current.getHTML();
      setSource(nextHtml);
      onChange(current.getJSON() as EditorDocument, nextHtml);
    },
  });
  const changeSource = (next: string) => {
    setSource(next);
    const report = sanitizeArticleHtmlWithReport(next);
    setRemovedTags(report.removedTags);
    // Keep the document in sync even when Publish is pressed in HTML mode.
    editor?.commands.setContent(report.html, { emitUpdate: false });
    onChange(editor?.getJSON() as EditorDocument ?? value, next);
  };
  const toggleSource = () => {
    if (sourceMode && editor) {
      const report = sanitizeArticleHtmlWithReport(source);
      editor.commands.setContent(report.html, { emitUpdate: false });
      setSource(report.html);
      // Keep the warning visible after the removed markup leaves the source.
      if (report.removedTags.length) setRemovedTags(report.removedTags);
      onChange(editor.getJSON() as EditorDocument, report.html);
    }
    setSourceMode((current) => !current);
  };
  return <div className={styles.editor}>
    <EditorToolbar editor={editor} sourceMode={sourceMode} onToggleSource={toggleSource} />
    {removedTags.length > 0 ? <p className={styles.warning} role="alert">Saving removes unsupported HTML tags: {removedTags.map((tag) => `<${tag}>`).join(", ")}. Check the affected text before publishing.</p> : null}
    {sourceMode ? <SourceEditor value={source} onChange={changeSource} /> : <EditorContent editor={editor} className={styles.canvas} />}
    <button className={styles.mediaButton} type="button" onClick={onUploadRequest}>Choose from media library</button>
    <input type="hidden" name="sourceHtml" value={source} />
    <input type="hidden" name="editorDocument" value={JSON.stringify(editor?.getJSON() ?? value)} />
  </div>;
}
