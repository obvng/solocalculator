# SoloCalculator Tier 1 calculator design

**Date:** 14 October 2026  
**Status:** Approved direction, pending written-spec approval

## Scope

This milestone fixes two existing defects and adds five calculators:

1. `/percentage-increase-calculator`
2. `/percentage-of-calculator`
3. `/discount-calculator`
4. `/time-duration-calculator`
5. `/business-days-calculator`

Tier 2 calculators, the GPA rebuild, pregnancy due date, and ovulation tools are outside this milestone.

## Existing defects

### Admin SEO persistence

The page editor submits the expected `seoJson`, but `updatePageSeo` only issues an `UPDATE`. PostgreSQL does not throw when the page key matches no row, so the action can redirect with `saved=1` after writing nothing.

The save path will:

- parse and validate the submitted record;
- write `parsed.data`, not the unvalidated JSON object;
- insert the page SEO row when it does not exist;
- update it when it exists;
- return the stored row so a missing write cannot be reported as successful;
- revalidate the edited page, admin page, and sitemap after a confirmed write.

The upsert will use `pageKey` as the conflict target. `pathname` remains unique. A conflicting pathname belonging to another page is a save error, not an automatic reassignment.

### Age calculator worked example

The age example will no longer live as a fixed sentence in the tool catalog. The server page will generate it from a fixed sample birth date and the current UTC calendar date, using the same date calculation function as the interactive calculator. This keeps the raw server HTML current and avoids client-only replacement text.

## Page architecture

The new pages will use the existing `app/[slug]/page.tsx` server route. Each tool will be registered in the shared catalog and rendered through `ToolCalculator`.

The server response will include:

- the page H1 and introduction;
- calculator labels and initial values;
- How to use this calculator;
- a computed worked example;
- selected related calculators;
- `WebApplication` JSON-LD;
- `BreadcrumbList` JSON-LD;
- page-specific metadata.

The calculator controls will be client components so results update without a submission or reload. Calculation formulas will stay in pure functions under `lib/tools/calculations.ts` so they can be tested without rendering React.

## SEO records and sitemap

A database migration will insert one `page_seo` row for each new calculator with:

- page key and pathname;
- supplied browser title;
- a query-specific meta description;
- breadcrumb label;
- canonical URL;
- sitemap inclusion, priority, and change frequency;
- `WebApplication` schema configuration.

The migration will use `ON CONFLICT DO NOTHING`. It seeds new pages but never overwrites later admin edits.

The sitemap already reads `page_seo.updated_at`. Each inserted row therefore receives a database timestamp that becomes its initial `lastmod`. Later admin edits update that timestamp.

The source defaults will contain matching titles and descriptions so pages still have correct metadata if the database is temporarily unavailable.

## Calculator behavior

### Percentage increase calculator

Two visible sections will be shown on one page.

The first accepts an original value and a new value. It displays:

- signed percentage change;
- Increase, Decrease, or No change;
- signed absolute difference.

The second accepts an original value and percentage change. It displays the new value. Positive and negative percentages are allowed. Percentage change from an original value of zero is undefined and produces a clear field-level result instead of `Infinity`.

### Percentage-of calculator

All three rows remain visible:

- What is X% of Y?
- X is what percent of Y?
- X is Y% of what number?

Each row has its own inputs and live result. Division by zero produces a clear invalid-state message.

### Discount calculator

The sale-price section accepts:

- an optional currency symbol or blank prefix;
- original price;
- one or more percentage discounts.

Users can add and remove discount rows. Discounts are applied sequentially. The result shows the amount saved, final price, and true combined discount rate.

The reverse section accepts original and final prices and displays the discount percentage. Negative prices, discounts below 0%, and discounts above 100% are rejected.

### Time duration calculator

Start and end times are required. Dates are optional.

When both dates are absent and the end time is earlier than the start time, the end is treated as the following day. When dates are present, they determine the exact span. A partial date pair is invalid.

An optional unpaid break is entered in minutes. The result shows:

- hours and minutes;
- decimal hours;
- total paid minutes.

A break cannot exceed the elapsed duration.

### Business days calculator

The first section accepts a start date, end date, and weekend definition. It counts the range inclusively and shows total calendar days, working days, and weekend days. If the dates are reversed, the interface asks the user to correct them.

The second section accepts a start date, a non-negative number of working days, and the weekend definition. The starting day is excluded when moving forward. Adding zero working days returns the start date.

Weekend choices are:

- Saturday and Sunday;
- Friday and Saturday.

Public-holiday lists are not included in this version.

## International handling

Date fields use native date inputs, whose stored value is the unambiguous ISO `YYYY-MM-DD` form. Displayed date wording uses month names where prose is needed.

The discount calculator accepts any short currency symbol or no symbol. It does not format amounts as USD or infer a locale. Percentage and duration output uses neutral number formatting without a country-specific currency assumption.

No new calculator in this milestone needs separate metric and imperial modes.

## Related tools and homepage

Related calculators will be selected explicitly in the tool catalog. The current behavior of taking the first three unrelated tools will be removed.

The homepage will keep its existing popular calculators. A separate Tier 1 section will link to the five new tools so they are reachable through normal internal links as well as the sitemap.

## Visual continuity

The new calculators will keep the current SoloCalculator look. This milestone does not replace the existing visual design.

Each page will reuse the current:

- navy and bright-blue typography;
- pale coloured page backgrounds;
- rounded white calculator cards;
- blue result panels and blue primary controls;
- soft borders, shadows, and tinted field groups;
- Nunito Sans typography;
- spacing, corner radius, header, and mobile breakpoints.

The existing accent system will distinguish the pages without changing the brand:

- percentage increase: coral;
- percentage-of: blue;
- discount: yellow;
- time duration: lilac;
- business days: mint.

The new homepage section will use the same coloured calculator-card style as the current homepage. It must look native to the existing page rather than like a separate feature block.

## Mobile layout and accessibility

Inputs stack on narrow screens. Related fields may sit side by side only when there is enough width. Results stay directly below the inputs that control them.

Every input has a visible label. Result areas use polite live regions. Add/remove discount controls use descriptive text and remain keyboard accessible. Error states use text and do not rely on colour alone.

## Testing

Pure calculation tests will cover:

- positive, negative, and zero percentage changes;
- reverse percentage calculations and zero denominators;
- one discount, stacked discounts, reverse discounts, and invalid rates;
- same-day time spans, midnight crossing, dated spans, break deductions, and invalid breaks;
- inclusive business-day counts, both weekend definitions, leap days, zero-day addition, and month/year boundaries;
- age example generation against a supplied current date.

Repository tests will cover page SEO insert, update, returned values, and pathname conflicts. Page-level tests will check catalog registration, initial server content, metadata defaults, schema records, related links, and sitemap inclusion.

Before deployment, the milestone must pass lint, unit tests, and the production build. After deployment, each URL must return HTTP 200. Raw HTML must contain its H1, introduction, how-to section, worked example, canonical metadata, and both JSON-LD types. The production sitemap must contain all five URLs with `lastmod` values. The admin save flow must be tested by changing a title, reloading the editor, and checking the live page metadata.

## Deployment boundary

The code, migration, and seeded SEO records ship together. Deployment is not complete until the production database migration has run and the live checks pass. Search Console submission and indexing validation are separate actions after deployment.
