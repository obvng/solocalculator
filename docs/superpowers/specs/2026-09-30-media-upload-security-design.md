# SoloCalculator media upload security design

## Objective

Harden the owner-only media upload path so an attacker cannot turn an uploaded file into executable code, stored cross-site scripting, a decompression attack, or a persistent backdoor.

This design covers uploads, replacements, storage, delivery, media metadata, and the surrounding admin controls. It does not claim that any internet service can be impossible to hack. Success means that uploads are treated as hostile, only rebuilt images are persisted, dangerous inputs fail closed, and the controls are verified with attack-focused tests.

## Current state

The existing application already has several useful controls:

- uploads require an authenticated owner session;
- the request size is limited to 10 MB;
- the browser-reported MIME type must be JPEG, PNG, WebP, or GIF;
- stored paths use a UUID rather than the complete original filename;
- Vercel Blob stores media outside the application filesystem;
- database constraints restrict recorded MIME types and require positive dimensions and byte sizes.

The current gap is content validation. `validateUpload()` trusts `File.type`, and `makeBlobPath()` derives the stored extension from the user-controlled filename. `image-size` reads dimensions but is not a security boundary and does not prove that the entire file is a safe, decodable image. The original bytes are uploaded unchanged.

## Threat model

The upload pipeline must reject or neutralize:

- PHP, JavaScript, HTML, shell scripts, executables, archives, and documents renamed with an image extension;
- MIME-type and extension mismatches;
- double extensions such as `photo.jpg.php`;
- SVG files with script, event handlers, external references, or XML entity payloads;
- image polyglots and valid images with executable data appended;
- malformed images intended to exploit weak parsers;
- decompression bombs with small file sizes but extreme pixel counts;
- animated files with excessive frames or processing cost;
- path traversal and control characters in filenames;
- duplicate or guessed storage paths;
- unauthenticated uploads, cross-site upload requests, and rapid repeated upload attempts;
- stale or orphaned blobs created when a database write fails.

## Accepted formats

Only these source formats are accepted:

- JPEG;
- PNG;
- WebP.

SVG, GIF, TIFF, BMP, ICO, HEIC, AVIF, PDF, archives, video, audio, and every unknown type are rejected. SVG and animated GIF are excluded because SoloCalculator does not need their extra capabilities and their parser and scripting surface is unnecessary.

The browser `accept` attribute remains a convenience only. Server validation is authoritative.

## Validation and sanitization pipeline

Uploads are processed in this order:

1. Require a valid owner session before reading the multipart body.
2. Reject requests whose declared body size exceeds the route limit when that information is available.
3. Read no more than 10 MB into memory. Reject empty or larger files.
4. Detect the format from magic bytes with a maintained binary signature library. Do not trust the original filename or `File.type`.
5. Require the detected type to be JPEG, PNG, or WebP.
6. Decode the complete image with a maintained image processor using fail-on-error behaviour.
7. Reject images above 40 megapixels, zero dimensions, dimensions above 12,000 pixels on either side, multiple pages, animation, or malformed/truncated data.
8. Apply EXIF orientation, remove all metadata, colour profiles, comments, and embedded thumbnails, and rebuild the pixels.
9. Re-encode into a server-selected safe output:
   - opaque images become JPEG;
   - images with transparency become PNG;
   - WebP input may become WebP only when the decoded output passes the same constraints.
10. Inspect the rebuilt output again to confirm its format, dimensions, single-page state, and byte size.
11. Generate a cryptographically random UUID pathname and choose the extension from the verified output type.
12. Upload only the rebuilt bytes to Vercel Blob with the verified `Content-Type`.
13. Save the verified format, dimensions, size, hash, storage path, and public URL in Neon.
14. Delete the new blob if the database write fails. For replacements, delete the old blob only after the new database record is committed.

The original bytes never enter Vercel Blob, the repository, `public/`, or another durable application directory.

## Storage and delivery

Published article images need public URLs for page rendering and search/social crawlers, so sanitized derivatives stay in the existing public Vercel Blob store. This is separate object storage, not an executable webroot.

Every object path uses a generated identifier, for example:

`media/2026-09-30/7fc8e7ad-8e64-4bde-92bd-08b2326f7b4b.jpg`

No user-controlled path segment or extension is retained. The original filename may be stored as escaped administrative metadata for identification, but it is never used in a URL or response header.

Vercel Blob supplies restrictive delivery headers including `Content-Security-Policy: default-src "none"`, `X-Frame-Options: DENY`, and `X-Content-Type-Options: nosniff`. Uploads set the exact verified image content type. Blob objects are treated as immutable; replacements create new paths.

Private Blob storage is not used for the sanitized public derivative because it would prevent direct indexing and add Function bandwidth costs. If SoloCalculator later accepts private documents or user files, that will require a separate private store and authenticated delivery route.

## Authentication and request controls

