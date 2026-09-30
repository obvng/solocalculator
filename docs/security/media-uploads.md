# Media upload security runbook

SoloCalculator accepts JPEG, PNG, and WebP source files from the owner dashboard. The server identifies the bytes, decodes the complete image, rejects animation and oversized dimensions, strips metadata, rebuilds the pixels, and stores only the rebuilt output in Vercel Blob.

SVG, GIF, documents, archives, executables, audio, video, malformed images, and unknown formats are rejected. The original filename is display-only. It never supplies a storage path, extension, or response content type.

## Server-only configuration

These values stay on the server:

- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `DATABASE_URL_UNPOOLED`
- `OWNER_EMAIL`
- `OWNER_BOOTSTRAP_PASSWORD`
- `SESSION_SECRET`
- `UPLOAD_RATE_LIMIT_SECRET`
- `BLOB_READ_WRITE_TOKEN`
- `MEDIA_REBUILD_CONFIRM`

`UPLOAD_RATE_LIMIT_SECRET` and `SESSION_SECRET` must each contain at least 32 random bytes. `OWNER_BOOTSTRAP_PASSWORD` is temporary and must be removed after the owner record is created. `MEDIA_REBUILD_CONFIRM` is set only for the one controlled rebuild command, then removed.

Production and Preview must use separate Neon branches and Blob stores. Scope their Vercel variables separately. Never copy a secret into a `NEXT_PUBLIC_*` value, browser code, logs, source maps, screenshots, support messages, commits, or this runbook.

The application requires Node.js 22.12 or newer. The current `file-type` and `sanitize-html` releases enforce that floor.

## Dependency record

On 2026-09-30, the first production audit found high-severity advisories in Drizzle ORM and Undici through Vercel Blob, plus two `sanitize-html` XSS advisories. The branch upgraded these direct dependencies:

- `drizzle-orm` to 0.45.3;
- `@vercel/blob` to 2.8.0;
- `sanitize-html` to 2.17.7;
- `next` to 16.3.7.

The follow-up `npm audit --omit=dev` reported zero vulnerabilities. Registry checks identified `sharp` 0.35.5, `file-type` 22.1.1, and `sanitize-html` 2.17.7 as current release tags. `npm outdated` displayed stale lower “Latest” values for `file-type` and `sanitize-html`; direct `npm view ... dist-tags` checks confirmed the installed versions.

Run this before every security release:

```bash
npm audit --omit=dev
npm outdated sharp file-type @vercel/blob next drizzle-orm sanitize-html
git grep -nE '(BLOB_READ_WRITE_TOKEN|DATABASE_URL|SESSION_SECRET|OWNER_BOOTSTRAP_PASSWORD|UPLOAD_RATE_LIMIT_SECRET)=' -- ':!*.example' ':!docs/**'
git grep -n 'NEXT_PUBLIC_.*\(TOKEN\|SECRET\|DATABASE\|PASSWORD\)'
```

Do not suppress high or critical production findings. Patch them or stop the release.

## Preview deployment sequence

1. Create an isolated Neon branch and Vercel Blob store for Preview.
2. Add Preview-scoped database, Blob, session, owner, and rate-limit variables.
3. Apply `drizzle/0002_living_black_queen.sql` to the Preview database.
4. Deploy the security branch to an immutable Vercel Preview URL.
5. Sign in to `/admin` with the owner account.
6. Run the checks below. Record the deployment URL, commit, date, and result in the release record.
7. Run `npm run media:inventory` against Preview. Review every rejected and failed row.
8. Back up the Preview database. Set `MEDIA_REBUILD_CONFIRM=solocalculator-media-v1`, run `npm run media:rebuild` once, then remove the value.
9. Confirm rebuilt public pages and social images still load.

Do not apply the migration or rebuild to production until Preview evidence has been reviewed and production deployment has been approved.

## Preview checks

Upload one valid JPEG, transparent PNG, opaque PNG, and single-frame WebP. Each accepted object must have:

- a path shaped like `media/YYYY-MM-DD/<uuid>.jpg`, `.png`, or `.webp`;
- no original filename text in its path;
- the Blob `Content-Type` matching the rebuilt bytes;
- database `processing_version = 1`;
- a lowercase 64-character SHA-256 value;
- positive dimensions within 12,000 pixels per axis and 40 megapixels total;
- no EXIF, comments, embedded thumbnails, or other source metadata.

Submit each rejection sample through Preview only:

- PHP, HTML, JavaScript, ZIP, and ELF bytes named `.jpg`;
- SVG with inline script named `.jpg`;
- a double extension such as `photo.jpg.php`;
- `../` and control characters in the filename;
- truncated JPEG, corrupt PNG, and unknown bytes;
- a valid JPEG with script and ZIP bytes appended;
- a file above 10 MiB;
- an image wider or taller than 12,000 pixels;
- an image above 40 megapixels;
- animated WebP and multi-page input.

Every rejection must return only its generic client message. It must create no Blob and no media row. Logs may contain a fixed reason code, owner ID, and hashed IP. They must not contain source bytes, raw IP addresses, filenames, cookies, authorization headers, passwords, database URLs, or Blob tokens.

For replacement failure, force the database update to fail after the new Blob upload. Confirm the new Blob is removed and the current record and old Blob still work. Then force old-Blob deletion to fail after a successful update. Confirm the new record stays committed and an `orphan_cleanup_failed` event is recorded.

Make nine upload attempts within ten minutes from the same owner and IP. Attempts one through eight may proceed. The ninth must return 429. Disable the limiter database temporarily in Preview and confirm uploads fail closed with 503.

Inspect browser and HTTP behavior:

- the owner cookie is `HttpOnly`, `SameSite=Strict`, and `Secure` on HTTPS;
- a cross-site `Origin` receives 403 on POST, PUT, PATCH, and DELETE media requests;
- public and admin responses send `X-Content-Type-Options: nosniff`;
- admin pages send `frame-ancestors 'none'`, `X-Robots-Tag: noindex, nofollow`, and `Cache-Control: no-store`;
- public CSP permits the configured Google Analytics and AdSense hosts but does not permit arbitrary script hosts;
- accepted Blob objects send the verified image content type and Vercel Blob’s restrictive delivery headers;
- the public article, Open Graph image, and admin media thumbnail render normally.

## Incident response

If a secret appears in a response, log, screenshot, repository, build artifact, or client bundle:

1. Stop media uploads or roll back the affected deployment.
2. Rotate `BLOB_READ_WRITE_TOKEN`, all Neon connection strings, `SESSION_SECRET`, and `UPLOAD_RATE_LIMIT_SECRET`.
3. Delete active owner sessions from Neon and sign in again.
4. Remove the exposed value from Vercel Production and Preview environments and redeploy.
5. Review Blob writes, security events, Vercel logs, and database changes from the exposure window.
6. Inventory stored media again. Quarantine suspicious legacy objects without deleting evidence needed for review.

No internet service can be guaranteed impossible to hack. A release is ready only when its tests, build, Preview attack checks, storage inspection, and configuration review all pass.
