"use client";
import { useState } from "react"; import type { PageSeoRecord } from "@/lib/content/types"; import { savePageSeo } from "@/app/admin/(dashboard)/actions"; import { SeoPanel } from "./SeoPanel"; import styles from "@/app/admin/(dashboard)/admin.module.css";
import { useFormStatus } from "react-dom";
import { ExplanationEditor } from "./ExplanationEditor";

function SaveButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</button>;
}

export function PageSeoForm({ page }: { page: PageSeoRecord }) {
  const [seo, setSeo] = useState(page);
  const action = savePageSeo.bind(null, page.pageKey);
  return <form action={action} className={styles.pageSeoForm}><input type="hidden" name="pathname" value={page.pathname} /><header><div><h1>{page.breadcrumbLabel || page.pageKey}</h1><p>{page.pathname}</p></div><SaveButton /></header><div className={styles.lockedCalculator}><strong>Calculator code is locked</strong><span>Formulas, inputs and calculation behavior stay in source control.</span></div><label htmlFor="introductionHtml">On-page introduction</label><textarea id="introductionHtml" name="introductionHtml" rows={7} defaultValue={page.introductionHtml} /><ExplanationEditor sections={page.supportingSections} /><p>Complete FAQs appear below the calculator and generate matching FAQPage structured data. Write answers as plain text.</p><SeoPanel value={seo} pathname={page.pathname} onChange={(next) => setSeo({ ...page, ...next })} /></form>;
}
