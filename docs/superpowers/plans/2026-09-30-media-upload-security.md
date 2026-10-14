# SoloCalculator media upload security implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace direct image uploads with a fail-closed pipeline that decodes and rebuilds approved images, stores only sanitized bytes, and blocks upload-based script execution and backdoors.

**Architecture:** A server-only image processor will identify bytes with `file-type`, decode them with `sharp`, enforce byte, dimension, pixel, page, and animation limits, strip metadata, re-encode the pixels, and return authoritative metadata. Thin route handlers will call shared owner/origin/rate-limit guards and a media service that owns Blob/database ordering and cleanup. Neon will store upload counters, security events, sanitized hashes, and processing versions; a separate script will rebuild legacy media without deleting rejected originals.

**Tech Stack:** Next.js 16 App Router, TypeScript, Vitest, Sharp, file-type, Drizzle ORM, Neon Postgres, Vercel Blob

**Spec:** `docs/superpowers/specs/2026-09-30-media-upload-security-design.md`

## Global constraints

- Accept source bytes only when detected as JPEG, PNG, or WebP. Reject SVG, GIF, documents, archives, executables, audio, video, and unknown data.
- Accept at most 10 MiB, 12,000 pixels on either axis, 40,000,000 total pixels, and one non-animated page.
- Never trust the browser MIME type, original filename, or extension for validation, storage paths, or response content types.
- Decode the complete source with fail-on-error behavior, apply EXIF orientation, strip metadata, and persist only re-encoded bytes.
- Generate the Blob pathname from a UUID and the verified output MIME type. Raw source bytes must never be written to Blob, `public/`, the repository, or another durable directory.
- Keep sanitized public derivatives in Vercel Blob. Do not turn public article images into authenticated Function responses.
- Require the owner session on every media method. Use `HttpOnly`, production `Secure`, and `SameSite=Strict` for the owner cookie.
- Reject cross-origin state changes and fail closed when upload rate limiting cannot reach Neon.
- Return generic client errors. Never return decoder details, tokens, database errors, stack traces, or storage internals.
- Preserve the current media record and Blob when replacement fails. Delete a newly uploaded Blob if its database write fails.
- Do not automatically delete rejected legacy objects during the first inventory run.
- Do not claim the site is impossible to hack. This plan addresses the defined upload and adjacent control paths.

## Review focus

- A valid JPEG followed by PHP, HTML, JavaScript, or ZIP bytes must be decoded and rebuilt without the appended bytes; the stored hash must match only the rebuilt image.
- A small compressed image that expands past 40 megapixels or 12,000 pixels on one axis must fail before Blob upload.
- A WebP with multiple pages or animation must fail even when its first frame looks valid.
- A database failure after Blob upload must remove the new Blob, while a replacement failure must leave the old Blob and record untouched.
- Missing, malformed, opaque, cross-site, or preview-domain `Origin` headers must follow the documented same-origin policy without locking out legitimate production or preview admin requests.

---

## File structure

- `lib/media/image-security.ts`: byte detection, full decode, limits, metadata removal, re-encoding, output verification, and SHA-256.
- `lib/media/image-security.test.ts`: generated safe fixtures and attack-focused processor tests.
- `lib/media/blob.ts`: upload sanitized buffers using verified paths and MIME types only.
- `lib/media/media-service.ts`: create/replace workflows and compensating Blob cleanup.
- `lib/media/media-service.test.ts`: storage/database ordering and failure tests.
- `lib/security/request-origin.ts`: same-origin validation for state-changing admin requests.
- `lib/security/upload-rate-limit.ts`: Neon-backed fixed-window upload limiter.
- `lib/security/security-audit.ts`: structured, redacted security-event writer.
- `lib/security/*.test.ts`: request, limiter, and log-redaction tests.
- `app/api/admin/media/route.ts`: authenticated listing and guarded create endpoint.
- `app/api/admin/media/[id]/route.ts`: authenticated metadata, replace, and delete endpoints.
- `lib/db/schema.ts`: sanitized media metadata, upload counter, and security event tables.
- `drizzle/0002_media_upload_security.sql`: deployable schema migration.
- `lib/content/types.ts`, `lib/content/mappers.ts`, `lib/content/validation.ts`: remove GIF and expose authoritative media fields.
- `lib/auth/session.ts`: strict owner cookie.
- `next.config.ts`: response security headers.
- `scripts/rebuild-media.ts`: dry-run-first inventory and legacy rebuild command.
- `scripts/rebuild-media.test.ts`: migration decision and failure-behavior tests.
- `docs/security/media-uploads.md`: operator runbook and preview/production verification record.

