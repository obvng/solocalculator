import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Header } from "@/components/Header";
import { tools } from "@/lib/tools/catalog";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "All Calculators",
  description: "Browse every SoloCalculator tool for percentages, dates, time, money, conversions and everyday calculations.",
  alternates: { canonical: "/calculators" },
};

export default function CalculatorsPage() {
  return <main className={styles.viewport}><div className={styles.shell}>
    <Header />
    <section className={styles.hero}><span>Calculator directory</span><h1>All calculators</h1><p>Choose a calculator and start typing. Every result updates as you change the values.</p></section>
    <section className={styles.grid} aria-label="Calculator directory">
      {tools.map((tool) => <Link className={`${styles.card} ${styles[tool.accent]}`} href={`/${tool.slug}`} key={tool.slug}>
        <span className={styles.badge}>{tool.shortTitle.slice(0, 1)}</span>
        <span><strong>{tool.shortTitle}</strong><small>{tool.description}</small></span>
        <ArrowRight weight="bold" />
      </Link>)}
    </section>
  </div></main>;
}
