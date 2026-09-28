# Neon Admin Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace SoloCalculator's unconfigured Supabase backend with a working Neon database, private owner login, Vercel Blob media storage, and safe AdSense controls.

**Architecture:** All database and authentication work stays server-side. Drizzle queries Neon Postgres, a single-owner session module protects `/admin` and mutations, Vercel Blob stores images, and the public site reads only published revisions and public settings. The current routes and UI remain in place while Supabase adapters are replaced behind focused repository interfaces.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Neon Postgres, Drizzle ORM, `postgres`, Argon2id, signed HTTP-only sessions, Vercel Blob, Zod, Vitest, Playwright, Vercel.

**Spec:** `docs/superpowers/specs/2026-09-28-neon-admin-migration-design.md`

## Global Constraints

- Node.js 22 or newer.
- Only `radioboyng@gmail.com` may authenticate as an owner.
- Never commit or log the supplied password, its plain text, Neon credentials, Blob credentials, or session secret.
- Public URLs and the approved calculator design must not change.
- Calculator formulas remain in source control.
- Public content reads only current immutable published revisions.
- Admin and preview routes never load AdSense.
- AWORLDTIME and SOLOREEL must not be modified.
- Every production-code change follows RED, GREEN, REFACTOR.

---

### Task 1: Neon schema and typed database client

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`
- Create: `drizzle.config.ts`
- Create: `lib/db/schema.ts`
- Create: `lib/db/client.ts`
- Create: `lib/db/schema.test.ts`
- Create: `drizzle/0000_neon_content.sql`
- Modify: `supabase/seed.sql` only to move its data into the Drizzle migration, then delete it in Task 7

**Interfaces:**
- Produces: `db`, all Drizzle table exports, `SiteSettingsRow`, and a migration containing `owners`, `sessions`, content tables, immutable revisions, media, redirects, settings, and audit results.
- Consumes: existing SQL constraints and seeded page keys from `supabase/migrations/202609270001_content_admin.sql` and `supabase/seed.sql`.

- [ ] **Step 1: Write the failing schema contract test**

```ts
import { describe, expect, it } from "vitest";
import { owners, sessions, posts, postRevisions, siteSettings } from "./schema";

