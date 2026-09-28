CREATE TYPE "public"."content_status" AS ENUM('draft', 'scheduled', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"seo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_path" text NOT NULL,
	"public_url" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"byte_size" bigint NOT NULL,
	"alt_text" text DEFAULT '' NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_storage_path_unique" UNIQUE("storage_path"),
	CONSTRAINT "media_mime_type_check" CHECK ("media"."mime_type" in ('image/jpeg','image/png','image/webp','image/gif')),
	CONSTRAINT "media_width_check" CHECK ("media"."width" > 0),
	CONSTRAINT "media_height_check" CHECK ("media"."height" > 0),
	CONSTRAINT "media_byte_size_check" CHECK ("media"."byte_size" > 0)
);
--> statement-breakpoint
CREATE TABLE "owners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text DEFAULT 'SoloCalculator' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "owners_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "page_seo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_key" text NOT NULL,
	"pathname" text NOT NULL,
	"browser_title" text DEFAULT '' NOT NULL,
	"meta_description" text DEFAULT '' NOT NULL,
	"introduction_html" text DEFAULT '' NOT NULL,
	"supporting_sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"canonical_url" text DEFAULT '' NOT NULL,
	"breadcrumb_label" text DEFAULT '' NOT NULL,
	"no_index" boolean DEFAULT false NOT NULL,
	"no_follow" boolean DEFAULT false NOT NULL,
	"include_in_sitemap" boolean DEFAULT true NOT NULL,
	"sitemap_priority" numeric(2, 1) DEFAULT '0.8' NOT NULL,
	"change_frequency" text DEFAULT 'monthly' NOT NULL,
	"open_graph" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"x_card" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"keywords" text[] DEFAULT '{}'::text[] NOT NULL,
	"schema_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"faq_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_page_keys" text[] DEFAULT '{}'::text[] NOT NULL,
	"related_post_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "page_seo_page_key_unique" UNIQUE("page_key"),
	CONSTRAINT "page_seo_pathname_unique" UNIQUE("pathname")
);
--> statement-breakpoint
CREATE TABLE "post_categories" (
	"post_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "post_categories_post_id_category_id_pk" PRIMARY KEY("post_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "post_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"sanitized_html" text NOT NULL,
	"author_display_name" text NOT NULL,
	"featured_image_id" uuid,
	"social_image_id" uuid,
	"seo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"related_page_keys" text[] DEFAULT '{}'::text[] NOT NULL,
	"related_post_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	CONSTRAINT "post_revisions_post_revision_unique" UNIQUE("post_id","revision"),
	CONSTRAINT "post_revisions_revision_check" CHECK ("post_revisions"."revision" > 0)
);
--> statement-breakpoint
CREATE TABLE "post_tags" (
	"post_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "post_tags_post_id_tag_id_pk" PRIMARY KEY("post_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"editor_document" jsonb DEFAULT '{"type":"doc","content":[]}'::jsonb NOT NULL,
	"sanitized_html" text DEFAULT '' NOT NULL,
	"source_html" text,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"featured_image_id" uuid,
	"social_image_id" uuid,
	"author_display_name" text DEFAULT 'SoloCalculator' NOT NULL,
	"seo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"related_page_keys" text[] DEFAULT '{}'::text[] NOT NULL,
	"related_post_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"scheduled_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_slug_check" CHECK ("posts"."slug" = lower("posts"."slug") and "posts"."slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
	CONSTRAINT "posts_version_check" CHECK ("posts"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "redirect_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"redirect_id" uuid,
	"previous_value" jsonb NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redirects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_path" text NOT NULL,
	"destination" text NOT NULL,
	"status_code" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "redirects_source_path_unique" UNIQUE("source_path")
);
--> statement-breakpoint
CREATE TABLE "seo_audit_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seo_audit_resource_unique" UNIQUE("resource_type","resource_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" boolean PRIMARY KEY DEFAULT true NOT NULL,
	"site_name" text DEFAULT 'SoloCalculator' NOT NULL,
	"title_template" text DEFAULT '%s | SoloCalculator' NOT NULL,
	"default_description" text DEFAULT 'Free, easy-to-use calculators for everyday maths, dates, loans, conversions and more.' NOT NULL,
	"default_social_image_id" uuid,
	"organization" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"social_profiles" text[] DEFAULT '{}'::text[] NOT NULL,
	"verification_tokens" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"robots_rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"adsense_publisher_id" text DEFAULT '' NOT NULL,
	"adsense_code" text DEFAULT '' NOT NULL,
	"adsense_enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"seo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "post_categories" ADD CONSTRAINT "post_categories_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_categories" ADD CONSTRAINT "post_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_revisions" ADD CONSTRAINT "post_revisions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_revisions" ADD CONSTRAINT "post_revisions_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_revisions" ADD CONSTRAINT "post_revisions_social_image_id_media_id_fk" FOREIGN KEY ("social_image_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_social_image_id_media_id_fk" FOREIGN KEY ("social_image_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redirect_history" ADD CONSTRAINT "redirect_history_redirect_id_redirects_id_fk" FOREIGN KEY ("redirect_id") REFERENCES "public"."redirects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_default_social_image_id_media_id_fk" FOREIGN KEY ("default_social_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "post_revisions_current_unique" ON "post_revisions" USING btree ("post_id") WHERE "post_revisions"."is_current";--> statement-breakpoint
CREATE UNIQUE INDEX "post_revisions_current_slug_unique" ON "post_revisions" USING btree (lower("slug")) WHERE "post_revisions"."is_current";--> statement-breakpoint
CREATE UNIQUE INDEX "posts_slug_unique" ON "posts" USING btree (lower("slug"));--> statement-breakpoint
CREATE INDEX "posts_publication_index" ON "posts" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "sessions_owner_index" ON "sessions" USING btree ("owner_id");
--> statement-breakpoint
INSERT INTO "page_seo" ("page_key", "pathname", "sitemap_priority", "change_frequency") VALUES
	('home', '/', 1.0, 'weekly'),
	('calculator', '/calculator', 0.8, 'monthly'),
	('scientific-calculator', '/scientific-calculator', 0.8, 'monthly'),
	('age-calculator', '/age-calculator', 0.8, 'monthly'),
	('percentage-calculator', '/percentage-calculator', 0.8, 'monthly'),
	('loan-calculator', '/loan-calculator', 0.8, 'monthly'),
	('date-calculator', '/date-calculator', 0.8, 'monthly'),
	('unit-converter', '/unit-converter', 0.8, 'monthly'),
	('currency-converter', '/currency-converter', 0.8, 'monthly'),
	('tip-calculator', '/tip-calculator', 0.8, 'monthly'),
	('birthday-countdown', '/birthday-countdown', 0.8, 'monthly')
ON CONFLICT ("page_key") DO NOTHING;
--> statement-breakpoint
INSERT INTO "site_settings" ("id") VALUES (true) ON CONFLICT ("id") DO NOTHING;
