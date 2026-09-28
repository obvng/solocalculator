# SoloCalculator blog, admin, and SEO implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private owner dashboard that publishes blog content and controls public SEO without exposing drafts, secrets, or calculator code.

**Architecture:** Keep the public and private interfaces in the existing Next.js App Router project. Supabase Auth protects `/admin`, PostgreSQL stores content and SEO records, and Supabase Storage holds media; a typed repository layer supplies safe public fallbacks when Supabase is unavailable. Mutations run only on the server, validate input with Zod, sanitize editor HTML, and revalidate affected public routes.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Auth/PostgreSQL/Storage, `@supabase/ssr`, Zod, Tiptap, `sanitize-html`, Vitest, Testing Library, Playwright, Vercel.

**Spec:** `docs/superpowers/specs/2026-09-27-blog-admin-seo-design.md`

## Global constraints

- `/admin/login` is the only public admin route; there is no registration or invitation UI.
- Only the email in `OWNER_EMAIL` may access admin data or perform mutations.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser code; routine application flows use the publishable/anon key and Row Level Security.
- Public visitors may read published posts and public SEO data only.
- Calculator formulas and executable components remain source-controlled and cannot be edited in the dashboard.
- Canonical public URLs use `https://www.solocalculator.com`.
- Store editor content as Tiptap JSON plus sanitized HTML; remove scripts, event handlers, unsafe URLs, and unsupported embeds.
- SEO warnings inform the owner but do not block publication.
- If Supabase is unavailable, calculator routes use code-defined metadata and copy rather than failing.
- Every calculator display starts at `0`.
- Each implementation task follows red-green-refactor: add a focused failing test, confirm the failure, add the smallest working implementation, then rerun the focused and related tests.

## File structure

- `supabase/migrations/202609270001_content_admin.sql`: content, SEO, taxonomy, media, redirects, audit tables, triggers, indexes, and RLS.
- `supabase/seed.sql`: stable homepage and calculator page identifiers plus initial global settings.
- `lib/supabase/{browser,server,middleware}.ts`: environment-safe Supabase client factories.
- `lib/content/types.ts`: shared content, SEO, editor, media, redirect, and settings types.
- `lib/content/{validation,sanitize,repository,mutations}.ts`: validation, HTML safety, public/admin reads, and authenticated writes.
- `lib/seo/{defaults,metadata,schema,audit}.ts`: fallback records, Next metadata conversion, safe JSON-LD, and audit rules.
- `lib/auth/owner.ts`: server-side owner checks.
- `proxy.ts`: session refresh, protected admin routing, and database redirects.
- `app/admin/**`: owner login, dashboard shell, editors, media, redirects, settings, and account pages.
- `components/admin/**`: focused admin forms, tables, editor controls, previews, and audit panels.
- `app/blog/**`: published blog index, article, category, and tag routes.
- Existing public route files: database-backed metadata/copy with code fallbacks.
- Existing SEO endpoints: database-aware sitemap, RSS, and robots output.
- `e2e/admin-publish.spec.ts`: full login-to-publish browser flow.

---

### Task 1: Database schema, policies, and generated contracts

**Files:**
- Create: `supabase/migrations/202609270001_content_admin.sql`
- Create: `supabase/seed.sql`
- Create: `lib/content/types.ts`
- Create: `lib/content/schema-contract.test.ts`
- Modify: `.env.example`
- Modify: `package.json`

**Interfaces:**
- Produces: `ContentStatus`, `SeoRecord`, `PostRecord`, `PageSeoRecord`, `TaxonomyRecord`, `MediaRecord`, `RedirectRecord`, `SiteSettings`, and `EditorDocument` types.
- Produces database RPC `is_owner()` and tables `profiles`, `posts`, `page_seo`, `categories`, `tags`, `post_categories`, `post_tags`, `media`, `redirects`, `redirect_history`, `site_settings`, and `seo_audit_results`.

- [ ] **Step 1: Install the data, validation, editor, sanitizing, and browser-test packages**

Run:

```bash
npm install @supabase/ssr @supabase/supabase-js zod sanitize-html @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-header @tiptap/extension-table-cell @tiptap/extension-underline
npm install --save-dev @types/sanitize-html @playwright/test
```

Expected: `package.json` and `package-lock.json` contain the listed dependencies.

- [ ] **Step 2: Write a failing schema contract test**

Create `lib/content/schema-contract.test.ts` that reads the migration and asserts it contains every required table, unique post/page slug indexes, publication-state checks, `updated_at` triggers, the `is_owner()` helper, public-select policies restricted to published content, owner-only mutation policies, and a `media` bucket policy with public reads and owner-only writes.

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/202609270001_content_admin.sql", "utf8");

