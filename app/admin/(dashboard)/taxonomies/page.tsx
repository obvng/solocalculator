import { TaxonomyManager } from "@/components/admin/TaxonomyManager";
import { createServerClient } from "@/lib/supabase/server";
import styles from "../admin.module.css";

export default async function TaxonomiesPage() { const supabase = await createServerClient(); const [categories, tags] = await Promise.all([supabase.from("categories").select("id,name,slug").order("name"), supabase.from("tags").select("id,name,slug").order("name")]); return <><header className={styles.sectionHeader}><div><h1>Categories and tags</h1><p>Keep article topics organised and easy to browse.</p></div></header><div className={styles.taxonomyGrid}><TaxonomyManager kind="category" items={categories.data ?? []} /><TaxonomyManager kind="tag" items={tags.data ?? []} /></div></>; }
