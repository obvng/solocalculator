import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "drizzle/0000_calm_sentry.sql",
  "utf8",
);

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
});
