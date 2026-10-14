# SoloCalculator Tier 1 calculators implementation plan

> **Execution:** Use the `superpowers:executing-plans` workflow and complete tasks in order. Do not begin Tier 2 work.

**Goal:** Fix page SEO persistence and the stale age example, then add five server-rendered, live-updating calculators that keep the current SoloCalculator design.

**Architecture:** Keep `app/[slug]/page.tsx` as the shared server-rendered route. Extend the tool catalog, put formula logic in pure TypeScript functions, and render the new interactive forms through the existing `ToolCalculator` dispatcher. Seed editable SEO records in PostgreSQL without overwriting later admin edits.

**Stack:** Next.js 16, React 19, TypeScript, Drizzle ORM, Neon Postgres, Vitest, Testing Library, Playwright, Vercel.

**Design spec:** `docs/superpowers/specs/2026-10-14-tier-1-calculators-design.md`

## Task 1: Reproduce and fix page SEO persistence

**Files:**

- Modify: `lib/admin/repository.ts`
- Modify: `app/admin/(dashboard)/actions.ts`
- Create: `lib/admin/page-seo-values.ts`
- Create: `lib/admin/page-seo-values.test.ts`
- Create or modify: `lib/admin/repository.test.ts`

### Step 1: Add failing value-mapping tests

Test that the mapper accepts validated `PageSeoRecord` data and produces every `page_seo` column used by the save action, including title, description, pathname, canonical URL, sitemap fields, keywords, schema, social metadata, and FAQs.

Run:

```bash
npx vitest run lib/admin/page-seo-values.test.ts
```

Expected: FAIL because the mapper does not exist.

### Step 2: Add failing repository tests

Mock `getDb()` and verify that saving:

- inserts a missing page row;
- updates an existing row through `onConflictDoUpdate` on `pageKey`;
- returns the stored row;
- rejects a pathname conflict instead of reporting success.

Run:

```bash
npx vitest run lib/admin/repository.test.ts
```

Expected: FAIL because `updatePageSeo` still performs update-only writes and returns nothing.

### Step 3: Implement validated upsert values

Move form-to-column mapping into `lib/admin/page-seo-values.ts`. In `savePageSeo`, use `parsed.data` after validation. Include `pageKey` and `pathname` in the persisted values.

### Step 4: Replace update-only persistence

Replace `updatePageSeo` with an upsert using `pageKey` as the conflict target. Use `.returning()`. Throw if no row is returned.

Revalidate:

- the public pathname;
- `/admin/pages`;
- `/admin/pages/${pageKey}`;
- `/sitemap.xml`.

### Step 5: Run focused tests

```bash
npx vitest run lib/admin/page-seo-values.test.ts lib/admin/repository.test.ts
```

Expected: PASS.

### Step 6: Commit

```bash
git add lib/admin/page-seo-values.ts lib/admin/page-seo-values.test.ts lib/admin/repository.ts lib/admin/repository.test.ts 'app/admin/(dashboard)/actions.ts'
git commit -m "fix: persist calculator page SEO edits"
```

## Task 2: Make worked examples server-generated

**Files:**

- Modify: `lib/tools/catalog.ts`
- Modify: `app/[slug]/page.tsx`
- Modify: `lib/tools/calculations.ts`
- Modify: `lib/tools/calculations.test.ts`
- Create: `lib/tools/examples.test.ts`

### Step 1: Add a failing age-example test

Add a test that supplies `2026-10-14` as the current date and expects the example to mention that date and the age calculated by `calculateAge`. Confirm the result contains no September 2026 date.

Run:

```bash
npx vitest run lib/tools/examples.test.ts
```

Expected: FAIL because examples are fixed strings.

### Step 2: Add a testable example function

Change tool examples from strings to functions that accept an ISO current date. Static examples may ignore the argument. The age example must call `calculateAge` with its sample birth date.

Render the example in `app/[slug]/page.tsx` on the server using the current UTC date.

### Step 3: Run focused tests

```bash
npx vitest run lib/tools/examples.test.ts lib/tools/calculations.test.ts
```