describe("content schema", () => {
  it.each(["posts", "page_seo", "categories", "tags", "media", "redirects", "site_settings"])(
    "creates %s",
    (table) => expect(sql).toMatch(new RegExp(`create table public\\.${table}`)),
  );
  it("protects mutations with the owner policy", () => {
    expect(sql).toContain("create or replace function public.is_owner()");
    expect(sql).toContain("using (public.is_owner())");
    expect(sql).toContain("with check (public.is_owner())");
  });
  it("limits public post reads to published rows", () => {
    expect(sql).toContain("status = 'published'");
    expect(sql).toContain("published_at <= now()");
  });
});
```

- [ ] **Step 3: Run the contract test and confirm it fails**

Run: `npm test -- lib/content/schema-contract.test.ts`

Expected: FAIL because the migration does not exist.

- [ ] **Step 4: Add the schema, RLS, storage rules, seed rows, and TypeScript contracts**

The migration must use UUID primary keys, `timestamptz`, database check constraints for `draft | scheduled | published | archived`, unique normalized slugs, join-table uniqueness, redirect loop-safe source uniqueness, and update triggers. Use `auth.jwt() ->> 'email' = current_setting('app.settings.owner_email', true)` inside `is_owner()` and set the production database setting during Supabase configuration.

Seed page keys `home` and every `tools[].slug`. Add `.env.example` with only names:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
OWNER_EMAIL=
SUPABASE_SERVICE_ROLE_KEY=
```

Define `SeoRecord` with explicit fields for title, description, canonical, robots, sitemap, social cards, keywords, breadcrumb, schema selection/properties, FAQ items, and related content IDs. Do not use an untyped metadata object at the app boundary.

- [ ] **Step 5: Run schema and existing tests**

Run: `npm test -- lib/content/schema-contract.test.ts`

Expected: PASS.

Run: `npm test`

Expected: all existing tests and the new contract tests pass.

- [ ] **Step 6: Commit the schema foundation**

```bash
git add package.json package-lock.json .env.example supabase lib/content
git commit -m "feat: add content database schema"
```

### Task 2: Supabase clients and owner-only route protection

**Files:**
- Create: `lib/supabase/browser.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/middleware.ts`
- Create: `lib/auth/owner.ts`
- Create: `lib/auth/owner.test.ts`
- Create: `proxy.ts`
- Create: `app/admin/login/page.tsx`
- Create: `app/admin/login/actions.ts`
- Create: `app/admin/login/login.module.css`

**Interfaces:**
- Produces: `createBrowserClient()`, async `createServerClient()`, `updateSession(request)`, `requireOwner()`, and `isAllowedOwner(email)`.
- `requireOwner()` returns the authenticated Supabase `User` or redirects to `/admin/login`.

- [ ] **Step 1: Write owner-check tests**

```ts
import { describe, expect, it } from "vitest";
import { isAllowedOwner } from "./owner";

describe("isAllowedOwner", () => {
  it("matches the configured owner case-insensitively", () => {
    expect(isAllowedOwner("Owner@Example.com", "owner@example.com")).toBe(true);
  });
  it("rejects missing and different users", () => {
    expect(isAllowedOwner(null, "owner@example.com")).toBe(false);
    expect(isAllowedOwner("writer@example.com", "owner@example.com")).toBe(false);
  });
});
```

- [ ] **Step 2: Confirm the owner tests fail**

Run: `npm test -- lib/auth/owner.test.ts`

Expected: FAIL because `isAllowedOwner` is missing.

- [ ] **Step 3: Implement session clients, owner validation, proxy protection, and login**

Use `@supabase/ssr` cookie adapters. `proxy.ts` must refresh auth cookies, redirect unauthenticated `/admin/*` requests to `/admin/login`, redirect authenticated non-owner users to login with `error=unauthorized`, and keep `/admin/login` accessible. The login action calls `signInWithPassword`, normalizes the email, rejects any email unequal to `OWNER_EMAIL`, and returns field-safe errors without logging passwords.

```ts
export function isAllowedOwner(email: string | null | undefined, ownerEmail = process.env.OWNER_EMAIL) {
  return Boolean(email && ownerEmail && email.trim().toLowerCase() === ownerEmail.trim().toLowerCase());
}
```

- [ ] **Step 4: Verify auth behavior**

Run: `npm test -- lib/auth/owner.test.ts`

Expected: PASS.

Run: `npm run lint`

Expected: exit 0.

- [ ] **Step 5: Commit owner authentication**

```bash
git add lib/supabase lib/auth proxy.ts app/admin/login
git commit -m "feat: protect admin with owner authentication"
```

