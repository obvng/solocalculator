import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Header } from "@/components/Header";
import { ToolCalculator } from "@/components/tools/ToolCalculators";
import { toolBySlug, tools } from "@/lib/tools/catalog";
import styles from "./tool-page.module.css";

export function generateStaticParams() { return tools.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tool = toolBySlug.get(slug);
  if (!tool) return {};
  return {
    title: `${tool.title} | SoloCalculator`,
    description: tool.description,
    alternates: { canonical: `/${slug}` },
    openGraph: { title: tool.title, description: tool.description, url: `/${slug}`, siteName: "SoloCalculator" },
  };
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = toolBySlug.get(slug);
  if (!tool) notFound();
  const related = tools.filter((item) => item.slug !== slug && !["calculator", "scientific-calculator"].includes(item.slug)).slice(0, 3);
  return <main className={styles.viewport}><div className={styles.shell}><Header /><section className={`${styles.hero} ${styles[tool.accent]}`}><div className={styles.copy}><span className={styles.crumb}><Link href="/">Home</Link> / {tool.shortTitle}</span><h1>{tool.title}</h1><p>{tool.intro}</p></div><div className={styles.tool}><ToolCalculator kind={tool.kind} /></div></section><section className={styles.content} id="how-to-use"><article><h2>How to use this calculator</h2><p>Enter the values requested above. The result updates as you change each field, so you can compare different values without reloading the page.</p><h2>Worked example</h2><p>{tool.example}</p></article><aside><h2>Related calculators</h2>{related.map((item) => <Link key={item.slug} href={`/${item.slug}`}><span>{item.shortTitle}</span><ArrowRight /></Link>)}</aside></section></div></main>;
}
