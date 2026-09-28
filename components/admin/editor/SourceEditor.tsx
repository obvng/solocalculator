"use client";

import styles from "./editor.module.css";

export function SourceEditor({ value, onChange }: { value: string; onChange(value: string): void }) {
  return <textarea className={styles.source} aria-label="HTML source code" value={value} onChange={(event) => onChange(event.target.value)} spellCheck={false} />;
}
