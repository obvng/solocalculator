import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { PostList } from "@/components/content/PostList";
import { getPublicTaxonomy, listPublishedPostsForTaxonomy } from "@/lib/content/repository";
import { toNextMetadata } from "@/lib/seo/metadata";
import styles from "../../blog.module.css";

type PageProps = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: PageProps): Promise<Metadata> { const { slug } = await params; const item = await getPublicTaxonomy("category", slug); if (!item) return {}; return toNextMetadata({ ...item.seo, title: item.seo.title || item.name, description: item.seo.description || item.description }, { siteName: "SoloCalculator", titleTemplate: "%s | SoloCalculator", defaultDescription: item.description, defaultImageUrl: null }, `/blog/category/${slug}`); }
export default async function CategoryPage({ params }: PageProps) { const { slug } = await params; const item = await getPublicTaxonomy("category", slug); if (!item) notFound(); const posts = await listPublishedPostsForTaxonomy("category", item.id); return <main className={styles.viewport}><div className={styles.shell}><Header /><div className={styles.content}><header className={styles.hero}><span className={styles.eyebrow}>Category</span><h1>{item.name}</h1>{item.description && <p>{item.description}</p>}</header><PostList posts={posts} /></div></div></main>; }
