import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/202609270001_content_admin.sql",
  "utf8",
);

describe("content schema", () => {
  it.each([
    "profiles",
    "posts",
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
    expect(sql).toMatch(new RegExp(`create table public\\.${table}`));
  });

  it("protects owner mutations at the database boundary", () => {
    expect(sql).toContain("create or replace function public.is_owner()");
    expect(sql).toContain("using ((select public.is_owner()))");
    expect(sql).toContain("with check ((select public.is_owner()))");
  });

  it("limits public post reads to published rows", () => {
    expect(sql).toContain("status = 'published'");
    expect(sql).toContain("published_at <= now()");
  });

  it("grants Data API access explicitly", () => {
    expect(sql).toContain("grant select on public.posts to anon, authenticated");
    expect(sql).toContain("grant insert, update, delete on public.posts to authenticated");
  });

  it("allows public media reads and owner-only writes", () => {
    expect(sql).toContain("values ('media', 'media', true");
    expect(sql).toContain("bucket_id = 'media' and (select public.is_owner())");
  });
});
