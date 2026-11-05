import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Header } from "@/components/Header";
import { tools } from "@/lib/tools/catalog";
import { JsonLd } from "@/components/content/JsonLd";
import { PRODUCTION_ORIGIN, toNextMetadata } from "@/lib/seo/metadata";
import { getPageSeo, getPublicSettings } from "@/lib/content/repository";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const [seo, settings] = await Promise.all([getPageSeo("calculators"), getPublicSettings()]);
  return toNextMetadata(seo, { siteName: settings?.siteName ?? "SoloCalculator", titleTemplate: "%s", defaultDescription: seo.description, defaultImageUrl: null }, "/calculators");
}

const groups = [
  { title: "Maths and percentages", slugs: ["scientific-calculator", "percentage-calculator", "discount-calculator"] },
  { title: "Dates and time", slugs: ["age-calculator", "date-calculator", "birthday-countdown", "time-duration-calculator", "business-days-calculator"] },
  { title: "Money and conversions", slugs: ["loan-calculator", "tip-calculator", "unit-converter", "currency-converter"] },
];

export default function CalculatorsPage() {
  return <main className={styles.viewport}><div className={styles.shell}>
    <Header />
    <JsonLd records={[
      { "@context": "https://schema.org", "@type": "CollectionPage", name: "All Calculators", url: `${PRODUCTION_ORIGIN}/calculators`, mainEntity: { "@type": "ItemList", itemListElement: tools.map((tool, index) => ({ "@type": "ListItem", position: index + 1, name: tool.heading, url: `${PRODUCTION_ORIGIN}/${tool.slug}` })) } },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: PRODUCTION_ORIGIN }, { "@type": "ListItem", position: 2, name: "All calculators", item: `${PRODUCTION_ORIGIN}/calculators` }] },
    ]} />
    <section className={styles.hero}><span>Calculator directory</span><h1>All calculators</h1><p>Choose a calculator and start typing. Every result updates as you change the values.</p></section>
    <section aria-label="Calculator directory">
      {groups.map((group) => <section key={group.title}><h2 className={styles.groupHeading}>{group.title}</h2><div className={styles.grid}>
      {tools.filter((tool) => group.slugs.includes(tool.slug)).map((tool) => <Link className={`${styles.card} ${styles[tool.accent]}`} href={`/${tool.slug}`} key={tool.slug}>
        <span className={styles.badge}>{tool.shortTitle.slice(0, 1)}</span>
        <span><strong>{tool.shortTitle}</strong><small>{tool.description}</small></span>
        <ArrowRight weight="bold" />
      </Link>)}
      </div></section>)}
    </section>
  </div></main>;
}