### Task 3: Typed validation, sanitization, and repository fallbacks

**Files:**
- Create: `lib/content/validation.ts`
- Create: `lib/content/sanitize.ts`
- Create: `lib/content/repository.ts`
- Create: `lib/content/validation.test.ts`
- Create: `lib/content/sanitize.test.ts`
- Create: `lib/content/repository.test.ts`
- Create: `lib/seo/defaults.ts`

**Interfaces:**
- Produces Zod schemas `postInputSchema`, `pageSeoInputSchema`, `taxonomyInputSchema`, `mediaInputSchema`, `redirectInputSchema`, and `siteSettingsInputSchema`.
- Produces `sanitizeArticleHtml(html): string`.
- Produces public reads `getPublishedPostBySlug`, `listPublishedPosts`, `getPageSeo`, `getPublicSettings`, `listPublicRedirects`, and admin reads with pagination.
- `getPageSeo(pageKey)` returns a stored record or `getDefaultPageSeo(pageKey)` and never throws on a public calculator request.

- [ ] **Step 1: Write failing validation and sanitization tests**

Cover valid drafts, required title/slug for publication, lowercase slug normalization, rejected `javascript:` canonicals, invalid redirect schemes, redirect self-loops, stripped `<script>`, stripped `onclick`, safe links, safe table markup, and allow-listed HTTPS embed hosts.

```ts
it("removes executable article markup", () => {
  expect(sanitizeArticleHtml('<p onclick="steal()">Hi</p><script>steal()</script>')).toBe("<p>Hi</p>");
});

it("rejects a redirect loop", () => {
  expect(() => redirectInputSchema.parse({ sourcePath: "/old", destination: "/old", statusCode: 308, enabled: true })).toThrow();
});
```

- [ ] **Step 2: Confirm the focused tests fail**

Run: `npm test -- lib/content/validation.test.ts lib/content/sanitize.test.ts lib/content/repository.test.ts`

Expected: FAIL because the modules are missing.

- [ ] **Step 3: Implement schemas, sanitizing allow-lists, and repository adapters**

Use dependency injection for repository tests so a rejected Supabase query can be asserted to return `getDefaultPageSeo(pageKey)`. Admin list reads return `{ items, total, page, pageSize }`. Public post queries always filter `status = published` and `published_at <= now()` even though RLS also enforces it.

- [ ] **Step 4: Run focused and full tests**

Run: `npm test -- lib/content/validation.test.ts lib/content/sanitize.test.ts lib/content/repository.test.ts`

Expected: PASS.

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit the content boundary**

```bash
git add lib/content lib/seo/defaults.ts
git commit -m "feat: add safe content repository"
```

### Task 4: Admin shell and overview

**Files:**
- Create: `app/admin/layout.tsx`
- Create: `app/admin/page.tsx`
- Create: `app/admin/admin.module.css`
- Create: `components/admin/AdminNav.tsx`
- Create: `components/admin/DataTable.tsx`
- Create: `components/admin/Pagination.tsx`
- Create: `components/admin/SeoIssueList.tsx`
- Create: `lib/seo/audit.ts`
- Create: `lib/seo/audit.test.ts`

**Interfaces:**
- Produces: `auditSeoDocument(input): SeoAuditIssue[]`, where each issue has `code`, `severity`, `message`, `field`, and optional `href`.
- Consumes owner session and repository aggregate reads.

- [ ] **Step 1: Write failing audit tests**

Test missing and duplicate titles/descriptions, canonical absence, missing alt text, skipped heading levels, missing H1, thin content, missing/broken internal links, orphan posts, incomplete schema, and noindex-plus-sitemap conflicts.

```ts
it("reports an indexing conflict", () => {
  const issues = auditSeoDocument(makeDocument({ noIndex: true, includeInSitemap: true }));
  expect(issues).toContainEqual(expect.objectContaining({ code: "indexing-conflict", field: "includeInSitemap" }));
});
```

- [ ] **Step 2: Confirm the audit test fails**

Run: `npm test -- lib/seo/audit.test.ts`

Expected: FAIL because the audit module is missing.

- [ ] **Step 3: Implement the audit engine and protected dashboard shell**

The layout calls `requireOwner()` before rendering. Navigation includes Overview, Posts, Pages and calculators, Categories and tags, Media, Redirects, SEO settings, and Account. The overview shows counts, scheduled items, recent edits, missing SEO fields, broken-link results, orphan content, and indexing conflicts. Reusable tables support URL search parameters `q`, `status`, `sort`, `page`.

- [ ] **Step 4: Verify audit and shell quality**