Expected: PASS.

### Step 4: Commit

```bash
git add lib/tools/catalog.ts lib/tools/calculations.ts lib/tools/calculations.test.ts lib/tools/examples.test.ts 'app/[slug]/page.tsx'
git commit -m "fix: calculate worked examples from the current date"
```

## Task 3: Build and test the new calculation functions

**Files:**

- Modify: `lib/tools/calculations.ts`
- Modify: `lib/tools/calculations.test.ts`

### Step 1: Write failing percentage tests

Cover:

- increase, decrease, and no change;
- signed absolute difference;
- reverse percentage change;
- undefined change from zero;
- all three percentage-of formulas;
- zero denominators.

### Step 2: Implement percentage functions

Add explicit result types and functions for percentage change, reverse percentage change, percentage-of modes, and classification labels.

Run:

```bash
npx vitest run lib/tools/calculations.test.ts
```

Expected: new percentage tests PASS.

### Step 3: Write failing discount tests

Cover one discount, sequential `30%` then `10%`, combined rate, reverse discount, zero price, and invalid rates.

### Step 4: Implement discount functions

Apply each discount to the remaining price. Do not add the percentages together. Return final price, saved amount, and combined percentage.

### Step 5: Write failing duration tests

Cover same-day times, automatic midnight crossing, explicit dates, multi-day spans, decimal hours, total minutes, break deduction, incomplete dates, reversed dated spans, and oversized breaks.

### Step 6: Implement duration functions

Parse dates and times without relying on the browser timezone. Work in integer minutes. Return elapsed minutes and paid minutes separately.

### Step 7: Write failing business-day tests

Cover inclusive counts, Sat-Sun weekends, Fri-Sat weekends, weekday ranges, weekend-only ranges, leap day, month boundary, adding zero working days, and adding N working days across a weekend.

### Step 8: Implement business-day functions

Use UTC date arithmetic. Keep the weekend definition as explicit data, not locale inference.

### Step 9: Run calculation tests

```bash
npx vitest run lib/tools/calculations.test.ts
```

Expected: PASS.

### Step 10: Commit

```bash
git add lib/tools/calculations.ts lib/tools/calculations.test.ts
git commit -m "feat: add Tier 1 calculator formulas"
```

## Task 4: Add the five interactive calculator forms

**Files:**

- Create: `components/tools/TierOneCalculators.tsx`
- Create: `components/tools/TierOneCalculators.test.tsx`
- Modify: `components/tools/ToolCalculators.tsx`
- Modify: `components/tools/tools.module.css`

### Step 1: Write failing component tests

Use Testing Library to confirm:

- results change as fields change;
- no Calculate button exists;
- the three percentage-of rows are visible together;
- discount rows can be added and removed;
- time dates are optional but validated as a pair;
- business weekend choice changes the result;
- result regions announce changes politely.

Run:

```bash
npx vitest run components/tools/TierOneCalculators.test.tsx
```

Expected: FAIL because the components do not exist.

### Step 2: Implement the forms

Create one component per calculator and export them to the existing dispatcher. Keep all state local to the tool. Use pure calculation functions inside `useMemo` where useful.

For discount currency display, accept a short free-text symbol. Concatenate the symbol with the formatted numeric value. Do not select a default currency.

### Step 3: Extend the current coloured styles

Reuse `.form`, `.field`, `.twoCols`, and `.result`. Add only the styles needed for:

- multiple visible calculation panels;
- discount row controls;
- result detail grids;
- inline status or error text;
- narrow-screen stacking.

Keep the current navy, blue, coral, mint, lilac, and yellow palette. Do not introduce a new design system.

### Step 4: Run component tests

```bash
npx vitest run components/tools/TierOneCalculators.test.tsx
```

Expected: PASS.

### Step 5: Commit

```bash
git add components/tools/TierOneCalculators.tsx components/tools/TierOneCalculators.test.tsx components/tools/ToolCalculators.tsx components/tools/tools.module.css
git commit -m "feat: add Tier 1 calculator interfaces"
```

