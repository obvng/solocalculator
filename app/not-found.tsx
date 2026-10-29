import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { NOT_FOUND_METADATA } from "@/lib/seo/metadata";
import styles from "./not-found.module.css";

export const metadata: Metadata = NOT_FOUND_METADATA;

export default function NotFound() {
  return <main className={styles.viewport}><div className={styles.shell}><Header /><section className={styles.content}><span>404</span><h1>Page not found</h1><p>The page may have moved or the address may be incorrect.</p><Link href="/calculators">Browse calculators</Link></section></div></main>;
}