Run: `npm test -- lib/seo/audit.test.ts`

Expected: PASS.

Run: `npm run lint`

Expected: exit 0.

- [ ] **Step 5: Commit the admin shell**

```bash
git add app/admin components/admin lib/seo/audit.ts lib/seo/audit.test.ts
git commit -m "feat: add admin dashboard shell"
```

### Task 5: Post workflow, taxonomy, and authenticated mutations

**Files:**
- Create: `lib/content/mutations.ts`
- Create: `lib/content/mutations.test.ts`
- Create: `app/admin/posts/page.tsx`
- Create: `app/admin/posts/new/page.tsx`
- Create: `app/admin/posts/[id]/page.tsx`
- Create: `app/admin/taxonomies/page.tsx`
- Create: `components/admin/PostForm.tsx`
- Create: `components/admin/PostActions.tsx`
- Create: `components/admin/TaxonomyManager.tsx`
- Create: `app/api/admin/autosave/route.ts`
- Create: `app/api/admin/preview/route.ts`

**Interfaces:**
- Produces authenticated operations `createPost`, `savePost`, `publishPost`, `schedulePost`, `unpublishPost`, `archivePost`, `duplicatePost`, `saveTaxonomy`, and `deleteTaxonomy`.
- Each mutation returns `{ ok: true, data } | { ok: false, fieldErrors, formError }` and calls `requireOwner()` first.
- `savePost` creates a 308 redirect when an already-published slug changes and `createRedirect` is true.

- [ ] **Step 1: Write failing state-transition and slug tests**

```ts
it.each([
  ["draft", "published", true],
  ["draft", "scheduled", true],
  ["archived", "published", false],
])("allows %s to %s: %s", (from, to, allowed) => {
  expect(canTransition(from, to)).toBe(allowed);
});

it("creates a permanent redirect after a published slug changes", async () => {
  const result = await savePostAction(publishedPost, { slug: "new-slug", createRedirect: true }, dependencies);
  expect(dependencies.insertRedirect).toHaveBeenCalledWith(expect.objectContaining({ sourcePath: "/blog/old-slug", destination: "/blog/new-slug", statusCode: 308 }));
  expect(result.ok).toBe(true);
});
```

- [ ] **Step 2: Confirm mutation tests fail**

Run: `npm test -- lib/content/mutations.test.ts`

Expected: FAIL because transitions and mutations are missing.

- [ ] **Step 3: Implement post and taxonomy workflows**

Persist drafts independently from the last published revision. Publishing validates required title, slug, content, canonical policy, and publication timestamps while returning SEO warnings separately. Autosave accepts a version token and rejects stale writes with HTTP 409 while keeping the browser copy. Preview requires an owner session and sends `X-Robots-Tag: noindex, nofollow`.

- [ ] **Step 4: Verify workflows**

Run: `npm test -- lib/content/mutations.test.ts`

Expected: PASS.

Run: `npm run lint`

Expected: exit 0.

- [ ] **Step 5: Commit post management**

```bash
git add lib/content/mutations.ts lib/content/mutations.test.ts app/admin/posts app/admin/taxonomies components/admin/PostForm.tsx components/admin/PostActions.tsx components/admin/TaxonomyManager.tsx app/api/admin
git commit -m "feat: add post publishing workflow"
```

### Task 6: Rich-text editor and SEO editing panel

**Files:**
- Create: `components/admin/editor/RichTextEditor.tsx`
- Create: `components/admin/editor/EditorToolbar.tsx`
- Create: `components/admin/editor/SourceEditor.tsx`
- Create: `components/admin/editor/editor.module.css`
- Create: `components/admin/SeoPanel.tsx`
- Create: `components/admin/SearchPreview.tsx`
- Create: `components/admin/SocialPreview.tsx`
- Create: `components/admin/FaqEditor.tsx`
- Create: `components/admin/SchemaEditor.tsx`
- Create: `components/admin/PostForm.test.tsx`

**Interfaces:**
- `RichTextEditor` accepts `{ value: EditorDocument; html: string; onChange(document, html): void; onUploadRequest(): void }`.
- `SeoPanel` accepts `{ value: SeoRecord; auditIssues: SeoAuditIssue[]; onChange(next): void; pathname: string }`.
- Consumes the autosave and preview endpoints from Task 5.

- [ ] **Step 1: Write failing editor-form tests**

Use Testing Library to assert heading/list/link/table/image/source controls, title-to-slug behavior for new drafts only, description length guidance, index/follow and sitemap controls, schema fields, search/social previews, autosave status, and unsaved-change warning registration.

