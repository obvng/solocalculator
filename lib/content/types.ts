export type ContentStatus = "draft" | "scheduled" | "published" | "archived";
export type ChangeFrequency = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
export type SchemaType = "WebSite" | "WebPage" | "Article" | "BlogPosting" | "FAQPage" | "HowTo" | "SoftwareApplication";

export interface EditorNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: EditorNode[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  text?: string;
}

export interface EditorDocument extends EditorNode {
  type: "doc";
  content: EditorNode[];
}

export interface SocialMetadata {
  title: string;
  description: string;
  imageId: string | null;
}

export interface FaqItem { question: string; answer: string }

export interface SeoRecord {
  title: string;
  description: string;
  slug: string;
  canonical: string;
  targetKeyword: string;
  supportingKeywords: string[];
  noIndex: boolean;
  noFollow: boolean;
  includeInSitemap: boolean;
  sitemapPriority: number;
  changeFrequency: ChangeFrequency;
  openGraph: SocialMetadata;
  xCard: SocialMetadata;
  schemaType: SchemaType;
  schemaProperties: Record<string, unknown>;
  breadcrumbLabel: string;
  faqItems: FaqItem[];
}

export interface PostRecord {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  editorDocument: EditorDocument;
  sanitizedHtml: string;
  sourceHtml: string | null;
  status: ContentStatus;
  featuredImageId: string | null;
  socialImageId: string | null;
  authorDisplayName: string;
  seo: SeoRecord;
  categoryIds: string[];
  tagIds: string[];
  relatedPageKeys: string[];
  relatedPostIds: string[];
  version: number;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageSeoRecord extends SeoRecord {
  id: string;
  pageKey: string;
  pathname: string;
  introductionHtml: string;
  supportingSections: Array<{ heading: string; html: string }>;
  relatedPageKeys: string[];
  relatedPostIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TaxonomyRecord {
  id: string;
  kind: "category" | "tag";
  name: string;
  slug: string;
  description: string;
  seo: SeoRecord;
  createdAt: string;
  updatedAt: string;
}

export interface MediaRecord {
  id: string;
  storagePath: string;
  publicUrl: string;
  originalFilename: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  width: number;
  height: number;
  byteSize: number;
  altText: string;
  caption: string;
  createdAt: string;
  updatedAt: string;
}

export interface RedirectRecord {
  id: string;
  sourcePath: string;
  destination: string;
  statusCode: 301 | 302 | 307 | 308;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SiteSettings {
  siteName: string;
  titleTemplate: string;
  defaultDescription: string;
  defaultSocialImageId: string | null;
  organization: Record<string, unknown>;
  socialProfiles: string[];
  verificationTokens: Record<string, string>;
  robotsRules: Record<string, unknown>;
  adsensePublisherId: string;
  adsenseCode: string;
  adsenseEnabled: boolean;
  updatedAt: string;
}
