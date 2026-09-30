CREATE TABLE "security_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid,
	"event_type" text NOT NULL,
	"reason_code" text NOT NULL,
	"ip_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"count" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "upload_rate_limit_count_check" CHECK ("upload_rate_limits"."count" > 0)
);
--> statement-breakpoint
ALTER TABLE "media" DROP CONSTRAINT "media_mime_type_check";--> statement-breakpoint
ALTER TABLE "media" DROP CONSTRAINT "media_width_check";--> statement-breakpoint
ALTER TABLE "media" DROP CONSTRAINT "media_height_check";--> statement-breakpoint
ALTER TABLE "media" DROP CONSTRAINT "media_byte_size_check";--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "sha256" text;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "processing_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "security_events_created_index" ON "security_events" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_pixel_count_check" CHECK ("media"."width"::bigint * "media"."height"::bigint <= 40000000) NOT VALID;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_processing_version_check" CHECK ("media"."processing_version" in (0, 1)) NOT VALID;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_sha256_check" CHECK ("media"."processing_version" = 0 or ("media"."sha256" is not null and "media"."sha256" ~ '^[a-f0-9]{64}$')) NOT VALID;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_mime_type_check" CHECK ("media"."mime_type" in ('image/jpeg','image/png','image/webp')) NOT VALID;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_width_check" CHECK ("media"."width" > 0 and "media"."width" <= 12000) NOT VALID;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_height_check" CHECK ("media"."height" > 0 and "media"."height" <= 12000) NOT VALID;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_byte_size_check" CHECK ("media"."byte_size" > 0 and "media"."byte_size" <= 10485760) NOT VALID;