```tsx
it("shows SEO warnings without disabling publish", async () => {
  render(<PostForm initialPost={makePost({ seo: { title: "" } })} />);
  expect(screen.getByText(/SEO title is missing/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /publish/i })).toBeEnabled();
});
```

- [ ] **Step 2: Confirm editor tests fail**

Run: `npm test -- components/admin/PostForm.test.tsx`

Expected: FAIL because the editor components are missing.

- [ ] **Step 3: Implement the visual editor and SEO panel**

Configure Tiptap for paragraphs, H2-H6, bold, italic, underline, inline code, clear formatting, lists, links with target/rel controls, blockquotes, horizontal rules, tables, buttons, callouts, code blocks, images, and supported embeds. Keep the article H1 derived from the post title. Switching from source view must sanitize and parse the HTML before restoring visual mode. Autosave after 1.5 seconds of inactivity and show Saving, Saved, Failed, and Retry states.

- [ ] **Step 4: Run editor and regression tests**

Run: `npm test -- components/admin/PostForm.test.tsx lib/content/sanitize.test.ts lib/seo/audit.test.ts`

Expected: PASS.

Run: `npm run lint`

Expected: exit 0.

- [ ] **Step 5: Commit the editor**

```bash
git add components/admin/editor components/admin/SeoPanel.tsx components/admin/SearchPreview.tsx components/admin/SocialPreview.tsx components/admin/FaqEditor.tsx components/admin/SchemaEditor.tsx components/admin/PostForm.test.tsx components/admin/PostForm.tsx
git commit -m "feat: add article and SEO editor"
```

### Task 7: Media library with reference protection

**Files:**
- Create: `app/admin/media/page.tsx`
- Create: `app/api/admin/media/route.ts`
- Create: `app/api/admin/media/[id]/route.ts`
- Create: `components/admin/MediaLibrary.tsx`
- Create: `components/admin/MediaPicker.tsx`
- Create: `lib/content/media.ts`
- Create: `lib/content/media.test.ts`

**Interfaces:**
- Produces: `validateUpload(file)`, `createMediaRecord`, `replaceMedia`, `updateMediaText`, `getMediaReferences`, and `deleteMedia`.
- `deleteMedia(id)` returns `{ ok: false, references }` when any post, SEO record, or settings row still uses the asset.

- [ ] **Step 1: Write failing upload and reference tests**

Cover allowed JPEG/PNG/WebP/GIF files, rejected SVG/executable/oversized files, dimension and byte metadata, no record on failed storage upload, replacement URL updates, alt-text edits, and blocked referenced deletion.

```ts
it("blocks deletion while an image is referenced", async () => {
  const result = await deleteMedia("media-1", makeMediaDependencies({ references: [{ type: "post", id: "post-1", label: "Article" }] }));
  expect(result).toEqual({ ok: false, references: [{ type: "post", id: "post-1", label: "Article" }] });
});
```

- [ ] **Step 2: Confirm media tests fail**

Run: `npm test -- lib/content/media.test.ts`

Expected: FAIL because the media service is missing.

- [ ] **Step 3: Implement storage upload, search, editing, replacement, picking, and guarded deletion**

All routes call `requireOwner()`. Generate collision-safe storage paths, inspect MIME/type/size before upload, read actual image dimensions after upload, remove the uploaded object if inserting the database record fails, and remove the old object only after a successful replacement transaction.

- [ ] **Step 4: Verify media behavior**

Run: `npm test -- lib/content/media.test.ts`

Expected: PASS.

Run: `npm run lint`

Expected: exit 0.

- [ ] **Step 5: Commit media management**

```bash
git add app/admin/media app/api/admin/media components/admin/MediaLibrary.tsx components/admin/MediaPicker.tsx lib/content/media.ts lib/content/media.test.ts
git commit -m "feat: add protected media library"
```

### Task 8: Page SEO, settings, redirects, and account controls

**Files:**
- Create: `app/admin/pages/page.tsx`
- Create: `app/admin/pages/[pageKey]/page.tsx`
- Create: `app/admin/redirects/page.tsx`
- Create: `app/admin/settings/page.tsx`
- Create: `app/admin/account/page.tsx`
- Create: `components/admin/PageSeoForm.tsx`
- Create: `components/admin/RedirectManager.tsx`
- Create: `components/admin/SiteSettingsForm.tsx`
- Create: `lib/content/redirects.ts`
- Create: `lib/content/redirects.test.ts`

**Interfaces:**
- Produces authenticated `savePageSeo`, `saveSiteSettings`, `createRedirect`, `updateRedirect`, `deleteRedirect`, and `signOut` actions.
- Produces `resolveRedirect(pathname, redirects): { destination: string; permanent: boolean } | null` with multi-hop and loop detection.

