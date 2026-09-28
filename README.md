# SoloCalculator

SoloCalculator is a responsive calculator website built with Next.js and TypeScript. It includes a normal and scientific calculator, age, percentage, loan, date, unit, currency, tip and birthday tools.

## Requirements

- Node.js 22 or newer
- A Neon Postgres project for the private dashboard and blog
- A Vercel Blob store for admin media uploads
- A Vercel project for deployment

## Local development

Copy `.env.example` to `.env.local` and set:

- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `OWNER_EMAIL`
- `OWNER_BOOTSTRAP_PASSWORD` (temporary; remove it after bootstrapping)
- `BLOB_READ_WRITE_TOKEN`

```bash
npm install
npm run dev
```

The calculator pages still render from code-defined fallbacks when Neon is unavailable. The admin login needs a migrated Neon database.

## Neon and Blob setup

1. Connect a dedicated Neon project to SoloCalculator through the Vercel Marketplace.
2. Connect a Vercel Blob store to the same Vercel project.
3. Run `npm run db:migrate` with the direct Neon connection available.
4. Set `OWNER_EMAIL` and temporarily set `OWNER_BOOTSTRAP_PASSWORD`.
5. Run `npm run owner:bootstrap`, then remove `OWNER_BOOTSTRAP_PASSWORD` from Vercel.
6. Redeploy and sign in at `/admin/login`. There is no public registration screen.

Published pages read immutable rows from `post_revisions`. Drafts remain in `posts` and are not publicly readable. Article HTML is sanitized. Embeds are limited to HTTPS YouTube and Vimeo URLs.

## Verification

```bash
npm test
npm run test:e2e
npm run lint
npm run build
```

Owner browser tests also need `E2E_OWNER_EMAIL` and `E2E_OWNER_PASSWORD`. Without them, Playwright runs the public site checks and reports the owner workflow as skipped. Use a separate Neon branch or test project because the owner test publishes a uniquely named article.

## Vercel deployment

1. Link the GitHub repository to the existing Vercel project.
2. Set the Neon, Blob, and owner environment variables for Production. Add them to Preview only when preview deployments use isolated data.
3. Set the Vercel Node.js runtime to Node 22.
4. Deploy the verified commit and keep `www.solocalculator.com` as the canonical domain. Redirect the apex domain to `www`.
5. After deployment, check `/admin/login`, `/blog`, `/sitemap.xml`, `/feed.xml`, `/robots.txt`, a calculator page, and a saved redirect. Sign out and confirm `/admin` returns to the owner login page.

Before production merge, test anonymous, invalid-session and owner requests. Public routes must read current published revisions but not drafts. Only the owner may change posts, pages, media, redirects and settings.

Currency conversion uses the free [Frankfurter](https://frankfurter.dev/) v2 API through the server route at `/api/rate`.
