# SoloCalculator Neon admin migration

## Goal

Replace the unconfigured Supabase backend with a live Neon-backed admin system without changing SoloCalculator's public URLs or approved visual design. The result must give one owner a working private login, persistent blog and SEO data, image uploads, redirects, and AdSense controls.

## Scope

The migration covers the existing admin and public-content system:

- owner authentication and sessions
- posts, revisions, categories, tags, page SEO, redirects, site settings, and SEO audit records
- public blog, metadata, sitemap, RSS, robots rules, and database redirects
- media uploads and deletion checks
- AdSense configuration

Calculator formulas remain in source control. AWORLDTIME and SOLOREEL are not changed.

## Architecture

### Database

Neon Postgres stores all structured content. The existing PostgreSQL schema is retained where practical, including immutable published revisions. Supabase-specific functions, RLS helpers, grants, and storage policies are removed or replaced with server-side authorization.

The browser never connects directly to Neon. Server components, route handlers, and server actions access the database through a server-only connection string. Every admin mutation calls the owner-session guard before reading or writing private data.

Drizzle provides typed queries and checked migrations. A pooled Neon connection is used at runtime, while migrations use the direct connection supplied by Neon.

### Authentication

SoloCalculator keeps a single-owner email and password login. There is no public signup route.

The owner record stores the normalized email and a one-way Argon2 password hash. The supplied password is never committed or stored as plain text. A server-only bootstrap command creates or updates the owner record after the Neon database is connected.

Successful login creates a signed, HTTP-only, secure session cookie. Sessions expire, can be revoked on sign-out, and are validated on every `/admin` request and every admin mutation. Login attempts are rate-limited by the existing Vercel application layer.

### Media

Vercel Blob stores admin-uploaded JPEG, PNG, WebP, and GIF files. Neon stores image metadata, dimensions, alt text, captions, and the Blob URL. Uploads require an owner session. Deletion remains blocked while an image is referenced by a post, page, or site setting.

### AdSense

The site settings screen adds:

- AdSense publisher ID
- AdSense code input
- enabled switch

The server validates the publisher ID and accepts only the official AdSense loader script shape. It stores normalized configuration rather than rendering arbitrary owner-supplied JavaScript. When enabled, the public root layout emits one AdSense loader script. Admin and preview routes never load ads. Empty or disabled settings emit no AdSense markup.

This prepares the site for approval but does not create an AdSense account or claim that Google has approved the domain.

## Data flow

Admin requests pass through the session guard, then call typed repository functions. Draft edits update editable rows. Publishing creates a new immutable revision and retires the previous current revision inside a transaction. Public routes read only current published revisions and public settings.

The homepage and calculator pages continue to render code-defined fallback copy if the database is temporarily unavailable. Admin writes fail with a clear error and never pretend that data was saved.

## Migration and deployment

1. Link the user's existing Neon account to the SoloCalculator Vercel project.
2. Create a dedicated SoloCalculator database and inject its production credentials.
3. Add Blob storage to the same Vercel project.
4. Run reviewed Neon migrations.
5. Bootstrap the single owner using server-only credentials.
6. deploy a preview, run the full release checks, and test login, draft save, publish, media upload, SEO settings, AdSense settings, and public output.
7. Merge through GitHub and verify the custom domain.

The old Supabase environment variables and packages are removed only after the Neon preview passes. No existing Supabase project is paused, deleted, or modified.

## Security

- Database and Blob credentials remain server-only.
- The owner password is hashed with Argon2id.
- Session cookies are HTTP-only, secure in production, same-site lax, and rotated at login.
- Admin mutations enforce the owner session on the server.
- Article HTML remains sanitized.
- AdSense input cannot inject arbitrary scripts.
- Upload type and size checks run before storage.
- SQL uses parameterized queries.

## Verification

Unit tests cover password verification, session validation, AdSense normalization, repository mapping, publishing transactions, redirects, and media-reference checks. Component tests cover the settings form and login errors.

Browser tests cover owner login, post creation, draft persistence, publishing, page SEO changes, AdSense save/disable behavior, media upload, sign-out, and rejected unauthenticated access. Public checks cover the homepage calculator default of zero, blog, sitemap, RSS, robots, and one calculator route.

Before production merge, tests, lint, build, migration status, and preview browser checks must pass. After merge, the same public routes and the owner login are checked on `www.solocalculator.com`.
