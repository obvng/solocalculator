import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Header } from "@/components/Header";
import { tools } from "@/lib/tools/catalog";
import { JsonLd } from "@/components/content/JsonLd";
import { DEFAULT_SOCIAL_IMAGE, PRODUCTION_ORIGIN } from "@/lib/seo/metadata";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "All Calculators",
  description: "Browse every SoloCalculator tool for percentages, dates, time, money, conversions and everyday calculations.",
  alternates: { canonical: "/calculators" },
  openGraph: {
    type: "website", title: "All Calculators", description: "Browse every SoloCalculator tool for percentages, dates, time, money, conversions and everyday calculations.",
    url: `${PRODUCTION_ORIGIN}/calculators`, siteName: "SoloCalculator", images: [{ url: DEFAULT_SOCIAL_IMAGE, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: "All Calculators", description: "Browse every SoloCalculator tool for percentages, dates, time, money, conversions and everyday calculations.", images: [DEFAULT_SOCIAL_IMAGE] },
};

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