- [ ] **Step 1: Write failing redirect tests**

```ts
it("rejects indirect loops", () => {
  const redirects = [
    { sourcePath: "/a", destination: "/b", statusCode: 308, enabled: true },
    { sourcePath: "/b", destination: "/a", statusCode: 308, enabled: true },
  ];
  expect(() => validateRedirectGraph(redirects)).toThrow(/loop/i);
});
```

Also cover 301/302/307/308 mapping, relative destinations, HTTPS external destinations, rejected schemes, disabled rules, and history insertion on updates.

- [ ] **Step 2: Confirm redirect tests fail**

Run: `npm test -- lib/content/redirects.test.ts`

Expected: FAIL because redirect resolution is missing.

- [ ] **Step 3: Implement page/settings forms, redirect management, and account sign-out**

The page editor may change headings, introduction, supporting sections, FAQs, related items, and SEO fields but renders calculator code as a locked, read-only label. Site settings include title templates, descriptions, social defaults, organization details, social profiles, verification tokens, and robots rules. Redirect saves validate the full enabled graph before writing and append history.

- [ ] **Step 4: Verify controls**

Run: `npm test -- lib/content/redirects.test.ts lib/content/validation.test.ts`

Expected: PASS.

Run: `npm run lint`

Expected: exit 0.

- [ ] **Step 5: Commit SEO administration**

```bash
git add app/admin/pages app/admin/redirects app/admin/settings app/admin/account components/admin/PageSeoForm.tsx components/admin/RedirectManager.tsx components/admin/SiteSettingsForm.tsx lib/content/redirects.ts lib/content/redirects.test.ts
git commit -m "feat: add page SEO and redirect controls"
```

### Task 9: Public blog routes and safe structured data

**Files:**
- Create: `app/blog/page.tsx`
- Create: `app/blog/[slug]/page.tsx`
- Create: `app/blog/category/[slug]/page.tsx`
- Create: `app/blog/tag/[slug]/page.tsx`
- Create: `app/blog/blog.module.css`
- Create: `components/content/ArticleBody.tsx`
- Create: `components/content/JsonLd.tsx`
- Create: `lib/seo/metadata.ts`
- Create: `lib/seo/schema.ts`
- Create: `lib/seo/metadata.test.ts`
- Create: `lib/seo/schema.test.ts`

**Interfaces:**
- Produces `toNextMetadata(seo, defaults, pathname): Metadata`.
- Produces `buildJsonLd({ type, content, settings }): Record<string, unknown>[]` using validated fields only.
- Consumes public repository reads from Task 3.

- [ ] **Step 1: Write failing metadata and JSON-LD tests**

Test canonical host normalization, title templates, robots flags, Open Graph/X fallbacks, Article/BlogPosting dates and author, breadcrumb lists, FAQ/HowTo required fields, no raw JSON injection, and omission of incomplete schemas.

```ts
it("forces the canonical production host", () => {
  const metadata = toNextMetadata({ canonical: "/blog/test" }, defaults, "/blog/test");
  expect(metadata.alternates?.canonical).toBe("https://www.solocalculator.com/blog/test");
});
```

- [ ] **Step 2: Confirm SEO generation tests fail**

Run: `npm test -- lib/seo/metadata.test.ts lib/seo/schema.test.ts`

Expected: FAIL because the generators are missing.

- [ ] **Step 3: Implement public indexes, article pages, taxonomy pages, metadata, and JSON-LD**

Unpublished or missing articles call `notFound()`. Render only `sanitized_html` through `ArticleBody`. Include related posts/calculators, canonical pagination URLs, accessible article structure, and empty-state copy. Add `generateMetadata` to every route and inject JSON-LD with escaped `<` characters.

- [ ] **Step 4: Verify public content**

Run: `npm test -- lib/seo/metadata.test.ts lib/seo/schema.test.ts lib/content/sanitize.test.ts`

Expected: PASS.

Run: `npm run build`

Expected: build completes and all blog routes compile.

- [ ] **Step 5: Commit the public blog**

```bash
git add app/blog components/content lib/seo/metadata.ts lib/seo/metadata.test.ts lib/seo/schema.ts lib/seo/schema.test.ts
git commit -m "feat: publish database-backed blog"
```

