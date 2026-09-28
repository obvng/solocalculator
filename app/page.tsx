import {
  ArrowRight,
  Cake,
  CalendarBlank,
  ChartBar,
  Coins,
  House,
  Heart,
  Lightning,
  Percent,
  Ruler,
  TeaBag,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { Metadata } from "next";
import { Calculator } from "@/components/calculator/Calculator";
import { Header } from "@/components/Header";
import { ArticleBody } from "@/components/content/ArticleBody";
import { getPageSeo, getPublicSettings } from "@/lib/content/repository";
import { sanitizeArticleHtml } from "@/lib/content/sanitize";
import { toNextMetadata } from "@/lib/seo/metadata";
import styles from "./page.module.css";

const popularTools = [
  { title: "Age", description: "Find out your exact age in years, months and days.", href: "/age-calculator", color: "blue", icon: CalendarBlank },
  { title: "Percentage", description: "Work out percentages in seconds.", href: "/percentage-calculator", color: "coral", icon: Percent },
  { title: "Loan", description: "Estimate payments and total costs.", href: "/loan-calculator", color: "mint", icon: House },
  { title: "Date", description: "Add or subtract dates easily.", href: "/date-calculator", color: "lilac", icon: CalendarBlank },
  { title: "Unit", description: "Convert units across many categories.", href: "/unit-converter", color: "yellow", icon: Ruler },
  { title: "Currency", description: "Convert between world currencies.", href: "/currency-converter", color: "mint", icon: Coins },
];

const benefits = [
  { icon: Lightning, text: <>Fast & easy<br />to use</>, color: "blue" },
  { icon: Heart, text: <>100% free<br />for everyone</>, color: "lilac" },
  { icon: ChartBar, text: <>Small tools.<br />Big possibilities.</>, color: "blue" },
];

export async function generateMetadata(): Promise<Metadata> {
  const [seo, settings] = await Promise.all([getPageSeo("home"), getPublicSettings()]);
  return toNextMetadata(seo, { siteName: settings?.siteName ?? "SoloCalculator", titleTemplate: settings?.titleTemplate ?? "%s | SoloCalculator", defaultDescription: settings?.defaultDescription ?? seo.description, defaultImageUrl: null }, "/");
}

export default async function Home() {
  const page = await getPageSeo("home");
  return (
    <main className={styles.viewport}>
      <div className={styles.pageShell}>
        <Header />
        <section className={styles.hero}>
          <div className={styles.decorations} aria-hidden="true">
            <span className={styles.loop} />
            <span className={styles.blob} />
            <span className={styles.flower}>✣</span>
            <span className={styles.percentShape}>%</span>
            <span className={styles.plusShape}>+</span>
            <span className={styles.ball} />
            <span className={styles.noteTop}>Same<br />Numbers<br />Brighter<br />Days ☺</span>
            <span className={styles.noteBottom}>Numbers<br />make life brighter ☼</span>
          </div>

          <div className={styles.intro}>
            <h1>What do you want<br /><span>to calculate?</span></h1>
            <p>Quick. Accurate. Helpful calculators for<br className={styles.desktopBreak} /> everyday life.</p>
            <div className={styles.benefits}>
              {benefits.map(({ icon: Icon, text, color }, index) => (
                <div className={styles.benefit} key={index}>
                  <span className={`${styles.benefitIcon} ${styles[color]}`}><Icon weight="fill" /></span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.calculatorWrap}><Calculator /></div>
        </section>

        <section className={styles.toolsPanel}>
          <div className={styles.sectionHeading}>
            <h2>Popular calculators</h2>
            <Link href="/calculator">View all <ArrowRight weight="bold" /></Link>
          </div>
          <div className={styles.toolGrid}>
            {popularTools.map(({ title, description, href, color, icon: Icon }) => (
              <Link className={`${styles.toolCard} ${styles[`${color}Card`]}`} href={href} key={title}>
                <span className={`${styles.toolIcon} ${styles[color]}`}><Icon weight="fill" /></span>
                <strong>{title}</strong>
                <span className={styles.toolDescription}>{description}</span>
              </Link>
            ))}
          </div>

          <h2 className={styles.quickHeading}>Quick tools</h2>
          <div className={styles.quickGrid}>
            <Link className={styles.quickCard} href="/tip-calculator">
              <span className={`${styles.quickIcon} ${styles.blue}`}><TeaBag weight="fill" /></span>
              <span><strong>Tip calculator</strong><small>Split the bill and calculate the perfect tip.</small></span>
              <ArrowRight weight="bold" />
            </Link>
            <Link className={`${styles.quickCard} ${styles.birthday}`} href="/birthday-countdown">
              <span className={`${styles.quickIcon} ${styles.coral}`}><Cake weight="fill" /></span>
              <span><strong>Birthday countdown</strong><small>See how many days until the big day.</small></span>
              <ArrowRight weight="bold" />
            </Link>
          </div>
        </section>
        {page.introductionHtml && <section className={styles.seoContent}><ArticleBody html={sanitizeArticleHtml(page.introductionHtml)} /></section>}
      </div>
    </main>
  );
}
