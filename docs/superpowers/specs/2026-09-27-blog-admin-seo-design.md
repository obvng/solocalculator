# SoloCalculator blog, admin, and SEO design

## Goal

Add a private, single-owner content system to SoloCalculator. The owner can publish blog posts, manage media, control redirects, and edit on-page SEO for the homepage and every calculator page without changing calculation code.

The public site remains a Next.js application deployed on Vercel. Supabase provides authentication, PostgreSQL storage, and image storage. Public pages remain fast and crawlable through server rendering and cache revalidation.

The calculator display will start at `0` instead of `1,248.50` everywhere it appears.

## Access model

- `/admin/login` is the only public admin route.
- There is no public registration or invitation flow.
- One allow-listed owner account can sign in.
- Supabase Row Level Security limits all content mutations to that owner.
- Public visitors can read only published content and public SEO data.
- Drafts, scheduled content, private settings, and audit records are not readable through public database policies.
- Admin routes verify the session on the server. Client-side route hiding is not treated as access control.

## System architecture

### Public application

The existing calculator site stays in the Next.js App Router. Calculator logic remains in source control. Database content may supply titles, descriptions, explanatory copy, FAQs, structured-data settings, and related links, but it cannot alter calculator formulas or executable code.

Blog routes are server-rendered:

- `/blog`
- `/blog/[slug]`
- `/blog/category/[slug]`
- `/blog/tag/[slug]`

Published changes trigger cache revalidation for affected URLs, the blog index, sitemap, and RSS feed.

### Admin application

The private `/admin` application is part of the same Next.js project. It uses server actions or authenticated route handlers for mutations. Major areas are:

- Overview
- Posts
- Pages and calculators
- Categories and tags
- Media
- Redirects
- SEO settings
- Account

### Supabase

Supabase provides:

- Email/password authentication for the owner
- PostgreSQL tables for content and settings
- Storage for article and social images
- Row Level Security policies
- Database timestamps and publication state

No Supabase service-role key is exposed to the browser.

## Content model

### Posts

Each post stores:

- Title, slug, excerpt, rich-text document, and optional source HTML
- Draft, scheduled, published, or archived status
- Featured image and social image
- Author display name
- Created, updated, scheduled, and published timestamps
- Categories and tags
- Related calculator pages and related posts
- Full SEO record

Slugs are unique. Published slugs cannot be silently reused. Changing a published slug offers to create a permanent redirect from the previous URL.

### Page SEO records

The homepage and every calculator route have stable page identifiers. An SEO record can override:

- Browser title and meta description
- Editable on-page introduction and supporting sections
- Canonical URL
- Breadcrumb label
- Index/follow controls
- Sitemap inclusion, priority, and change frequency
- Open Graph and X metadata
- Structured-data configuration
- FAQ content
- Related posts and calculator links

Calculation components and formulas are not editable in the dashboard.

### Taxonomy, redirects, and settings

Categories and tags have names, slugs, descriptions, and optional SEO records. Redirects store a source path, destination, status code, enabled state, and change history. Site settings contain title templates, default descriptions, default social images, organization information, social profiles, verification tokens, and global robots rules.

### Media

Media records store the Supabase Storage path, public URL, original filename, MIME type, dimensions, byte size, alt text, caption, and upload timestamp. Deleting an image that is still referenced is blocked until the references are removed or replaced.

## Editor

The editor provides a WordPress-style visual experience with:

- Paragraphs and heading levels
- Bold, italic, underline, code, and clear formatting
- Ordered and unordered lists
- Links with target and sponsored/nofollow controls
- Quotes, dividers, tables, buttons, callouts, and code blocks
- Images with upload, selection, replacement, caption, and alt text
- Embeds from supported HTTPS sources
- Undo and redo
- HTML/source view for the owner
- Draft autosave and unsaved-change warnings

Stored content is sanitized before rendering. Raw scripts, event handlers, unsafe URLs, and unsupported embeds are removed.

## SEO controls

Every post, category, tag, homepage record, and calculator page record has an SEO panel with:

- SEO title and meta description with length guidance
- Slug and canonical URL
- Target and supporting keywords
- Index/noindex and follow/nofollow
- Sitemap inclusion and sitemap attributes
- Open Graph and X title, description, and image
- Search-result and social-share previews
- Schema selection and editable properties
- Breadcrumb label
- Author, publication date, and modified date

Supported structured data includes WebSite, WebPage, Article, BlogPosting, FAQPage, HowTo, BreadcrumbList, and calculator/software page data where appropriate. Output is generated from validated fields rather than arbitrary executable JSON.

The admin audit reports:

- Missing or duplicate titles and descriptions
- Missing canonical URLs
- Missing image alt text
- Invalid heading order
- Pages without an H1
- Thin content guidance
- Missing internal links
- Broken internal links
- Orphan posts
- Schema fields that are incomplete
- Indexing conflicts

Warnings inform the owner but do not block publishing.

## Dashboard behavior

The overview shows post counts, scheduled content, recent edits, missing SEO fields, broken-link results, orphan content, and pages with indexing conflicts. Tables support search, filters, sorting, and pagination.

Posts can be previewed, duplicated, scheduled, published, unpublished, or archived. Destructive actions require confirmation. Autosaved drafts do not change the published version until the owner publishes.

The media library supports upload, search, alt-text editing, replacement, and reference checks. Redirect validation rejects loops and invalid external schemes.

## Public SEO output

- Next.js metadata is generated from database records with code defaults as fallback.
- Canonical URLs use `https://www.solocalculator.com`.
- The sitemap includes published, indexable content only.
- The RSS feed includes published posts only.
- `robots.txt` follows the global settings while always blocking admin routes.
- Structured data is emitted as validated JSON-LD.
- Redirects are resolved before page rendering.
- Draft and preview URLs are excluded from indexing.

## Error handling

- Failed autosaves keep the local editor state and show a retry action.
- Publishing validates required fields and returns field-specific errors.
- Upload failures do not create incomplete media records.
- Database outages fall back to code-defined SEO for calculator pages rather than breaking calculator routes.
- Public requests for missing or unpublished posts return 404.
- Conflicting slugs and redirect loops are rejected before saving.

## Testing

Automated tests cover:

- Owner access and rejection of unauthenticated admin requests
- Row Level Security policies
- Post state transitions and scheduling
- Slug uniqueness and automatic redirect creation
- Sanitization of editor output
- SEO metadata and JSON-LD generation
- Sitemap, RSS, robots, and redirect output
- Media-reference protection
- Calculator pages retaining their existing functionality
- Calculator displays starting at `0`

Browser verification covers login, draft autosave, preview, publish, page SEO edits, media upload, redirect creation, and the resulting public metadata. Production verification checks the custom domain, HTTPS, sitemap, RSS, robots, and one complete publish workflow.

## Delivery sequence

1. Add Supabase project configuration, schema, policies, and owner-only authentication.
2. Build the admin shell and protected navigation.
3. Build posts, taxonomy, rich-text editing, previews, and publishing.
4. Build media management.
5. Build page SEO, global SEO, redirects, and audits.
6. Connect public blog pages, metadata, JSON-LD, sitemap, RSS, robots, and cache revalidation.
7. Change calculator initial displays to `0` and run regression tests.
8. Configure production Supabase and Vercel environment variables, create the owner account, deploy, and verify end to end.

## Out of scope for this build

- Public user accounts
- Multiple writers or editorial roles
- Comments
- Paid subscriptions
- Newsletter sending
- Automated AI article generation
- Editing calculator formulas from the dashboard