### Task 10: Database-backed calculator SEO with safe fallback

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`
- Modify: `app/[slug]/page.tsx`
- Modify: `app/[slug]/tool-page.module.css`
- Create: `components/content/ManagedSections.tsx`
- Create: `app/public-seo.test.tsx`

**Interfaces:**
- Consumes `getPageSeo`, `toNextMetadata`, `buildJsonLd`, and stable page keys.
- Produces calculator pages whose formulas still come exclusively from `ToolCalculator` and `lib/tools`.

- [ ] **Step 1: Write failing public fallback tests**

Mock a stored SEO record and assert metadata/content overrides render. Mock a rejected repository request and assert the existing catalog title, description, introduction, example, calculator component, and canonical URL still render.

- [ ] **Step 2: Confirm the page tests fail**

Run: `npm test -- app/public-seo.test.tsx`

Expected: FAIL because the routes do not read page SEO records.

- [ ] **Step 3: Connect homepage and calculator SEO without exposing executable editing**

Use `generateMetadata` on the homepage and tool pages. Render sanitized managed introduction/supporting sections and FAQs around the unchanged calculator component. Use `https://www.solocalculator.com` in `metadataBase`. Wrap database reads so public calculator pages fall back to `lib/tools/catalog.ts` values on missing configuration or query failure.

- [ ] **Step 4: Run page and calculator regressions**

Run: `npm test -- app/public-seo.test.tsx components/calculator/Calculator.test.tsx lib/tools/calculations.test.ts`

Expected: PASS.

Run: `npm run build`

Expected: build completes.

- [ ] **Step 5: Commit managed public SEO**

```bash
git add app/layout.tsx app/page.tsx 'app/[slug]/page.tsx' 'app/[slug]/tool-page.module.css' components/content/ManagedSections.tsx app/public-seo.test.tsx
git commit -m "feat: connect calculator page SEO"
```

### Task 11: Sitemap, RSS, robots, redirects, and revalidation

**Files:**
- Modify: `app/sitemap.ts`
- Modify: `app/robots.ts`
- Modify: `app/feed.xml/route.ts`
- Modify: `proxy.ts`
- Create: `app/api/admin/revalidate/route.ts`
- Create: `lib/seo/feeds.ts`
- Create: `lib/seo/feeds.test.ts`

**Interfaces:**
- Produces `buildSitemapEntries`, `buildRssXml`, and `buildRobotsRules`.
- Authenticated revalidation accepts affected canonical paths and always adds `/blog`, `/sitemap.xml`, and `/feed.xml`.

- [ ] **Step 1: Write failing endpoint-generation tests**

Assert the sitemap includes only published, indexable, sitemap-enabled records; RSS escapes XML and includes only published posts; robots always disallows `/admin/`, `/api/admin/`, and preview paths; and the canonical host is always `www.solocalculator.com`.

- [ ] **Step 2: Confirm feed tests fail**

Run: `npm test -- lib/seo/feeds.test.ts`

Expected: FAIL because feed helpers are missing.

- [ ] **Step 3: Implement dynamic discovery files, redirect resolution, and cache revalidation**

Fetch public records with safe empty/database-failure fallbacks. Resolve enabled redirects in `proxy.ts` before rendering public pages but after excluding internal Next assets and admin/API routes. Revalidation calls `revalidatePath` only after `requireOwner()` and validated path input.

- [ ] **Step 4: Verify SEO endpoints**

Run: `npm test -- lib/seo/feeds.test.ts lib/content/redirects.test.ts`

Expected: PASS.

Run: `npm run build`

Expected: build completes with sitemap, robots, and feed routes.

- [ ] **Step 5: Commit public SEO infrastructure**

```bash
git add app/sitemap.ts app/robots.ts app/feed.xml/route.ts app/api/admin/revalidate proxy.ts lib/seo/feeds.ts lib/seo/feeds.test.ts
git commit -m "feat: generate public SEO endpoints"
```

### Task 12: Set every calculator initial display to zero

**Files:**
- Modify: `lib/calculator/engine.ts`
- Modify: `lib/calculator/engine.test.ts`
- Modify: `components/calculator/Calculator.test.tsx`
- Modify: `components/tools/ToolCalculators.tsx`
- Modify: `lib/tools/calculations.test.ts`

**Interfaces:**
- Produces the visible initial value `0` for the homepage calculator, standard/scientific calculator routes, and every specialized calculator result.

- [ ] **Step 1: Add failing zero-default regression tests**

Assert `initialCalculatorState.display === "0"`, the main calculator status shows `0`, and each specialized calculator renders `0` before valid user input. Keep input placeholders descriptive but never use `1,248.50` as a result default.

- [ ] **Step 2: Confirm the regression tests fail**

Run: `npm test -- lib/calculator/engine.test.ts components/calculator/Calculator.test.tsx lib/tools/calculations.test.ts`

Expected: at least one assertion fails wherever a nonzero or blank initial result remains.

- [ ] **Step 3: Change initial calculator state and specialized result fallbacks to zero**

