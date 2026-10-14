import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "drizzle/0000_calm_sentry.sql",
  "utf8",
);
const mediaSecuritySql = readFileSync("drizzle/0002_living_black_queen.sql", "utf8");
const tierOneSql = existsSync("drizzle/0003_tier_one_calculators.sql")
  ? readFileSync("drizzle/0003_tier_one_calculators.sql", "utf8")
  : "";

describe("content schema", () => {
  it.each([
    "owners",
    "sessions",
    "posts",
    "post_revisions",
    "page_seo",
    "categories",
    "tags",
    "post_categories",
    "post_tags",
    "media",
    "redirects",
    "redirect_history",
    "site_settings",
    "seo_audit_results",
  ])("creates the %s table", (table) => {
    expect(sql).toContain(`CREATE TABLE "${table}"`);
  });

  it("stores only hashed owner passwords and session tokens", () => {
    expect(sql).toContain('"password_hash" text NOT NULL');
    expect(sql).toContain('"token_hash" text NOT NULL');
    expect(sql).not.toContain('"password" text');
  });

  it("keeps one immutable current revision per post", () => {
    expect(sql).toContain('CREATE UNIQUE INDEX "post_revisions_current_unique"');
    expect(sql).toContain('WHERE "post_revisions"."is_current"');
  });

  it("removes sessions when their owner is removed", () => {
    expect(sql).toContain('FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE cascade');
  });

  it("seeds editable SEO pages and singleton site settings", () => {
    expect(sql).toContain('INSERT INTO "page_seo"');
    expect(sql).toContain("('home', '/', 1.0, 'weekly')");
    expect(sql).toContain('INSERT INTO "site_settings" ("id") VALUES (true)');
  });

  it("adds media sanitization metadata and bounded upload controls", () => {
    expect(mediaSecuritySql).toContain('CREATE TABLE "security_events"');
    expect(mediaSecuritySql).toContain('CREATE TABLE "upload_rate_limits"');
    expect(mediaSecuritySql).toContain('ADD COLUMN "sha256" text');
    expect(mediaSecuritySql).toContain('ADD COLUMN "processing_version" integer DEFAULT 0 NOT NULL');
    expect(mediaSecuritySql).toContain("'image/jpeg','image/png','image/webp'");
    expect(mediaSecuritySql).not.toContain("'image/gif'");
    expect(mediaSecuritySql).toContain("<= 40000000");
    expect(mediaSecuritySql).toContain("<= 10485760");
    expect(mediaSecuritySql).toContain("NOT VALID");
  });

  it("seeds complete editable SEO records for every Tier 1 calculator", () => {
    const records = [
      ["percentage-increase-calculator", "Percentage Increase Calculator: Work Out % Change"],
      ["percentage-of-calculator", "Percentage Calculator: What Percent of What Number"],
      ["discount-calculator", "Discount Calculator: Sale Price and How Much You Save"],
      ["time-duration-calculator", "Time Duration Calculator: Hours Between Two Times"],
      ["business-days-calculator", "Business Days Calculator: Working Days Between Dates"],
    ];

    for (const [slug, title] of records) {
      expect(tierOneSql).toContain(`'${slug}'`);
      expect(tierOneSql).toContain(`'/${slug}'`);
      expect(tierOneSql).toContain(`'${title}'`);
      expect(tierOneSql).toContain(`'https://www.solocalculator.com/${slug}'`);
    }
    expect(tierOneSql.match(/WebApplication/g)).toHaveLength(5);
    expect(tierOneSql.match(/UtilitiesApplication/g)).toHaveLength(5);
    expect(tierOneSql.match(/true,\s*0\.8,\s*'monthly'/g)).toHaveLength(5);
    expect(tierOneSql).toContain('ON CONFLICT ("page_key") DO NOTHING');
  });
});
