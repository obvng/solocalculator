"use client";

import type { Editor } from "@tiptap/react";
import styles from "./editor.module.css";

export function EditorToolbar({ editor, sourceMode, onToggleSource }: { editor: Editor | null; sourceMode: boolean; onToggleSource(): void }) {
  const link = () => { const href = window.prompt("Link URL"); if (href) editor?.chain().focus().extendMarkRange("link").setLink({ href, target: "_blank", rel: "noopener noreferrer" }).run(); };
  const image = () => { const src = window.prompt("Image URL"); if (src) editor?.chain().focus().setImage({ src, alt: "" }).run(); };
  const tools = [
    ["Heading 2", () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), "H2"],
    ["Heading 3", () => editor?.chain().focus().toggleHeading({ level: 3 }).run(), "H3"],
    ["Bold", () => editor?.chain().focus().toggleBold().run(), "B"],
    ["Italic", () => editor?.chain().focus().toggleItalic().run(), "I"],
    ["Underline", () => editor?.chain().focus().toggleUnderline().run(), "U"],
    ["Bullet list", () => editor?.chain().focus().toggleBulletList().run(), "List"],
    ["Numbered list", () => editor?.chain().focus().toggleOrderedList().run(), "1. List"],
    ["Quote", () => editor?.chain().focus().toggleBlockquote().run(), "Quote"],
    ["Code block", () => editor?.chain().focus().toggleCodeBlock().run(), "Code"],
    ["Divider", () => editor?.chain().focus().setHorizontalRule().run(), "Line"],
    ["Add link", link, "Link"], ["Add image", image, "Image"],
    ["Insert table", () => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), "Table"],
    ["Undo", () => editor?.chain().focus().undo().run(), "Undo"], ["Redo", () => editor?.chain().focus().redo().run(), "Redo"],
  ] as const;
  return <div className={styles.toolbar} role="toolbar" aria-label="Article formatting">{tools.map(([name, action, label]) => <button key={name} type="button" aria-label={name} onClick={action} disabled={!editor || sourceMode}>{label}</button>)}<button type="button" aria-label="HTML source" className={sourceMode ? styles.active : ""} onClick={onToggleSource}>HTML</button></div>;
}