Do not alter formulas, rounding, memory, keyboard input, scientific functions, or validation behavior. Change only the initial/reset display and empty-result presentation needed by the tests.

- [ ] **Step 4: Run calculator and full regressions**

Run: `npm test -- lib/calculator/engine.test.ts components/calculator/Calculator.test.tsx lib/tools/calculations.test.ts`

Expected: PASS.

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit zero defaults**

```bash
git add lib/calculator/engine.ts lib/calculator/engine.test.ts components/calculator/Calculator.test.tsx components/tools/ToolCalculators.tsx lib/tools/calculations.test.ts
git commit -m "fix: start calculator displays at zero"
```

### Task 13: Browser tests and local release verification

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/admin-publish.spec.ts`
- Create: `e2e/public-seo.spec.ts`
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**
- Consumes a local Supabase instance or isolated test project plus `E2E_OWNER_EMAIL` and `E2E_OWNER_PASSWORD`.
- Produces repeatable scripts `test:e2e` and documented local/admin setup.

- [ ] **Step 1: Add browser tests for the complete owner workflow**

The suite must log in, reject a non-owner, create and autosave a draft, preview with noindex, upload an image and alt text, publish, verify public title/body/metadata/JSON-LD, edit calculator page SEO without changing calculation behavior, create a redirect, and verify sign-out blocks admin access.

- [ ] **Step 2: Run browser tests and confirm any unimplemented path fails**

Run: `npm run test:e2e`

Expected: FAIL until selectors, setup, and all workflow paths are wired correctly.

- [ ] **Step 3: Finish browser-test wiring and document setup**

Add stable accessible labels or `data-testid` only where role/name selectors cannot identify an element. Document required environment variables, migration/seed commands, owner creation, local start, test commands, storage limits, supported embeds, and production deployment steps. Do not include credentials.

- [ ] **Step 4: Run the complete local quality gate**

Run: `npm test`

Expected: all unit/component tests pass.

Run: `npm run test:e2e`

Expected: all browser tests pass.

Run: `npm run lint`

Expected: exit 0.

Run: `npm run build`

Expected: production build completes.

- [ ] **Step 5: Commit verified local delivery**

```bash
git add playwright.config.ts e2e package.json package-lock.json README.md
git commit -m "test: verify admin publishing workflow"
```

### Task 14: Production Supabase, Vercel, and domain verification

**Files:**
- Modify: `README.md` only if the live setup reveals a missing operational step.

**Interfaces:**
- Produces a migrated Supabase project, one verified owner account, linked Vercel environment variables, and a deployed build on `https://www.solocalculator.com`.

- [ ] **Step 1: Create or link the production Supabase project**

Apply `supabase/migrations/202609270001_content_admin.sql`, apply `supabase/seed.sql`, create the media bucket with public reads and owner-only writes, set `app.settings.owner_email`, create the one owner auth account, and confirm no public signup flow exists.

- [ ] **Step 2: Verify database policies before connecting production**

Using anon, non-owner, and owner sessions, verify published reads succeed, draft reads fail for anon/non-owner, owner writes succeed, non-owner writes fail, and referenced media deletion is rejected.

- [ ] **Step 3: Add Vercel environment variables and deploy**

Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `OWNER_EMAIL`, and server-only `SUPABASE_SERVICE_ROLE_KEY` for Production and Preview as required. Redeploy from the verified GitHub commit and confirm the deployment reports Ready.

- [ ] **Step 4: Run live browser verification**

On `https://www.solocalculator.com`, verify HTTPS, owner login, draft autosave, preview, media upload, publish, page SEO edit, redirect creation, article metadata, JSON-LD, sitemap, RSS, robots, homepage calculator input, and a specialized calculator. Confirm all calculator initial displays are `0` and `/admin` is blocked after sign-out.

- [ ] **Step 5: Record and commit any operational documentation correction**

If no correction is needed, do not create an empty commit. If needed:

```bash
git add README.md
git commit -m "docs: record production admin setup"
```

## Final verification gate

- [ ] Run `npm test` and record the passing test count.
- [ ] Run `npm run test:e2e` and record the passing browser-test count.
- [ ] Run `npm run lint` and confirm exit 0.
- [ ] Run `npm run build` and confirm exit 0.
- [ ] Inspect `git status --short`; only intentional files may remain.
- [ ] Verify the deployed Git commit matches the intended local commit.
- [ ] Verify `https://www.solocalculator.com`, `/blog`, `/sitemap.xml`, `/feed.xml`, `/robots.txt`, and one redirect with HTTP requests.
- [ ] Verify login, publish, public rendering, metadata, and calculator behavior through the production browser.
