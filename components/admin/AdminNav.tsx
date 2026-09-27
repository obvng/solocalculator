import { Article, ArrowsLeftRight, ChartDonut, FileText, Gear, Image, SignOut, Tag } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import styles from "@/app/admin/(dashboard)/admin.module.css";

const links = [
  ["Overview", "/admin", ChartDonut], ["Posts", "/admin/posts", Article],
  ["Pages and calculators", "/admin/pages", FileText], ["Categories and tags", "/admin/taxonomies", Tag],
  ["Media", "/admin/media", Image], ["Redirects", "/admin/redirects", ArrowsLeftRight],
  ["SEO settings", "/admin/settings", Gear], ["Account", "/admin/account", SignOut],
] as const;

export function AdminNav() {
  return <nav className={styles.nav} aria-label="Admin navigation">
    <Link className={styles.brand} href="/admin"><span>0</span><strong>SoloCalculator</strong><small>Owner dashboard</small></Link>
    <div>{links.map(([label, href, Icon]) => <Link key={href} href={href}><Icon weight="bold" /><span>{label}</span></Link>)}</div>
    <Link className={styles.siteLink} href="/">View public site</Link>
  </nav>;
}
