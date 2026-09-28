import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Header } from "@/components/Header";
import { ArticleBody } from "@/components/content/ArticleBody";
import { JsonLd } from "@/components/content/JsonLd";
import { ToolCalculator } from "@/components/tools/ToolCalculators";
import { getPageSeo, getPublicSettings } from "@/lib/content/repository";
import { sanitizeArticleHtml } from "@/lib/content/sanitize";
import { toNextMetadata } from "@/lib/seo/metadata";
import { buildJsonLd } from "@/lib/seo/schema";
import { toolBySlug, tools } from "@/lib/tools/catalog";
import styles from "./tool-page.module.css";

export function generateStaticParams() { return tools.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tool = toolBySlug.get(slug);
  if (!tool) return {};
  const [seo, settings] = await Promise.all([getPageSeo(slug), getPublicSettings()]);
  return toNextMetadata(seo, { siteName: settings?.siteName ?? "SoloCalculator", titleTemplate: settings?.titleTemplate ?? "%s | SoloCalculator", defaultDescription: settings?.defaultDescription ?? tool.description, defaultImageUrl: null }, `/${slug}`);
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = toolBySlug.get(slug);
  if (!tool) notFound();
  const page = await getPageSeo(slug);
  const related = tools.filter((item) => item.slug !== slug && !["calculator", "scientific-calculator"].includes(item.slug)).slice(0, 3);
  const records = buildJsonLd({ type: "WebPage", title: page.title || tool.title, description: page.description || tool.description, pathname: page.pathname, breadcrumbs: [{ name: "Home", path: "/" }, { name: page.breadcrumbLabel || tool.shortTitle, path: page.pathname }] });
  return <main className={styles.viewport}><div className={styles.shell}><Header /><JsonLd records={records} /><section className={`${styles.hero} ${styles[tool.accent]}`}><div className={styles.copy}><span className={styles.crumb}><Link href="/">Home</Link> / {page.breadcrumbLabel || tool.shortTitle}</span><h1>{tool.title}</h1><p>{tool.intro}</p></div><div className={styles.tool}><ToolCalculator kind={tool.kind} /></div></section><section className={styles.content} id="how-to-use"><article>{page.introductionHtml ? <ArticleBody html={sanitizeArticleHtml(page.introductionHtml)} /> : <><h2>How to use this calculator</h2><p>Enter the values requested above. The result updates as you change each field, so you can compare different values without reloading the page.</p><h2>Worked example</h2><p>{tool.example}</p></>}{page.supportingSections.map((section) => <section key={section.heading}><h2>{section.heading}</h2><ArticleBody html={sanitizeArticleHtml(section.html)} /></section>)}</article><aside><h2>Related calculators</h2>{related.map((item) => <Link key={item.slug} href={`/${item.slug}`}><span>{item.shortTitle}</span><ArrowRight /></Link>)}</aside></section></div></main>;
}