### Task 1: Build the hostile-image processor

**Files:**
- Create: `lib/media/image-security.ts`
- Create: `lib/media/image-security.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: `Uint8Array` source bytes supplied by a route or migration script.
- Produces: `sanitizeImage(input: Uint8Array): Promise<SanitizedImage>` and `ImageSecurityError`.
- `SanitizedImage` is `{ bytes: Uint8Array; mimeType: "image/jpeg" | "image/png" | "image/webp"; extension: "jpg" | "png" | "webp"; width: number; height: number; byteSize: number; sha256: string; processingVersion: 1 }`.

- [ ] **Step 1: Install direct, pinned processor dependencies**

Run: `npm install --save-exact sharp@0.34.4 file-type@21.0.0`

Expected: `package.json` and `package-lock.json` record direct dependencies. Confirm current non-deprecated releases before changing these exact versions if the registry has moved.

- [ ] **Step 2: Write failing tests for valid formats and authoritative detection**

Create fixtures in the test with Sharp, then assert JPEG, PNG, and WebP bytes succeed even when no filename or browser MIME is supplied:

```ts
const jpeg = await sharp({ create: { width: 4, height: 3, channels: 3, background: "#2468ff" } }).jpeg().toBuffer();
const result = await sanitizeImage(jpeg);
expect(result).toMatchObject({ mimeType: "image/jpeg", extension: "jpg", width: 4, height: 3, processingVersion: 1 });
expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
```

Add equivalent PNG transparency and WebP cases. Assert the PNG stays PNG when alpha is present and output `byteSize` equals `bytes.byteLength`.

- [ ] **Step 3: Run the focused test and confirm the missing module failure**

Run: `npm test -- lib/media/image-security.test.ts`

Expected: FAIL because `sanitizeImage` does not exist.

- [ ] **Step 4: Implement detection, bounded decode, rebuild, and output verification**

Use these exported constants and error codes:

```ts
export const MEDIA_MAX_BYTES = 10 * 1024 * 1024;
export const MEDIA_MAX_PIXELS = 40_000_000;
export const MEDIA_MAX_AXIS = 12_000;
export const MEDIA_PROCESSING_VERSION = 1;
export type ImageSecurityCode = "empty" | "too_large" | "unsupported" | "corrupt" | "dimensions" | "animated";
```

Reject the byte length before detection. Use `fileTypeFromBuffer`, allow only `jpg`, `png`, and `webp`, then call Sharp with `{ failOn: "error", animated: true, limitInputPixels: MEDIA_MAX_PIXELS }`. Read metadata and reject missing/zero dimensions, either axis over the limit, `pages !== 1`, or `pageHeight` that indicates stacked animation frames. Call `rotate()` to apply orientation. Use `removeAlpha().jpeg({ quality: 88, mozjpeg: true })` for opaque output and `png({ compressionLevel: 9 })` for alpha output; preserve WebP only with `webp({ quality: 88 })` when the decoded input was WebP and is not animated. Do not call `withMetadata()`.

Detect and inspect the rebuilt buffer again. Require its detected type, dimensions, page count, and byte length to match the returned metadata. Compute SHA-256 with `createHash("sha256")`.

- [ ] **Step 5: Add attack and boundary tests**

Test all of these as individual cases with explicit expected codes:

```ts
await expect(sanitizeImage(Buffer.from("<?php system($_GET.x); ?>"))).rejects.toMatchObject({ code: "unsupported" });
await expect(sanitizeImage(Buffer.from("<svg onload='alert(1)'></svg>"))).rejects.toMatchObject({ code: "unsupported" });
await expect(sanitizeImage(Buffer.concat([jpeg.subarray(0, 30)]))).rejects.toMatchObject({ code: "corrupt" });
await expect(sanitizeImage(new Uint8Array(MEDIA_MAX_BYTES + 1))).rejects.toMatchObject({ code: "too_large" });
```

Also cover empty bytes, HTML/JavaScript/ZIP/ELF headers, valid JPEG plus appended script and ZIP markers, metadata removal, a 12,001-pixel axis, 40,000,001 pixels, animated WebP, and malformed images. For appended data, assert neither marker occurs in `result.bytes`.

- [ ] **Step 6: Run processor tests, type checking, and lint**

Run: `npm test -- lib/media/image-security.test.ts`

Expected: PASS.

Run: `npx tsc --noEmit && npm run lint`

Expected: both exit 0.

- [ ] **Step 7: Commit the isolated processor**

```bash
git add package.json package-lock.json lib/media/image-security.ts lib/media/image-security.test.ts
git commit -m "feat: sanitize uploaded image bytes"
```

### Task 2: Make Blob storage accept only verified output

**Files:**
- Modify: `lib/media/blob.ts`
- Modify: `lib/media/blob.test.ts`

**Interfaces:**
- Consumes: `SanitizedImage` from Task 1.
- Produces: `makeBlobPath(extension, id?, now?)` and `putMediaBlob(image)`.

- [ ] **Step 1: Replace the filename-based path test with verified-extension tests**

```ts
expect(makeBlobPath("png", "fixed-id", new Date("2026-09-30T12:00:00Z"))).toBe("media/2026-09-30/fixed-id.png");
expect(() => makeBlobPath("php" as never)).toThrow("Unsupported sanitized extension");
```

Mock `@vercel/blob` and assert `put` receives the sanitized bytes, `access: "public"`, `addRandomSuffix: false`, and `contentType: image.mimeType`. Assert no original filename is accepted by the function signature.

- [ ] **Step 2: Run the test and confirm the old API fails**

Run: `npm test -- lib/media/blob.test.ts`

Expected: FAIL because `makeBlobPath` still extracts a user filename extension and `putMediaBlob` accepts a `File`.

- [ ] **Step 3: Implement the verified Blob API**

```ts
export function makeBlobPath(extension: SanitizedImage["extension"], id = crypto.randomUUID(), now = new Date()) {
  if (!(["jpg", "png", "webp"] as const).includes(extension)) throw new Error("Unsupported sanitized extension");
  return `media/${now.toISOString().slice(0, 10)}/${id}.${extension}`;
}

