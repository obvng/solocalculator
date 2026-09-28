# SoloCalculator

SoloCalculator is a responsive calculator website built with Next.js and TypeScript. It includes a normal and scientific calculator, age, percentage, loan, date, unit, currency, tip and birthday tools.

## Requirements

- Node.js 22 or newer
- A Supabase project for the private dashboard and blog
- A Vercel project for deployment

## Local development

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `OWNER_EMAIL`
- `SUPABASE_SERVICE_ROLE_KEY` (server only; never prefix it with `NEXT_PUBLIC_`)

```bash
npm install
npm run dev
```

The calculator pages still render from code-defined fallbacks when Supabase is unavailable. The admin login needs a configured Supabase project.

## Supabase setup

1. Run `supabase/migrations/202609270001_content_admin.sql` in the production project.
2. Run `supabase/seed.sql`.
3. Set the database setting `app.settings.owner_email` to the same normalized email as `OWNER_EMAIL`.
4. Create that one user in Supabase Authentication. Do not add a public registration screen.
5. Confirm the `media` bucket is public for reads and limited to JPEG, PNG, WebP and GIF files no larger than 10 MB. RLS permits writes only to the owner.

Published pages read immutable rows from `post_revisions`. Drafts remain in `posts` and are not publicly readable. Article HTML is sanitized. Embeds are limited to HTTPS YouTube and Vimeo URLs.

## Verification

```bash
npm test
npm run test:e2e
npm run lint
npm run build
```

Owner browser tests also need `E2E_OWNER_EMAIL` and `E2E_OWNER_PASSWORD`. Without them, Playwright runs the public site checks and reports the owner workflow as skipped. Use a disposable Supabase test project because the owner test publishes a uniquely named article.

## Vercel deployment

1. Link the GitHub repository to the existing Vercel project.
2. Set all four application environment variables for Production. Add them to Preview only when preview deployments should use a separate Supabase test project.
3. Set the Vercel Node.js runtime to Node 22.
4. Deploy the verified commit and keep `www.solocalculator.com` as the canonical domain. Redirect the apex domain to `www`.
5. After deployment, check `/admin/login`, `/blog`, `/sitemap.xml`, `/feed.xml`, `/robots.txt`, a calculator page, and a saved redirect. Sign out and confirm `/admin` returns to the owner login page.

Before connecting Vercel, test RLS with anon, non-owner and owner sessions. Anonymous users must see current published revisions but not drafts. Only the owner may change posts, pages, media, redirects and settings.

Currency conversion uses the free [Frankfurter](https://frankfurter.dev/) v2 API through the server route at `/api/rate`.
