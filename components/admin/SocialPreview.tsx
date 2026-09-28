import styles from "@/app/admin/(dashboard)/admin.module.css";
export function SocialPreview({ title, description }: { title: string; description: string }) { return <section className={styles.socialPreview}><h3>Social preview</h3><div><span>SOLOCALCULATOR.COM</span><strong>{title || "Article title"}</strong><p>{description || "Social description"}</p></div></section>; }
