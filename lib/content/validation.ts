import { z } from "zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const internalPathPattern = /^\/(?!\/)[^\s]*$/;

export function normalizeSlug(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const safePublicUrl = z.string().refine((value) => {
  if (!value) return true;
  if (internalPathPattern.test(value)) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}, "Use a site path or an HTTPS URL.");

export const seoInputSchema = z.object({
  title: z.string().max(120).optional().default(""),
  description: z.string().max(320).optional().default(""),
  canonical: safePublicUrl.optional().default(""),
  targetKeyword: z.string().max(120).optional().default(""),
  supportingKeywords: z.array(z.string().max(120)).optional().default([]),
  noIndex: z.boolean().optional().default(false),
  noFollow: z.boolean().optional().default(false),
  includeInSitemap: z.boolean().optional().default(true),
  sitemapPriority: z.number().min(0).max(1).optional().default(0.8),
  changeFrequency: z.enum(["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"]).optional().default("monthly"),
  breadcrumbLabel: z.string().max(120).optional().default(""),
}).passthrough();

export const postInputSchema = z.object({
  title: z.string().max(180).optional().default(""),
  slug: z.string().optional().default(""),
  excerpt: z.string().max(600).optional().default(""),
  sanitizedHtml: z.string().optional().default(""),
  status: z.enum(["draft", "scheduled", "published", "archived"]),
  seo: seoInputSchema.optional(),
}).superRefine((post, context) => {
  if (post.slug && !slugPattern.test(post.slug)) {
    context.addIssue({ code: "custom", path: ["slug"], message: "Use lowercase words separated by hyphens." });
  }
  if (post.status === "published") {
    if (!post.title.trim()) context.addIssue({ code: "custom", path: ["title"], message: "Add a title before publishing." });
    if (!post.slug) context.addIssue({ code: "custom", path: ["slug"], message: "Add a slug before publishing." });
    if (!post.sanitizedHtml.trim()) context.addIssue({ code: "custom", path: ["sanitizedHtml"], message: "Add article content before publishing." });
  }
});

export const pageSeoInputSchema = seoInputSchema.extend({
  pageKey: z.string().min(1), pathname: z.string().regex(internalPathPattern), introductionHtml: z.string().default(""),
});
export const taxonomyInputSchema = z.object({ name: z.string().trim().min(1).max(100), slug: z.string().regex(slugPattern), description: z.string().max(600).default(""), seo: seoInputSchema });
export const mediaInputSchema = z.object({
  storagePath: z.string().min(1), publicUrl: z.string().url().startsWith("https://"), originalFilename: z.string().min(1).max(255),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]), width: z.number().int().positive().max(12_000), height: z.number().int().positive().max(12_000),
  byteSize: z.number().int().positive().max(10 * 1024 * 1024), sha256: z.string().regex(/^[a-f0-9]{64}$/), processingVersion: z.literal(1),
  altText: z.string().max(500).default(""), caption: z.string().max(1000).default(""),
}).refine((record) => record.width * record.height <= 40_000_000, { path: ["width"], message: "Image pixel count is too large." });

export const redirectInputSchema = z.object({
  sourcePath: z.string().regex(internalPathPattern), destination: safePublicUrl,
  statusCode: z.union([z.literal(301), z.literal(302), z.literal(307), z.literal(308)]), enabled: z.boolean(),
}).refine((redirect) => redirect.sourcePath !== redirect.destination, { path: ["destination"], message: "A redirect cannot point to itself." });

export const siteSettingsInputSchema = z.object({
  siteName: z.string().trim().min(1).max(100), titleTemplate: z.string().includes("%s"),
  defaultDescription: z.string().max(320), socialProfiles: z.array(z.string().url()),
  verificationTokens: z.record(z.string(), z.string()), robotsRules: z.record(z.string(), z.unknown()),
  googleAnalyticsMeasurementId: z.union([z.literal(""), z.string().regex(/^G-[A-Z0-9]+$/)]), googleAnalyticsEnabled: z.boolean(),
  adsensePublisherId: z.string().max(40), adsenseCode: z.string().max(1000), adsenseEnabled: z.boolean(),
});