- Media `GET`, `POST`, `PUT`, `PATCH`, and `DELETE` routes require the owner session.
- Session cookies are `HttpOnly`, `Secure` in production, and `SameSite=Strict`. The current owner login is same-site and does not require cross-site cookie delivery.
- State-changing media routes reject cross-origin requests by checking `Origin` against the production origin and the active Vercel preview origin in non-production environments.
- Upload and replacement routes use an owner/IP rate limit with a small burst allowance.
- Unsupported methods return `405`.
- Responses use generic public errors. Server logs record an internal reason code without recording image bytes, session tokens, passwords, or Blob tokens.

Rate limiting should fail closed for uploads if the limiter is unavailable. Read-only admin listing can continue to rely on authentication and database limits.

## Database record and audit fields

The media record gains:

- `sha256` of the sanitized stored bytes;
- `detectedMimeType` or a renamed authoritative `mimeType` field;
- `processingVersion` so old files can be distinguished from hardened uploads;
- `rejectionReason` in security audit logs for rejected requests, never on successful media records.

The database continues to enforce an allowlist of JPEG, PNG, and WebP and positive byte/dimension checks. A maximum-dimension check is duplicated in application logic because database constraints cannot validate image contents.

## Existing media

Existing Blob objects were uploaded before content rebuilding was required. The deployment must not silently label them as sanitized.

An inventory script will:

- list existing media records;
- download each object through the authenticated Blob SDK or its stored URL;
- run the same decoder and limits;
- rebuild safe images to new immutable paths;
- update the database transactionally;
- preserve the old object until the new record is saved;
- quarantine or flag any object that fails validation rather than publishing it again.

The migration produces a report of processed, replaced, rejected, and failed records. It never deletes a rejected original automatically during the first run.

## Error handling

The API returns clear, non-sensitive errors for:

- unsupported file type;
- file too large;
- invalid or corrupt image;
- image dimensions or pixel count above the limit;
- animated or multi-page image;
- rate limit exceeded;
- storage or database failure.

No decoder stack trace, storage path, environment variable, Blob token, database error, or dependency version is returned to the browser.

Temporary buffers are released after each request. Processing is bounded by request duration, file bytes, dimensions, pixels, and page count.

## Security headers and script execution

The application will add or verify these headers on admin and public routes:

- `X-Content-Type-Options: nosniff`;
- a restrictive `Content-Security-Policy` compatible with Next.js, Google Analytics, AdSense when enabled, and trusted image origins;
- `frame-ancestors 'none'` for admin pages;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `Permissions-Policy` disabling unused browser capabilities;
- HSTS remains enabled at the production edge.

Uploaded media is never passed to a shell, imported as code, evaluated, included as HTML, or served from an application route with a user-supplied content type. SVG remains blocked even if the browser claims it is a harmless image.

## Dependency and secret review

The implementation includes a focused review of:

- production dependency advisories;
- whether the selected decoder and signature library are current and actively maintained;
- server-only handling of `BLOB_READ_WRITE_TOKEN`, database credentials, owner password hashes, and session secrets;
- accidental secret exposure through `NEXT_PUBLIC_*`, logs, source maps, error responses, or committed files;
- Vercel environment scoping for production and preview deployments.

Automated dependency scanning is useful but does not replace content validation or image rebuilding.

## Verification and attack tests

Unit and integration tests cover:

- valid JPEG, PNG, and WebP uploads;
- a PHP script renamed `.jpg`;
- HTML and JavaScript renamed as images;
- SVG with inline script renamed `.jpg`;
- ZIP and executable magic bytes with image names and MIME types;
- JPEG extension with PNG bytes and other mismatches;
- valid JPEG with a script or archive appended;
- double extensions and path traversal filenames;
- truncated and corrupt images;
- oversized byte length;
- excessive width, height, and pixel count;
- animated and multi-page files;
- EXIF and metadata removal;
- deterministic detection of the sanitized MIME type and extension;
- generated UUID paths containing no original filename text;
- unauthenticated and cross-origin requests;
- rate-limit enforcement;
- Blob cleanup after database failure;
- replacement ordering that does not lose the current image on failure.

Verification before production includes the full unit suite, lint, production build, upload tests in a Vercel preview, response-header inspection, Blob metadata inspection, and a manual check that public pages still display rebuilt images.

## Deployment sequence

1. Add tests and the isolated image-security module.
2. Add the decoder/signature dependencies and implement rebuilding.
3. Integrate `POST` and `PUT` routes.
4. Add database fields and migration.
5. Add request-origin checks, rate limits, security headers, and audit logging.
6. Deploy to a preview and run the malicious-file test set.
7. Inventory and rebuild existing media.
8. Merge only after preview verification and an explicit production approval.
9. Verify the production routes and headers without uploading attack samples to production.

## Out of scope

- Promising that the site can never be hacked.
- Accepting general documents, archives, SVG, or animated media.
- Building a public user-upload feature.
- Running a full ClamAV daemon inside Vercel Functions. If future uploads include documents or untrusted public users, use a separate quarantine store and external malware-scanning service.
- Unrelated redesign or SEO changes.

## References

- OWASP File Upload Cheat Sheet
- OWASP Input Validation Cheat Sheet
- Vercel Blob Security documentation
- Vercel Blob public and private storage documentation
