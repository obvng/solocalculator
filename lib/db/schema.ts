import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const contentStatus = pgEnum("content_status", [
  "draft",
  "scheduled",
  "published",
  "archived",
]);

export const owners = pgTable("owners", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull().default("SoloCalculator"),
  ...timestamps,
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull().references(() => owners.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sessions_owner_index").on(table.ownerId)],
);

export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storagePath: text("storage_path").notNull().unique(),
    publicUrl: text("public_url").notNull(),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    byteSize: bigint("byte_size", { mode: "number" }).notNull(),
    sha256: text("sha256"),
    processingVersion: integer("processing_version").notNull().default(0),
    altText: text("alt_text").notNull().default(""),
    caption: text("caption").notNull().default(""),
    ...timestamps,
  },
  (table) => [
    check("media_mime_type_check", sql`${table.mimeType} in ('image/jpeg','image/png','image/webp')`),
    check("media_width_check", sql`${table.width} > 0 and ${table.width} <= 12000`),
    check("media_height_check", sql`${table.height} > 0 and ${table.height} <= 12000`),
    check("media_pixel_count_check", sql`${table.width}::bigint * ${table.height}::bigint <= 40000000`),
    check("media_byte_size_check", sql`${table.byteSize} > 0 and ${table.byteSize} <= 10485760`),
    check("media_processing_version_check", sql`${table.processingVersion} in (0, 1)`),
    check("media_sha256_check", sql`${table.processingVersion} = 0 or (${table.sha256} is not null and ${table.sha256} ~ '^[a-f0-9]{64}$')`),
  ],
);

export const uploadRateLimits = pgTable(
  "upload_rate_limits",
  {
    key: text("key").primaryKey(),
    windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
    count: integer("count").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("upload_rate_limit_count_check", sql`${table.count} > 0`)],
);

export const securityEvents = pgTable(
  "security_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").references(() => owners.id, { onDelete: "set null" }),
    eventType: text("event_type").notNull(),
    reasonCode: text("reason_code").notNull(),
    ipHash: text("ip_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("security_events_created_index").on(table.createdAt)],
);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull().default(""),
    slug: text("slug").notNull(),
    excerpt: text("excerpt").notNull().default(""),
    editorDocument: jsonb("editor_document").notNull().default({ type: "doc", content: [] }),
    sanitizedHtml: text("sanitized_html").notNull().default(""),
    sourceHtml: text("source_html"),
    status: contentStatus("status").notNull().default("draft"),
    featuredImageId: uuid("featured_image_id").references(() => media.id, { onDelete: "restrict" }),
    socialImageId: uuid("social_image_id").references(() => media.id, { onDelete: "restrict" }),
    authorDisplayName: text("author_display_name").notNull().default("SoloCalculator"),
    seo: jsonb("seo").notNull().default({}),
    relatedPageKeys: text("related_page_keys").array().notNull().default(sql`'{}'::text[]`),
    relatedPostIds: uuid("related_post_ids").array().notNull().default(sql`'{}'::uuid[]`),
    version: integer("version").notNull().default(1),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("posts_slug_unique").on(sql`lower(${table.slug})`),
    index("posts_publication_index").on(table.status, table.publishedAt),
    check("posts_slug_check", sql`${table.slug} = lower(${table.slug}) and ${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`),
    check("posts_version_check", sql`${table.version} > 0`),
  ],
);

export const postRevisions = pgTable(
  "post_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    revision: integer("revision").notNull(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    excerpt: text("excerpt").notNull().default(""),
    sanitizedHtml: text("sanitized_html").notNull(),
    authorDisplayName: text("author_display_name").notNull(),
    featuredImageId: uuid("featured_image_id").references(() => media.id, { onDelete: "restrict" }),
    socialImageId: uuid("social_image_id").references(() => media.id, { onDelete: "restrict" }),
    seo: jsonb("seo").notNull().default({}),
    relatedPageKeys: text("related_page_keys").array().notNull().default(sql`'{}'::text[]`),
    relatedPostIds: uuid("related_post_ids").array().notNull().default(sql`'{}'::uuid[]`),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
    isCurrent: boolean("is_current").notNull().default(true),
  },
  (table) => [
    unique("post_revisions_post_revision_unique").on(table.postId, table.revision),
    uniqueIndex("post_revisions_current_unique").on(table.postId).where(sql`${table.isCurrent}`),
    uniqueIndex("post_revisions_current_slug_unique").on(sql`lower(${table.slug})`).where(sql`${table.isCurrent}`),
    check("post_revisions_revision_check", sql`${table.revision} > 0`),
  ],
);