## Task 5: Register pages, metadata, examples, and related tools

**Files:**

- Modify: `lib/tools/catalog.ts`
- Modify: `lib/seo/defaults.ts`
- Modify: `app/[slug]/page.tsx`
- Modify: `app/[slug]/tool-page.module.css` only if the current layout needs a small mobile correction
- Create: `lib/tools/catalog.test.ts`

### Step 1: Add failing catalog tests

Assert that every new slug has:

- the supplied title;
- its own description and intro;
- the approved accent colour;
- a worked-example function;
- three intentional related calculator slugs.

Also assert every related slug exists and no tool relates to itself.

### Step 2: Extend `ToolKind` and the catalog

Add the five new kinds and tool definitions. Use these exact titles:

- `Percentage Increase Calculator: Work Out % Change`
- `Percentage Calculator: What Percent of What Number`
- `Discount Calculator: Sale Price and How Much You Save`
- `Time Duration Calculator: Hours Between Two Times`
- `Business Days Calculator: Working Days Between Dates`

Write concise page descriptions and introductions for the matching search query.

### Step 3: Render intentional related tools

Replace the current first-three-tools selection with the catalog’s related slug list. Ignore a missing related slug safely, but make the catalog test fail if one is introduced.

### Step 4: Verify default metadata

Confirm `getDefaultPageSeo` returns the supplied title without adding a second product name inside the title value. `toNextMetadata` may apply the configured title template once.

### Step 5: Run focused tests

```bash
npx vitest run lib/tools/catalog.test.ts lib/content/repository.test.ts lib/seo/schema.test.ts
```

Expected: PASS.

### Step 6: Commit

```bash
git add lib/tools/catalog.ts lib/tools/catalog.test.ts lib/seo/defaults.ts 'app/[slug]/page.tsx' 'app/[slug]/tool-page.module.css'
git commit -m "feat: register Tier 1 calculator pages"
```

## Task 6: Seed editable SEO records and sitemap timestamps

**Files:**

- Create: `drizzle/0003_tier_one_calculators.sql`
- Modify: `drizzle/meta/_journal.json`
- Modify generated Drizzle snapshot only if `drizzle-kit generate` produces one
- Modify: `lib/content/schema-contract.test.ts`
- Modify: `e2e/public-seo.spec.ts`

### Step 1: Add failing schema-contract assertions

Assert that the migration contains all five page keys and paths, the five exact titles, unique meta descriptions, canonical URLs, `WebApplication` schema config, sitemap inclusion, and `ON CONFLICT ("page_key") DO NOTHING`.

### Step 2: Generate the migration scaffold

Run:

```bash
npm run db:generate
```

If Drizzle produces no migration because the table shape did not change, create the numbered data migration manually and update the journal using the existing format.

### Step 3: Add idempotent SEO inserts

Insert complete rows for the new pages. Do not update existing rows during deployment.

### Step 4: Extend sitemap tests

Check that all five URLs appear and each entry exposes `lastModified` when a database row has `updatedAt`.

### Step 5: Run focused tests

```bash
npx vitest run lib/content/schema-contract.test.ts
npx playwright test e2e/public-seo.spec.ts
```

Expected: PASS.

### Step 6: Commit

```bash
git add drizzle lib/content/schema-contract.test.ts e2e/public-seo.spec.ts
git commit -m "feat: seed Tier 1 calculator SEO records"
```

## Task 7: Add the coloured homepage section

**Files:**

- Modify: `app/page.tsx`
- Modify: `app/page.module.css`
- Create or modify: `app/page.test.tsx`

### Step 1: Add a failing homepage test

Assert that the existing six popular calculators remain and that a separate section links all five Tier 1 pages.

### Step 2: Add the Tier 1 card data and markup

Use the approved accent mapping:

- percentage increase: coral;
- percentage-of: blue;
- discount: yellow;
- time duration: lilac;
- business days: mint.

Use current Phosphor icons and the existing card structure.

### Step 3: Add responsive styles

