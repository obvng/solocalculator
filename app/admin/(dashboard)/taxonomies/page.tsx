import { TaxonomyManager } from "@/components/admin/TaxonomyManager";
import { listAdminTaxonomies } from "@/lib/admin/repository";
import styles from "../admin.module.css";

export default async function TaxonomiesPage() { const data = await listAdminTaxonomies(); return <><header className={styles.sectionHeader}><div><h1>Categories and tags</h1><p>Keep article topics organised and easy to browse.</p></div></header><div className={styles.taxonomyGrid}><TaxonomyManager kind="category" items={data.categories} /><TaxonomyManager kind="tag" items={data.tags} /></div></>; }
