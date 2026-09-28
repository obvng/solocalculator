import type { Metadata } from "next";
import type { SeoRecord } from "@/lib/content/types";

export const PRODUCTION_ORIGIN = "https://www.solocalculator.com";

export interface MetadataDefaults {
  siteName: string;
  titleTemplate: string;
  defaultDescription: string;
  defaultImageUrl: string | null;
}

export function toVerificationMetadata(tokens: Record<string, string>): Metadata["verification"] | undefined {
  const google = tokens.google?.trim();
  return google ? { google } : undefined;
}

export function absoluteUrl(value: string | undefined, fallbackPath = "/"): string {
  const candidate = value?.trim() || fallbackPath;
  try {
    const parsed = new URL(candidate, PRODUCTION_ORIGIN);
    return new URL(`${parsed.pathname}${parsed.search}${parsed.hash}`, PRODUCTION_ORIGIN).toString();
  } catch {
    return new URL(fallbackPath, PRODUCTION_ORIGIN).toString();
  }
}

function applyTitleTemplate(title: string, template: string, siteName: string): string {
  if (!title) return "";
  if (title.toLowerCase().includes(siteName.toLowerCase())) return title;
  return template.includes("%s") ? template.replace("%s", title) : `${title} | ${template}`;
}

export function toNextMetadata(
  seo: SeoRecord,
  defaults: MetadataDefaults,
  pathname: string,
  images?: { openGraph?: string | null; xCard?: string | null },
): Metadata {
  const title = seo.title.trim() || defaults.siteName;
  const description = seo.description.trim() || defaults.defaultDescription;
  const canonical = absoluteUrl(seo.canonical, pathname);
  const openGraphImage = images?.openGraph || defaults.defaultImageUrl;
  const xCardImage = images?.xCard || openGraphImage;

  return {
    title: applyTitleTemplate(title, defaults.titleTemplate, defaults.siteName),
    description,
    alternates: { canonical },
    robots: { index: !seo.noIndex, follow: !seo.noFollow },
    openGraph: {
      type: "article",
      title: seo.openGraph.title.trim() || title,
      description: seo.openGraph.description.trim() || description,
      url: canonical,
      siteName: defaults.siteName,
      ...(openGraphImage ? { images: [{ url: absoluteUrl(openGraphImage) }] } : {}),
    },
    twitter: {
      card: xCardImage ? "summary_large_image" : "summary",
      title: seo.xCard.title.trim() || title,
      description: seo.xCard.description.trim() || description,
      ...(xCardImage ? { images: [absoluteUrl(xCardImage)] } : {}),
    },
  };
}