export async function putMediaBlob(image: SanitizedImage) {
  const pathname = makeBlobPath(image.extension);
  const blob = await put(pathname, image.bytes, { access: "public", addRandomSuffix: false, contentType: image.mimeType });
  return { pathname: blob.pathname, url: blob.url };
}
```

- [ ] **Step 4: Verify and commit**

Run: `npm test -- lib/media/blob.test.ts lib/media/image-security.test.ts`

Expected: PASS.

```bash
git add lib/media/blob.ts lib/media/blob.test.ts
git commit -m "fix: store only verified media output"
```

### Task 3: Add authoritative media fields and database controls

**Files:**
- Modify: `lib/db/schema.ts`
- Modify: `lib/db/schema.test.ts`
- Modify: `lib/content/types.ts`
- Modify: `lib/content/mappers.ts`
- Modify: `lib/content/mappers.test.ts`
- Modify: `lib/content/validation.ts`
- Modify: `lib/content/validation.test.ts`
- Create: `drizzle/0002_media_upload_security.sql`
- Modify: `drizzle/meta/_journal.json`
- Create: `drizzle/meta/0002_snapshot.json`

**Interfaces:**
- Consumes: sanitized MIME, hash, processing version, dimensions, and byte size.
- Produces: media records that can distinguish legacy rows (`processingVersion = 0`) from rebuilt rows (`processingVersion = 1`).

- [ ] **Step 1: Write failing schema, mapper, and validation tests**

Assert media permits only JPEG, PNG, and WebP; maps `sha256` and `processingVersion`; rejects GIF; limits width/height to 12,000 and byte size to 10 MiB; and validates a lowercase 64-character SHA-256 for processed records.

```ts
expect(() => mediaInputSchema.parse({ ...validMedia, mimeType: "image/gif" })).toThrow();
expect(mapMedia({ ...row, sha256: "a".repeat(64), processing_version: 1 })).toMatchObject({ sha256: "a".repeat(64), processingVersion: 1 });
```

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `npm test -- lib/db/schema.test.ts lib/content/mappers.test.ts lib/content/validation.test.ts`

Expected: FAIL on the new fields and GIF restriction.

- [ ] **Step 3: Update application schema and types**

Add `sha256: text("sha256")` nullable for legacy rows and `processingVersion: integer("processing_version").notNull().default(0)`. Change MIME checks/types to the three allowed values. Add checks for `width <= 12000`, `height <= 12000`, `width * height <= 40000000`, `byte_size <= 10485760`, processing version in `(0,1)`, and SHA-256 presence/format whenever processing version is 1.

- [ ] **Step 4: Generate and inspect the migration**

Run: `npm run db:generate`

Expected: Drizzle creates `0002_media_upload_security.sql` and matching metadata. Inspect the SQL to ensure it drops the old MIME check before adding the new one and does not mark legacy rows as processed.

- [ ] **Step 5: Add upload-counter and security-event tables**

Add:

```ts
export const uploadRateLimits = pgTable("upload_rate_limits", {
  key: text("key").primaryKey(),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
  count: integer("count").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [check("upload_rate_limit_count_check", sql`${table.count} > 0`)]);

export const securityEvents = pgTable("security_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").references(() => owners.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(),
  reasonCode: text("reason_code").notNull(),
  ipHash: text("ip_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

Regenerate the migration if needed and add schema-contract assertions for both tables.

- [ ] **Step 6: Verify migration and contracts**

Run: `npm test -- lib/db/schema.test.ts lib/content/schema-contract.test.ts lib/content/mappers.test.ts lib/content/validation.test.ts`

Expected: PASS.

Run: `npx drizzle-kit check`

Expected: schema and migration metadata are consistent.

- [ ] **Step 7: Commit database controls**

```bash
git add lib/db/schema.ts lib/db/schema.test.ts lib/content/types.ts lib/content/mappers.ts lib/content/mappers.test.ts lib/content/validation.ts lib/content/validation.test.ts lib/content/schema-contract.test.ts drizzle
git commit -m "feat: record sanitized media metadata"
```

### Task 4: Add same-origin, rate-limit, and redacted audit controls

**Files:**
- Create: `lib/security/request-origin.ts`
- Create: `lib/security/request-origin.test.ts`
- Create: `lib/security/upload-rate-limit.ts`
- Create: `lib/security/upload-rate-limit.test.ts`
- Create: `lib/security/security-audit.ts`
- Create: `lib/security/security-audit.test.ts`
- Modify: `lib/auth/session.ts`
- Modify: `lib/auth/session.test.ts`

**Interfaces:**
- Consumes: authenticated owner ID, `Request`, forwarded IP headers, and Neon.
- Produces: `assertTrustedOrigin(request)`, `consumeUploadAllowance({ ownerId, request })`, and `recordSecurityEvent(event)`.

- [ ] **Step 1: Write origin-policy tests**

Accept `https://www.solocalculator.com` and `https://solocalculator.com` in production. Accept the exact request URL origin and configured `VERCEL_URL`/`VERCEL_PROJECT_PRODUCTION_URL` origins in preview/development. Reject cross-site origins, `null`, malformed values, and missing Origin on state-changing browser requests. Permit missing Origin only when `Sec-Fetch-Site` is absent and an explicit internal migration caller bypasses the route entirely.

- [ ] **Step 2: Implement fail-closed origin checks**

Return a typed `RequestSecurityError` with status 403 and public message `Request origin was rejected.`. Compare parsed origins exactly, including scheme and host; never use suffix or substring matching.

- [ ] **Step 3: Write and implement atomic limiter tests**

Define a 10-minute window and 8 upload/replacement attempts per owner/IP key. Hash `ownerId + normalizedIp` with HMAC-SHA-256 using `UPLOAD_RATE_LIMIT_SECRET` or `SESSION_SECRET`; do not store a raw IP. Use one `INSERT ... ON CONFLICT ... DO UPDATE` statement that resets expired windows and increments active ones, returning the count. Treat missing secrets, database errors, and count above 8 as denial for uploads.

Mock the database executor to cover first attempt, eighth allowed, ninth denied, window reset, IPv4/IPv6 extraction, forged extra forwarding values, and database failure.

- [ ] **Step 4: Write and implement redacted audit tests**

Allow only fixed event types and reason codes. Store owner ID, reason, event type, and hashed IP. Test that serialized inserts never contain source bytes, filenames, cookies, authorization headers, passwords, Blob tokens, database URLs, or raw IPs.

- [ ] **Step 5: Make owner cookies strict**

Extract and test `ownerCookieOptions(expiresAt)` so creation and deletion both use `httpOnly: true`, `sameSite: "strict"`, `path: "/"`, and production `secure: true`.

- [ ] **Step 6: Run security helper tests**

Run: `npm test -- lib/security lib/auth/session.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit request controls**

```bash
git add lib/security lib/auth/session.ts lib/auth/session.test.ts
git commit -m "feat: guard media upload requests"
```

### Task 5: Centralize safe create and replacement workflows

**Files:**
- Create: `lib/media/media-service.ts`
- Create: `lib/media/media-service.test.ts`
- Modify: `lib/content/media.ts`
- Modify: `lib/content/media.test.ts`

**Interfaces:**
- Consumes: raw bytes, original filename as display-only metadata, alt/caption text, current record for replacement, and injected Blob/database dependencies.
- Produces: `createSanitizedMedia(input, deps)` and `replaceSanitizedMedia(input, deps)`.

- [ ] **Step 1: Write failing create-workflow tests**

Assert this order: sanitize, Blob put, database insert. Assert the inserted row uses only sanitized MIME, dimensions, bytes, SHA-256, and processing version. Use `basename(file.name).replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 255)` only for `originalFilename` display metadata.

Test a database insert failure and assert the new Blob is deleted. Test a Blob failure and assert no database call occurs.

- [ ] **Step 2: Write failing replacement-workflow tests**

Assert this order: find current row, sanitize, put new Blob, update record, delete old Blob. On sanitize, put, or database failure, assert the current row and old Blob remain. If old-Blob deletion fails after the record commits, return success and record an `orphan_cleanup_failed` event.

- [ ] **Step 3: Implement both workflows with injected dependencies**

Use an interface that keeps external effects mockable:

```ts
export interface MediaServiceDependencies {
  sanitize(bytes: Uint8Array): Promise<SanitizedImage>;
  put(image: SanitizedImage): Promise<{ pathname: string; url: string }>;
  remove(pathname: string): Promise<void>;
  insert(values: NewMediaValues): Promise<unknown>;
  update(id: string, values: NewMediaValues): Promise<unknown | null>;
  find(id: string): Promise<{ storagePath: string } | null>;
  audit(reasonCode: string): Promise<void>;
}
```

Cap alt text at 500 characters and caption at 1,000 before database calls. Map `ImageSecurityError` codes to the spec's generic public messages in one function.

- [ ] **Step 4: Remove browser-MIME validation from content helpers**

Delete `validateUpload` and the GIF allowlist from `lib/content/media.ts`. Keep the byte-size constant exported from `image-security.ts`. Preserve and retest reference-aware deletion.

- [ ] **Step 5: Verify workflows**

Run: `npm test -- lib/media/media-service.test.ts lib/content/media.test.ts`

Expected: PASS, including both Review Focus storage-order cases.

- [ ] **Step 6: Commit service orchestration**

```bash
git add lib/media/media-service.ts lib/media/media-service.test.ts lib/content/media.ts lib/content/media.test.ts
git commit -m "feat: enforce safe media storage ordering"
```

### Task 6: Replace route upload logic and cover HTTP behavior

**Files:**
- Modify: `app/api/admin/media/route.ts`
- Modify: `app/api/admin/media/[id]/route.ts`
- Create: `app/api/admin/media/route.test.ts`
- Create: `app/api/admin/media/[id]/route.test.ts`

**Interfaces:**
- Consumes: Tasks 1–5 helpers and authenticated `OwnerIdentity` returned by `requireOwner()`.
- Produces: guarded media HTTP endpoints with stable status codes and generic JSON errors.

- [ ] **Step 1: Write POST route tests**

Mock owner, origin, limiter, audit, media service, and database modules. Test: owner check runs before `formData`; declared `Content-Length > 10 MiB` returns 413 before body parsing; absent file returns 400; cross-origin returns 403; exhausted/unavailable limiter returns 429/503; safe upload returns 201; image errors return their mapped 400/413 response; storage failure returns 500 without internals.

- [ ] **Step 2: Write PUT/PATCH/DELETE and GET route tests**

Require owner on every method. PUT gets the same origin, length, limiter, and service controls as POST. PATCH and DELETE require trusted origin but do not consume image-processing allowance. GET remains owner-only. Assert unsupported exported methods are absent so Next returns 405.

- [ ] **Step 3: Implement a bounded body gate and shared error response**

Check `Content-Length` when present, then read `File.arrayBuffer()` once. Enforce the actual byte length again through `sanitizeImage`. Do not import `image-size`. Do not pass `File`, its `type`, or its name into Blob storage.

- [ ] **Step 4: Wire routes to service and security events**

Authenticate first, then origin, limiter, multipart parsing, and media service. Record fixed rejection codes without bytes or secrets. Keep client messages from the spec and use `Cache-Control: no-store` on admin API responses.

- [ ] **Step 5: Run route and regression tests**

Run: `npm test -- app/api/admin/media lib/media lib/security lib/content/media.test.ts`

Expected: PASS.

Run: `rg -n "image-size|file\.type|putMediaBlob\(file|image/gif" app/api/admin/media lib/media lib/content`

Expected: no unsafe upload-path matches.

- [ ] **Step 6: Commit hardened routes**

```bash
git add app/api/admin/media lib/media lib/security
git commit -m "fix: harden admin media endpoints"
```

### Task 7: Add browser security headers without breaking analytics or ads

**Files:**
- Modify: `next.config.ts`
- Create: `lib/security/headers.ts`
- Create: `lib/security/headers.test.ts`

**Interfaces:**
- Consumes: route class (`public` or `admin`) and the current Google Analytics/AdSense host requirements.
- Produces: deterministic Next.js header configuration.

- [ ] **Step 1: Write failing header-policy tests**

Assert every route receives `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a Permissions Policy disabling camera, microphone, geolocation, payment, USB, and browsing topics. Assert admin routes also receive `X-Robots-Tag: noindex, nofollow`, `Cache-Control: no-store`, and CSP `frame-ancestors 'none'`.

Assert CSP permits only required origins: self, Vercel Blob HTTPS images, `www.googletagmanager.com`, `www.google-analytics.com`, `*.google-analytics.com`, `pagead2.googlesyndication.com`, and required Google ad frame/connect hosts. It must exclude `object-src`, plugins, and arbitrary `*` script sources.

- [ ] **Step 2: Implement named policies and export Next header entries**

Build one public CSP and one stricter admin CSP. Set `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, and `frame-ancestors 'none'` on admin. Keep required Next.js inline/bootstrap compatibility explicit and documented; do not add `data:` to `script-src` or allow Blob URLs as scripts.

- [ ] **Step 3: Connect `next.config.ts` and verify tests**

```ts
const nextConfig: NextConfig = {
  agentRules: false,
  async headers() { return securityHeaderEntries; },
};
```

Run: `npm test -- lib/security/headers.test.ts`

Expected: PASS.

- [ ] **Step 4: Build and inspect actual headers locally**

Run: `npm run build`

Expected: production build exits 0.

Start the built app on a non-production port, then inspect `/`, `/admin`, and `/api/admin/media` with `curl -I`. Confirm the expected header sets and no duplicate contradictory CSP.

- [ ] **Step 5: Commit response headers**

```bash
git add next.config.ts lib/security/headers.ts lib/security/headers.test.ts
git commit -m "feat: add application security headers"
```

### Task 8: Build the dry-run-first legacy media rebuilder

**Files:**
- Create: `scripts/rebuild-media.ts`
- Create: `scripts/rebuild-media.test.ts`
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**
- Consumes: existing media rows and public Blob URLs, using the same sanitizer and Blob API as live uploads.
- Produces: JSON report `{ scanned, safe, replaced, rejected, failed, orphanCleanupFailures, entries }` and optional transactional row replacements.

- [ ] **Step 1: Write migration decision tests**

Test legacy version 0 processing, already-version-1 skip, decode rejection, fetch failure, sanitized upload failure, database update failure with new-Blob cleanup, successful update followed by old-Blob cleanup, and old cleanup failure reporting. Assert rejected originals are never deleted.

- [ ] **Step 2: Implement reusable row processing**

Export `rebuildMediaRow(row, deps, mode)` where mode is `"dry-run" | "apply"`. Fetch with a 10 MiB streaming cap rather than unbounded `arrayBuffer()`. Sanitize with Task 1. In dry-run, report the intended output without upload or database mutation. In apply mode, use the same replacement ordering as Task 5.

- [ ] **Step 3: Implement guarded command entry point**

Default to dry-run. Require `--apply` plus `MEDIA_REBUILD_CONFIRM=solocalculator-media-v1` for mutation. Print only IDs, status, reason codes, and counts. Do not print URLs containing tokens, filenames, raw IPs, credentials, or source bytes.

Add scripts:

```json
"media:inventory": "tsx scripts/rebuild-media.ts",
"media:rebuild": "tsx scripts/rebuild-media.ts --apply"
```

- [ ] **Step 4: Verify script behavior without production mutation**

Run: `npm test -- scripts/rebuild-media.test.ts`

Expected: PASS.

Run: `npm run media:rebuild`

Expected: exits non-zero and explains that the confirmation environment value is missing.

- [ ] **Step 5: Document the safe operator sequence**

In `README.md`, document: migrate DB, deploy preview, run inventory, inspect report, back up Neon, run apply once with confirmation, inspect updated records/Blob metadata, then remove rejected legacy media only after manual review.

- [ ] **Step 6: Commit legacy migration tooling**

```bash
git add scripts/rebuild-media.ts scripts/rebuild-media.test.ts package.json package-lock.json README.md
git commit -m "feat: rebuild legacy media safely"
```

### Task 9: Audit dependencies, secrets, and production configuration

**Files:**
- Create: `docs/security/media-uploads.md`
- Modify: `.env.example`
- Modify: `.gitignore` if secret patterns are missing

**Interfaces:**
- Consumes: repository dependency graph, tracked files, and documented Vercel variable names.
- Produces: an evidence-based operator checklist without secret values.

- [ ] **Step 1: Run production dependency checks**

Run: `npm audit --omit=dev`

Expected: no unresolved high or critical production advisory. Record package names and remediation in the runbook if the result is non-zero; do not suppress findings.

Run: `npm outdated sharp file-type @vercel/blob next`

Expected: review current versions and record why any outdated direct security dependency is retained.

- [ ] **Step 2: Scan tracked source for secret exposure**

Run: `git grep -nE '(BLOB_READ_WRITE_TOKEN|DATABASE_URL|SESSION_SECRET|OWNER_BOOTSTRAP_PASSWORD|UPLOAD_RATE_LIMIT_SECRET)=' -- ':!*.example' ':!docs/**'`

Expected: no committed assignments.

Run: `git grep -n 'NEXT_PUBLIC_.*\(TOKEN\|SECRET\|DATABASE\|PASSWORD\)'`

Expected: no matches.

- [ ] **Step 3: Update environment documentation**

List variable names only. State that Blob, database, session, password, and rate-limit secrets are server-only; production and preview values must be scoped separately; `UPLOAD_RATE_LIMIT_SECRET` must be at least 32 random bytes; and no value belongs in logs, client bundles, screenshots, or commits.

- [ ] **Step 4: Write the verification runbook**

Document exact preview checks for upload formats, rejected attack samples, replacement failure, rate limiting, cookie flags, CSP/nosniff, Blob content type, UUID path, SHA-256, processing version, and public image rendering. Include an incident step to rotate Blob/database/session credentials if exposure is suspected.

- [ ] **Step 5: Commit configuration documentation**

```bash
git add docs/security/media-uploads.md .env.example .gitignore
git commit -m "docs: add media security operations runbook"
```

### Task 10: Complete local and preview verification

**Files:**
- Modify: `docs/security/media-uploads.md`

**Interfaces:**
- Consumes: the full implementation and a Vercel preview connected to a non-production Neon branch/store.
- Produces: dated test evidence and a release decision. No production merge occurs without explicit approval.

- [ ] **Step 1: Run the complete local gate**

Run: `npm test`

Expected: all tests pass.

Run: `npm run lint && npx tsc --noEmit && npm run build`

Expected: all commands exit 0.

- [ ] **Step 2: Review the final diff for unsafe remnants**

Run: `git diff origin/main...HEAD --check`

Expected: no whitespace errors.

Run: `rg -n "image/gif|image/svg|file\.type|filename\.split|put\([^,]+,\s*file|unsafe-eval|NEXT_PUBLIC_.*(TOKEN|SECRET|DATABASE|PASSWORD)" app lib scripts next.config.ts`

Expected: no unsafe upload or secret pattern. Any intentional CSP compatibility match must be reviewed and explained in the runbook.

- [ ] **Step 3: Deploy to an isolated Vercel preview**

Apply `0002_media_upload_security.sql` only to the preview Neon branch. Set preview-scoped server secrets. Deploy this branch and record the immutable preview URL and deployment ID in the runbook.

- [ ] **Step 4: Run preview attack tests**

Through the authenticated admin UI, upload valid JPEG/PNG/WebP. Then submit PHP, HTML, JavaScript, scripted SVG, ZIP, ELF, double-extension, traversal-name, corrupt, oversized, excessive-dimension, animated, and appended-payload samples. Expected: valid images render; malicious or over-limit input receives only the documented generic error; no rejected Blob or media row exists.

- [ ] **Step 5: Inspect stored output and request controls**

For each accepted sample, confirm UUID-only path, exact `Content-Type`, `X-Content-Type-Options: nosniff`, changed hash after metadata/appended-data removal, processing version 1, and correct dimensions. Confirm cookie `SameSite=Strict`, cross-origin rejection, ninth-attempt limiting, and no secrets/stack traces in responses or logs.

- [ ] **Step 6: Run legacy inventory in preview**

Run the inventory without `--apply`, inspect the JSON report, then apply only after confirming the preview database and store are disposable or backed up. Confirm rejected originals remain and successful rows point to rebuilt immutable paths.

- [ ] **Step 7: Record evidence and request production approval**

Add the date, commands, results, preview URL, rejected sample count, rebuilt sample count, header evidence, known residual risks, and any failed checks to `docs/security/media-uploads.md`.

Do not merge, migrate production Neon, rebuild production media, or upload attack samples to production until the user gives explicit production approval.

- [ ] **Step 8: Commit verification evidence**

```bash
git add docs/security/media-uploads.md
git commit -m "test: record media security verification"
```