export const pageSeo = pgTable("page_seo", {
  id: uuid("id").primaryKey().defaultRandom(),
  pageKey: text("page_key").notNull().unique(),
  pathname: text("pathname").notNull().unique(),
  browserTitle: text("browser_title").notNull().default(""),
  metaDescription: text("meta_description").notNull().default(""),
  introductionHtml: text("introduction_html").notNull().default(""),
  supportingSections: jsonb("supporting_sections").notNull().default([]),
  canonicalUrl: text("canonical_url").notNull().default(""),
  breadcrumbLabel: text("breadcrumb_label").notNull().default(""),
  noIndex: boolean("no_index").notNull().default(false),
  noFollow: boolean("no_follow").notNull().default(false),
  includeInSitemap: boolean("include_in_sitemap").notNull().default(true),
  sitemapPriority: numeric("sitemap_priority", { precision: 2, scale: 1 }).notNull().default("0.8"),
  changeFrequency: text("change_frequency").notNull().default("monthly"),
  openGraph: jsonb("open_graph").notNull().default({}),
  xCard: jsonb("x_card").notNull().default({}),
  keywords: text("keywords").array().notNull().default(sql`'{}'::text[]`),
  schemaConfig: jsonb("schema_config").notNull().default({}),
  faqItems: jsonb("faq_items").notNull().default([]),
  relatedPageKeys: text("related_page_keys").array().notNull().default(sql`'{}'::text[]`),
  relatedPostIds: uuid("related_post_ids").array().notNull().default(sql`'{}'::uuid[]`),
  ...timestamps,
});

function taxonomyTable(name: "categories" | "tags") {
  return pgTable(name, {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull().default(""),
    seo: jsonb("seo").notNull().default({}),
    ...timestamps,
  });
}

export const categories = taxonomyTable("categories");
export const tags = taxonomyTable("tags");

export const postCategories = pgTable("post_categories", {
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.postId, table.categoryId] })]);

export const postTags = pgTable("post_tags", {
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.postId, table.tagId] })]);

export const redirects = pgTable("redirects", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourcePath: text("source_path").notNull().unique(),
  destination: text("destination").notNull(),
  statusCode: integer("status_code").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  ...timestamps,
});

export const redirectHistory = pgTable("redirect_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  redirectId: uuid("redirect_id").references(() => redirects.id, { onDelete: "set null" }),
  previousValue: jsonb("previous_value").notNull(),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const siteSettings = pgTable("site_settings", {
  id: boolean("id").primaryKey().default(true),
  siteName: text("site_name").notNull().default("SoloCalculator"),
  titleTemplate: text("title_template").notNull().default("%s | SoloCalculator"),
  defaultDescription: text("default_description").notNull().default("Free, easy-to-use calculators for everyday maths, dates, loans, conversions and more."),
  defaultSocialImageId: uuid("default_social_image_id").references(() => media.id, { onDelete: "set null" }),
  organization: jsonb("organization").notNull().default({}),
  socialProfiles: text("social_profiles").array().notNull().default(sql`'{}'::text[]`),
  verificationTokens: jsonb("verification_tokens").notNull().default({}),
  robotsRules: jsonb("robots_rules").notNull().default({}),
  googleAnalyticsMeasurementId: text("google_analytics_measurement_id").notNull().default(""),
  googleAnalyticsEnabled: boolean("google_analytics_enabled").notNull().default(false),
  adsensePublisherId: text("adsense_publisher_id").notNull().default(""),
  adsenseCode: text("adsense_code").notNull().default(""),
  adsenseEnabled: boolean("adsense_enabled").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const seoAuditResults = pgTable("seo_audit_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id").notNull(),
  issues: jsonb("issues").notNull().default([]),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique("seo_audit_resource_unique").on(table.resourceType, table.resourceId)]);

export type SiteSettingsRow = typeof siteSettings.$inferSelect;
