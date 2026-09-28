import { PRODUCTION_ORIGIN, absoluteUrl } from "./metadata";

type SchemaKind = "Article" | "BlogPosting" | "WebPage";

export interface JsonLdInput {
  type: SchemaKind;
  title: string;
  description: string;
  pathname: string;
  author?: string;
  publishedAt?: string | null;
  modifiedAt?: string | null;
  imageUrl?: string | null;
  breadcrumbs: Array<{ name: string; path: string }>;
}

type JsonLdRecord = Record<string, unknown>;

export function buildJsonLd(input: JsonLdInput): JsonLdRecord[] {
  if (!input.title.trim() || !input.description.trim()) return [];

  const url = absoluteUrl(input.pathname);
  const page: JsonLdRecord = {
    "@context": "https://schema.org",
    "@type": input.type,
    name: input.title,
    description: input.description,
    url,
  };

  if (input.type === "Article" || input.type === "BlogPosting") {
    page.headline = input.title;
    if (input.author) page.author = { "@type": "Person", name: input.author };
    if (input.publishedAt) page.datePublished = input.publishedAt;
    if (input.modifiedAt) page.dateModified = input.modifiedAt;
    if (input.imageUrl) page.image = absoluteUrl(input.imageUrl);
    page.publisher = { "@type": "Organization", name: "SoloCalculator", url: PRODUCTION_ORIGIN };
  }

  const records = [page];
  if (input.breadcrumbs.length) {
    records.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: input.breadcrumbs.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: absoluteUrl(item.path),
      })),
    });
  }
  return records;
}

export function serializeJsonLd(records: JsonLdRecord[]): string {
  return JSON.stringify(records).replace(/</g, "\\u003c");
}
