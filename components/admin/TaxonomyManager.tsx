import { saveTaxonomy } from "@/app/admin/(dashboard)/posts/actions";
import styles from "@/app/admin/(dashboard)/admin.module.css";

export function TaxonomyManager({ kind, items }: { kind: "category" | "tag"; items: Array<{ id: string; name: string; slug: string }> }) {
  const action = saveTaxonomy.bind(null, kind);
  return <section className={styles.taxonomy}><h2>{kind === "category" ? "Categories" : "Tags"}</h2><form action={action}><input name="name" aria-label={`${kind} name`} placeholder="Name" required /><input name="slug" aria-label={`${kind} slug`} placeholder="URL slug" /><input name="description" aria-label={`${kind} description`} placeholder="Short description" /><button>Add {kind}</button></form><ul>{items.map((item) => <li key={item.id}><strong>{item.name}</strong><span>/{item.slug}</span></li>)}</ul></section>;
}