describe("Neon schema", () => {
  it("exports owner, session, content revision, and settings tables", () => {
    expect(owners).toBeDefined();
    expect(sessions).toBeDefined();
    expect(posts).toBeDefined();
    expect(postRevisions).toBeDefined();
    expect(siteSettings).toBeDefined();
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- lib/db/schema.test.ts`

Expected: FAIL because `lib/db/schema.ts` does not exist.

- [ ] **Step 3: Install pinned database dependencies**

Run: `npm install drizzle-orm@0.44.5 postgres@3.4.7 && npm install -D drizzle-kit@0.31.4`

Add scripts:

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate"
```

- [ ] **Step 4: Define the schema and connection**

`lib/db/client.ts` must export:

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not configured.");
const sql = postgres(connectionString, { prepare: false, max: 5 });
export const db = drizzle(sql);
```

Define typed tables matching the existing content fields. Add `adsense_publisher_id text`, `adsense_code text`, and `adsense_enabled boolean not null default false` to `site_settings`. Add foreign keys, uniqueness, status checks, timestamps, and a partial unique index allowing only one current revision per post.

- [ ] **Step 5: Generate and inspect the migration**

Run: `npm run db:generate`

Confirm the migration creates every table, seeds the singleton settings row, and seeds the existing calculator page keys without any Supabase RLS or `auth.jwt()` references.

- [ ] **Step 6: Run the schema test and full unit suite**

Run: `npm test -- lib/db/schema.test.ts && npm test`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .env.example drizzle.config.ts drizzle lib/db
git commit -m "feat: add Neon content schema"
```

---

### Task 2: Single-owner authentication and sessions

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `lib/auth/password.ts`
- Create: `lib/auth/password.test.ts`
- Create: `lib/auth/session.ts`
- Create: `lib/auth/session.test.ts`
- Modify: `lib/auth/owner.ts`
- Modify: `app/admin/(auth)/login/actions.ts`
- Modify: `app/admin/(dashboard)/actions.ts`
- Create: `scripts/bootstrap-owner.ts`

**Interfaces:**
- Produces: `hashOwnerPassword(password): Promise<string>`, `verifyOwnerPassword(hash, password): Promise<boolean>`, `createOwnerSession(ownerId): Promise<void>`, `getOwnerSession(): Promise<OwnerIdentity | null>`, `deleteOwnerSession(): Promise<void>`, and `requireOwner(): Promise<OwnerIdentity>`.
- Consumes: `db`, `owners`, and `sessions` from Task 1.

- [ ] **Step 1: Write failing password and session tests**

```ts
it("verifies the right password and rejects the wrong one", async () => {
  const hash = await hashOwnerPassword("test-password");
  expect(await verifyOwnerPassword(hash, "test-password")).toBe(true);
  expect(await verifyOwnerPassword(hash, "wrong-password")).toBe(false);
});

it("rejects an expired signed session", async () => {
  const token = await signSession({ ownerId: "owner-1", expiresAt: 1 });
  expect(await verifySession(token, 2)).toBeNull();
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm test -- lib/auth/password.test.ts lib/auth/session.test.ts`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Install pinned authentication dependencies**

Run: `npm install @node-rs/argon2@2.0.2 jose@6.1.0 tsx@4.20.6`

- [ ] **Step 4: Implement password hashing and signed sessions**

Use Argon2id with library defaults that include a random salt. Store only the hash. Generate a random opaque session token, store its SHA-256 digest in `sessions`, and put the opaque value in a `solocalculator_admin` cookie with `httpOnly`, `secure` in production, `sameSite: "lax"`, `path: "/"`, and a seven-day expiry. `SESSION_SECRET` must be at least 32 bytes.

- [ ] **Step 5: Replace Supabase login and sign-out actions**

Login must normalize the email, require it to equal `OWNER_EMAIL`, load the single owner row, verify the hash, create the session, and redirect to `/admin`. Any credential failure redirects to `/admin/login?error=credentials`. Sign-out deletes the database session and expires the cookie.

- [ ] **Step 6: Add the owner bootstrap command**

`scripts/bootstrap-owner.ts` reads `OWNER_EMAIL` and `OWNER_BOOTSTRAP_PASSWORD`, hashes the password, and inserts or updates the owner row. It must never print either value or the hash. Add:

```json
"owner:bootstrap": "tsx scripts/bootstrap-owner.ts"
```

- [ ] **Step 7: Verify GREEN**

Run: `npm test -- lib/auth/password.test.ts lib/auth/session.test.ts && npm test`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json lib/auth app/admin scripts .env.example
git commit -m "feat: add private Neon owner authentication"
```

---

### Task 3: Neon public content repository

**Files:**
- Modify: `lib/content/repository.ts`
- Modify: `lib/content/repository.test.ts`
- Create: `lib/content/mappers.ts`
- Create: `lib/content/mappers.test.ts`
- Modify: `app/blog/page.tsx`
- Modify: `app/blog/[slug]/page.tsx`
- Modify: `app/blog/category/[slug]/page.tsx`
- Modify: `app/blog/tag/[slug]/page.tsx`
- Modify: `app/sitemap.ts`
- Modify: `app/feed.xml/route.ts`
- Modify: `app/robots.ts`

**Interfaces:**
- Produces the existing public functions unchanged: `getPageSeo`, `getPublishedPostBySlug`, `listPublishedPosts`, `getPublicTaxonomy`, `listPublishedPostsForTaxonomy`, `listPublicRedirects`, `listPublicPageSeo`, and `getPublicSettings`.
- Consumes: `db` and schema exports from Task 1.

- [ ] **Step 1: Rewrite repository tests against a typed data-source boundary**

Add cases proving that draft rows and non-current revisions never appear, settings map AdSense fields, and database failures preserve code fallbacks.

```ts
it("returns only the current published revision", async () => {
  const result = await listPublishedPosts(fakeSource([
    revision({ isCurrent: false, title: "Old" }),
    revision({ isCurrent: true, title: "Current" }),
  ]));
  expect(result.map((post) => post.title)).toEqual(["Current"]);
});
```

- [ ] **Step 2: Run repository tests and verify RED**

Run: `npm test -- lib/content/repository.test.ts lib/content/mappers.test.ts`

Expected: FAIL because Neon mappers and query source do not exist.

- [ ] **Step 3: Implement Neon queries and mappers**

Replace Supabase calls with parameterized Drizzle queries. Keep public function signatures stable. Catch connection failures only at public fallback boundaries; do not hide validation or query-shape errors.

- [ ] **Step 4: Verify all public consumers build against the unchanged interface**

Run: `npm test -- lib/content/repository.test.ts lib/content/mappers.test.ts && npm run build`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/content app/blog app/sitemap.ts app/feed.xml app/robots.ts
git commit -m "feat: read public content from Neon"
```

---

### Task 4: Neon admin repositories and publishing transactions

**Files:**
- Create: `lib/admin/repository.ts`
- Create: `lib/admin/repository.test.ts`
- Modify: `app/admin/(dashboard)/page.tsx`
- Modify: `app/admin/(dashboard)/posts/page.tsx`
- Modify: `app/admin/(dashboard)/posts/[id]/page.tsx`
- Modify: `app/admin/(dashboard)/posts/actions.ts`
- Modify: `app/admin/(dashboard)/pages/page.tsx`
- Modify: `app/admin/(dashboard)/pages/[pageKey]/page.tsx`
- Modify: `app/admin/(dashboard)/taxonomies/page.tsx`
- Modify: `app/admin/(dashboard)/redirects/page.tsx`
- Modify: `app/admin/(dashboard)/settings/page.tsx`
- Modify: `app/admin/(dashboard)/actions.ts`

**Interfaces:**
- Produces: `adminRepository` methods for dashboard counts, posts, pages, taxonomies, redirects, settings, and transactional publishing.
- Consumes: `requireOwner`, `db`, schema exports, existing content types, validators, sanitizer, and redirect graph validation.

- [ ] **Step 1: Write failing transaction and mutation tests**

```ts
it("publishes by retiring the old current revision and inserting the next one", async () => {
  await repository.publishPost("post-1", owner);
  expect(transaction.updates).toContainEqual({ postId: "post-1", isCurrent: false });
  expect(transaction.insertedRevision?.revision).toBe(3);
  expect(transaction.insertedRevision?.isCurrent).toBe(true);
});
```

Add tests for optimistic version conflicts, redirect history, category/tag saves, page SEO saves, and settings saves.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- lib/admin/repository.test.ts`

Expected: FAIL because the repository does not exist.

- [ ] **Step 3: Implement the admin repository**

Use a database transaction for publishing. The transaction must lock the post row, check the submitted version, retire the current revision, insert the next immutable revision, update post status/version/timestamps, and commit atomically.

- [ ] **Step 4: Replace Supabase calls in pages and actions**

Keep current form actions and redirects stable. Call `requireOwner()` before each read or mutation. Preserve sanitization, validation, revalidation, and error query parameters.

- [ ] **Step 5: Verify GREEN**

Run: `npm test -- lib/admin/repository.test.ts lib/content/mutations.test.ts lib/content/redirects.test.ts && npm run build`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/admin app/admin
git commit -m "feat: move admin publishing to Neon"
```

---

### Task 5: Vercel Blob media library

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `lib/media/blob.ts`
- Create: `lib/media/blob.test.ts`
- Modify: `app/api/admin/media/route.ts`
- Modify: `app/api/admin/media/[id]/route.ts`
- Modify: `lib/content/media.test.ts`

**Interfaces:**
- Produces: `uploadMedia(file, metadata): Promise<MediaRecord>` and `removeMediaBlob(pathname): Promise<void>`.
- Consumes: `requireOwner`, `adminRepository`, `validateUpload`, and `deleteMedia`.

- [ ] **Step 1: Write failing Blob adapter tests**

Test that invalid MIME types and files over 10 MB are rejected before upload, successful uploads persist metadata, and referenced media cannot be deleted.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- lib/media/blob.test.ts lib/content/media.test.ts`

Expected: FAIL because the Blob adapter does not exist.

- [ ] **Step 3: Install the pinned Blob client and implement the adapter**

Run: `npm install @vercel/blob@2.0.0`

Upload with a generated path under `media/`, public access, and a random suffix. Never trust the browser-supplied MIME type alone; verify dimensions and supported image format before saving the metadata row.

- [ ] **Step 4: Replace media route Supabase calls**

All routes must call `requireOwner()` first. Database metadata writes happen only after Blob upload succeeds. If the metadata write fails, delete the newly uploaded Blob. If Blob deletion fails after metadata removal, return an error and preserve enough data for retry.

- [ ] **Step 5: Verify GREEN**

Run: `npm test -- lib/media/blob.test.ts lib/content/media.test.ts && npm run build`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json lib/media lib/content/media.test.ts app/api/admin/media
git commit -m "feat: store admin media in Vercel Blob"
```

---

### Task 6: Safe AdSense settings and rendering

**Files:**
- Modify: `lib/content/types.ts`
- Modify: `lib/content/validation.ts`
- Modify: `lib/content/validation.test.ts`
- Create: `lib/adsense/config.ts`
- Create: `lib/adsense/config.test.ts`
- Modify: `components/admin/SiteSettingsForm.tsx`
- Create: `components/admin/SiteSettingsForm.test.tsx`
- Modify: `app/admin/(dashboard)/actions.ts`
- Modify: `app/admin/(dashboard)/settings/page.tsx`
- Create: `components/AdSenseScript.tsx`
- Create: `components/AdSenseScript.test.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: `normalizeAdSenseInput({ publisherId, code, enabled }): AdSenseConfig` and `AdSenseScript({ config, pathname })`.
- Extends `SiteSettings` with `adsensePublisherId: string`, `adsenseCode: string`, and `adsenseEnabled: boolean`.

- [ ] **Step 1: Write failing validation and rendering tests**

```ts
it("extracts an official ca-pub id from the AdSense loader", () => {
  expect(normalizeAdSenseInput({
    publisherId: "",
    code: '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890" crossorigin="anonymous"></script>',
    enabled: true,
  }).publisherId).toBe("ca-pub-1234567890");
});

it("rejects unrelated script sources", () => {
  expect(() => normalizeAdSenseInput({ publisherId: "", code: '<script src="https://example.com/x.js"></script>', enabled: true })).toThrow();
});
```

Add component tests proving no script is emitted when disabled or on `/admin`, and exactly one official loader is emitted on a public path when enabled.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- lib/adsense/config.test.ts components/admin/SiteSettingsForm.test.tsx components/AdSenseScript.test.tsx`

Expected: FAIL because the AdSense modules and fields do not exist.

- [ ] **Step 3: Implement normalized AdSense configuration**

Accept either a direct `ca-pub-[0-9]+` value or the official loader tag. Reject inline script bodies, additional tags, event handlers, and non-Google hosts. Store the normalized publisher ID and original validated loader string. Rendering must use Next.js `Script` with `strategy="afterInteractive"` and a URL constructed from the normalized ID.

- [ ] **Step 4: Add the admin form fields and save path**

The form copy must say that enabling the field only loads Google code and does not guarantee AdSense approval. Saving invalid code returns `/admin/settings?error=adsense` without changing the existing settings row.

- [ ] **Step 5: Verify GREEN**

Run: `npm test -- lib/adsense/config.test.ts components/admin/SiteSettingsForm.test.tsx components/AdSenseScript.test.tsx lib/content/validation.test.ts && npm run build`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/adsense lib/content components/admin/SiteSettingsForm.tsx components/admin/SiteSettingsForm.test.tsx components/AdSenseScript.tsx components/AdSenseScript.test.tsx app/admin app/layout.tsx
git commit -m "feat: add safe AdSense settings"
```

---

### Task 7: Remove Supabase and complete request protection

**Files:**
- Modify: `proxy.ts`
- Create: `proxy.test.ts`
- Delete: `lib/supabase/server.ts`
- Delete: `lib/supabase/browser.ts`
- Delete: `lib/supabase/middleware.ts`
- Delete: `supabase/migrations/202609270001_content_admin.sql`
- Delete: `supabase/seed.sql`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`
- Modify: `README.md`

**Interfaces:**
- Consumes: `getOwnerSession()` and `listPublicRedirects()`.
- Produces: protected admin routing and database redirect handling without Supabase.

- [ ] **Step 1: Write failing proxy behavior tests**

Cover unauthenticated `/admin` redirect, authenticated `/admin/login` redirect, public pass-through, and enabled database redirect status codes.

- [ ] **Step 2: Run the proxy tests and verify RED**

Run: `npm test -- proxy.test.ts`

Expected: FAIL while proxy imports Supabase.

- [ ] **Step 3: Replace proxy logic and remove Supabase packages/files**

Keep the matcher. Validate the signed session without database work where possible, then let `requireOwner()` perform the authoritative database check in protected pages and actions. Redirect lookups use a short-lived server cache around Neon reads.

Run: `npm uninstall @supabase/ssr @supabase/supabase-js`

Set `.env.example` to:

```dotenv
DATABASE_URL=
DIRECT_DATABASE_URL=
OWNER_EMAIL=
OWNER_BOOTSTRAP_PASSWORD=
SESSION_SECRET=
BLOB_READ_WRITE_TOKEN=
```

- [ ] **Step 4: Update setup documentation**

Document Neon linking, migrations, owner bootstrap, Vercel Blob, preview isolation, secret handling, and production verification. Do not include the real owner password.

- [ ] **Step 5: Verify GREEN**

Run: `npm test -- proxy.test.ts && npm test && npm run lint && npm run build`

Expected: all commands PASS with no Supabase imports found by `rg -n "supabase" app components lib proxy.ts package.json`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: complete Neon backend migration"
```

---

### Task 8: Provision Neon and Blob, verify preview, and deploy

**Files:**
- Modify: `e2e/admin-publishing.spec.ts`
- Modify: `e2e/public-site.spec.ts`
- Modify: `playwright.config.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes the complete application from Tasks 1-7 and the user's existing Neon account.
- Produces a live owner account, production database, Blob store, verified preview, pull request, and verified production deployment.

- [ ] **Step 1: Extend the browser tests before provisioning**

Add assertions for login, rejected invalid credentials, post draft/publish, page SEO, media upload, AdSense disabled output, AdSense enabled output on public pages, sign-out, and calculator default `0`.

- [ ] **Step 2: Run the browser suite and verify RED against the unconfigured preview**

Run: `npm run test:e2e`

Expected: owner workflow fails or skips because Neon and Blob credentials are not configured.

- [ ] **Step 3: Link the existing Neon account through Vercel**

Create a dedicated `solocalculator` Neon project through the Vercel Marketplace, connect it only to the SoloCalculator Vercel project, and confirm Vercel adds the pooled and direct connection values. Create a SoloCalculator Vercel Blob store and connect its token to the same project.

- [ ] **Step 4: Add server-only production and preview secrets**

Set `OWNER_EMAIL`, a newly generated `SESSION_SECRET`, and temporary `OWNER_BOOTSTRAP_PASSWORD` without exposing their values in logs. Run `npm run db:migrate`, then `npm run owner:bootstrap`. Remove `OWNER_BOOTSTRAP_PASSWORD` from Vercel immediately after the owner row is created.

- [ ] **Step 5: Deploy and test a preview**

Push `codex/neon-admin`, open a pull request, wait for Vercel Ready, and run:

Export the preview URL and test credentials from the secure deployment environment, then run:

```bash
PLAYWRIGHT_BASE_URL="$VERCEL_PREVIEW_URL" E2E_OWNER_EMAIL="$OWNER_EMAIL" E2E_OWNER_PASSWORD="$E2E_OWNER_PASSWORD" npm run test:e2e
```

Expected: all owner and public tests PASS. Visually inspect `/`, `/admin/login`, `/admin`, `/admin/settings`, `/blog`, and one calculator page at desktop and mobile widths.

- [ ] **Step 6: Run the final local gate**

Run: `npm test && npm run lint && npm run build && git status --short`

Expected: tests, lint, and build PASS; only intentional files are changed.

- [ ] **Step 7: Commit final verification updates**

```bash
git add e2e playwright.config.ts README.md
git commit -m "test: verify Neon admin release"
```

- [ ] **Step 8: Merge only after explicit approval**

Attach the pull request, report the preview and test results, and request approval immediately before merging. After merge, verify production returns `200` for `/`, `/admin/login`, `/blog`, `/sitemap.xml`, `/feed.xml`, `/robots.txt`, and `/calculator`; sign in once; save and reload settings; then sign out.

---

## Completion criteria

- The owner can sign in at `/admin/login` with the configured email and password.
- Admin posts, pages, media, redirects, SEO settings, and AdSense settings persist in Neon or Blob.
- Public content uses immutable current revisions.
- The homepage calculator starts at `0`.
- Disabled AdSense emits no script; enabled valid settings emit one official loader on public pages only.
- No production Supabase imports, credentials, or dependencies remain.
- Unit tests, Playwright tests, lint, and production build pass.
- The Vercel preview is verified before merge and the custom domain is verified after merge.
