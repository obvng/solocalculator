"use client";

import { useState } from "react";
import type { PageSeoRecord } from "@/lib/content/types";
import styles from "@/app/admin/(dashboard)/admin.module.css";

export function ExplanationEditor({ sections }: { sections: PageSeoRecord["supportingSections"] }) {
  const [items, setItems] = useState(sections.length ? sections : [{ heading: "How it works", html: "" }]);
  const change = (index: number, key: "heading" | "html", value: string) => setItems(items.map((item, i) => i === index ? { ...item, [key]: value } : item));
  return <fieldset className={styles.explanationSections}>
    <legend>Explanations below the calculator</legend>
    <p>Use these sections for how it works, formulas, examples and limitations. Use HTML for paragraphs and lists.</p>
    <input type="hidden" name="supportingSectionsPresent" value="1" />
    {items.map((item, index) => <div key={index}>
      <label htmlFor={`explanation-heading-${index}`}>Explanation {index + 1} heading</label>
      <input id={`explanation-heading-${index}`} name="supportingHeading" value={item.heading} maxLength={180} onChange={(event) => change(index, "heading", event.target.value)} />
      <label htmlFor={`explanation-html-${index}`}>Explanation {index + 1} text (HTML)</label>
      <textarea id={`explanation-html-${index}`} name="supportingHtml" rows={10} value={item.html} maxLength={100_000} onChange={(event) => change(index, "html", event.target.value)} />
      <button type="button" onClick={() => setItems(items.filter((_, i) => i !== index))}>Remove explanation {index + 1}</button>
    </div>)}
    <button type="button" disabled={items.length >= 20} onClick={() => setItems([...items, { heading: "", html: "" }])}>Add explanation section</button>
  </fieldset>;
}
