import { listPublishedPosts } from "@/lib/content/repository";
import { PRODUCTION_ORIGIN } from "@/lib/seo/metadata";

const xml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export async function GET() {
  const posts = await listPublishedPosts();
  const items = posts.slice(0, 50).map((post) => `<item><title>${xml(post.title)}</title><link>${PRODUCTION_ORIGIN}/blog/${xml(post.slug)}</link><guid isPermaLink="true">${PRODUCTION_ORIGIN}/blog/${xml(post.slug)}</guid><description>${xml(post.excerpt)}</description>${post.publishedAt ? `<pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>` : ""}</item>`).join("");
  const body = `<?xml version="1.0" encoding="UTF-8" ?><rss version="2.0"><channel><title>SoloCalculator</title><link>${PRODUCTION_ORIGIN}</link><description>Helpful calculators for everyday life.</description><language>en</language>${items}</channel></rss>`;
  return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