Desktop may use five cards in one row. Mobile uses compact cards in a two-column grid, with the final card allowed to span or sit naturally without forcing symmetry.

### Step 4: Run the homepage test

```bash
npx vitest run app/page.test.tsx
```

Expected: PASS.

### Step 5: Commit

```bash
git add app/page.tsx app/page.module.css app/page.test.tsx
git commit -m "feat: link Tier 1 calculators from the homepage"
```

## Task 8: Verify server rendering, metadata, schema, and mobile behavior

**Files:**

- Modify: `e2e/public-seo.spec.ts`
- Create: `e2e/tier-one-calculators.spec.ts`

### Step 1: Add route checks

For every new route, verify:

- HTTP 200;
- H1 and introduction;
- calculator inputs above the explanatory content;
- How to use this calculator;
- computed worked example;
- Related calculators;
- canonical URL;
- unique title and description;
- `WebApplication` and `BreadcrumbList` JSON-LD.

### Step 2: Add interaction checks

Exercise one normal calculation and one edge case on each page. Confirm results update without navigation and that there is no Calculate button.

### Step 3: Add viewport checks

Run the pages at a phone viewport. Check that fields and result cards stay inside the viewport and that no horizontal scrolling appears.

### Step 4: Run browser tests

Start the app with the project’s normal test server configuration, then run:

```bash
npx playwright test e2e/public-seo.spec.ts e2e/tier-one-calculators.spec.ts
```

Expected: PASS.

### Step 5: Commit

```bash
git add e2e/public-seo.spec.ts e2e/tier-one-calculators.spec.ts
git commit -m "test: verify Tier 1 calculator pages"
```

## Task 9: Run the local release gate

### Step 1: Run unit and component tests

```bash
npm test
```

Expected: PASS. If the existing `sanitize-html` ESM test-runner fault still appears, record it separately and prove all changed suites pass. Do not call the full suite green if unrelated suites still fail.

### Step 2: Run lint

```bash
npm run lint
```

Expected: PASS.

### Step 3: Run the production build

```bash
npm run build
```

Expected: PASS with all five routes generated or server-renderable.

### Step 4: Review the diff

```bash
git diff --check
git status --short
git diff --stat
```

Confirm only milestone files changed and no credentials, local environment files, or unrelated user edits are included.

### Step 5: Commit any verification-only corrections

```bash
git add <exact-corrected-files>
git commit -m "fix: complete Tier 1 calculator verification"
```

Skip this commit if no correction was required.

## Task 10: Deploy and verify production

### Step 1: Push the completed branch

```bash
git push
```

### Step 2: Deploy to Vercel production

Use the connected SoloCalculator Vercel project. Confirm the deployment is attached to the intended Git commit and production domain.

### Step 3: Run the database migration

Apply the new Drizzle migration against the production Neon database once. Confirm all five `page_seo` rows exist before testing the admin.

### Step 4: Verify live URLs

Check these exact URLs:

```text
https://www.solocalculator.com/percentage-increase-calculator
https://www.solocalculator.com/percentage-of-calculator
https://www.solocalculator.com/discount-calculator
https://www.solocalculator.com/time-duration-calculator
https://www.solocalculator.com/business-days-calculator
```

For each URL, verify HTTP 200, raw server HTML content, metadata, canonical, schemas, and a working calculation.

### Step 5: Verify the live sitemap

Open `https://www.solocalculator.com/sitemap.xml`. Confirm all five URLs appear with non-empty `lastmod` values.

### Step 6: Verify admin persistence end to end

In `/admin/pages/tip-calculator`:

1. record the current title;
2. change it to a clearly identifiable temporary value;
3. save;
4. reload the editor and confirm the value remains;
5. inspect the live page metadata and confirm the new value appears;
6. restore the original title;
7. save, reload, and confirm restoration on the live page.

Do not leave the temporary title in production.

### Step 7: Report deployment state accurately

Report the production deployment URL, commit, migration result, live route checks, sitemap check, and admin round-trip result. Do not describe Search Console indexing as complete. Indexing starts only after Google recrawls the deployed pages.
