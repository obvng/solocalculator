import { expect, test } from "@playwright/test";

const pages = [
  {
    slug: "percentage-increase-calculator",
    title: "Percentage Increase Calculator: Work Out % Change",
    heading: "Percentage increase calculator",
    description: "Calculate a percentage increase or decrease, find the absolute difference, or apply a percentage change to an original value.",
    intro: "Compare an original and new value",
  },
  {
    slug: "percentage-of-calculator",
    title: "Percentage Calculator: What Percent of What Number",
    heading: "Percentage of calculator",
    description: "Find a percentage of a number, what percentage one number is of another, or the whole number behind a percentage.",
    intro: "Use all three common percentage formulas",
  },
  {
    slug: "discount-calculator",
    title: "Discount Calculator: Sale Price and How Much You Save",
    heading: "Discount calculator",
    description: "Calculate a sale price, amount saved, stacked discount rate, or the discount between an original and final price.",
    intro: "Enter one discount or stack several reductions",
  },
  {
    slug: "time-duration-calculator",
    title: "Time Duration Calculator: Hours Between Two Times",
    heading: "Time duration calculator",
    description: "Calculate hours and minutes between two times, cross midnight, include dates, and subtract an unpaid break.",
    intro: "Choose start and end times",
  },
  {
    slug: "business-days-calculator",
    title: "Business Days Calculator: Working Days Between Dates",
    heading: "Business days calculator",
    description: "Count working days and weekend days between dates, or add working days using Saturday-Sunday or Friday-Saturday weekends.",
    intro: "Count an inclusive date range",
  },
] as const;

test("Tier 1 routes are server-rendered with unique metadata and both schemas", async ({ page, request }) => {
  const titles = new Set<string>();
  const descriptions = new Set<string>();

  for (const tool of pages) {
    const response = await request.get(`/${tool.slug}`);
    expect(response.status()).toBe(200);
    const rawHtml = await response.text();
    expect(rawHtml).toContain(tool.intro);
    expect(rawHtml).toContain("How to use this calculator");
    expect(rawHtml).toContain("Worked example");

    await page.goto(`/${tool.slug}`);
    await expect(page.getByRole("heading", { level: 1, name: tool.heading, exact: true })).toBeVisible();
    await expect(page.getByText(tool.intro, { exact: false })).toBeVisible();
    await expect(page.getByRole("heading", { name: "How to use this calculator" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Worked example" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Related calculators" })).toBeVisible();
    await expect(page).toHaveTitle(tool.title);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", tool.description);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://www.solocalculator.com/${tool.slug}`);

    const schemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() || "[]");
    expect(schemas.map((record: { "@type": string }) => record["@type"])).toEqual(["WebApplication", "BreadcrumbList"]);

    const inputBox = await page.locator("input").first().boundingBox();
    const howToBox = await page.getByRole("heading", { name: "How to use this calculator" }).boundingBox();
    expect(inputBox?.y).toBeLessThan(howToBox?.y ?? 0);
    titles.add(await page.title());
    descriptions.add(await page.locator('meta[name="description"]').getAttribute("content") || "");
  }

  expect(titles.size).toBe(pages.length);
  expect(descriptions.size).toBe(pages.length);
});

test("percentage increase updates live and handles a zero original value", async ({ page }) => {
  await page.goto("/percentage-increase-calculator");
  const comparison = page.getByRole("group", { name: "Percentage change" });
  await comparison.getByLabel("Original value", { exact: true }).fill("80");
  await comparison.getByLabel("New value").fill("100");
  await expect(comparison.getByText("+25% increase")).toBeVisible();
  await comparison.getByLabel("Original value", { exact: true }).fill("0");
  await expect(comparison.getByText("Original value cannot be zero.")).toBeVisible();
  await expect(page.getByRole("button", { name: /calculate/i })).toHaveCount(0);
});

test("percentage-of shows live results and rejects a zero base", async ({ page }) => {
  await page.goto("/percentage-of-calculator");
  const percentOf = page.getByRole("group", { name: "What is X% of Y?" });
  await percentOf.getByLabel("Percentage (X)").fill("20");
  await percentOf.getByLabel("Number (Y)").fill("150");
  await expect(percentOf.getByText("30", { exact: true })).toBeVisible();
  const whatPercent = page.getByRole("group", { name: "X is what percent of Y?" });
  await whatPercent.getByLabel("Value (X)").fill("30");
  await expect(whatPercent.getByText("Base value cannot be zero.")).toBeVisible();
  await expect(page.getByRole("button", { name: /calculate/i })).toHaveCount(0);
});

test("discount applies stacked rates and rejects a final price above the original", async ({ page }) => {
  await page.goto("/discount-calculator");
  const sale = page.getByRole("group", { name: "Sale price and savings" });
  await sale.getByLabel("Original price").fill("100");
  await sale.getByLabel("Discount 1 (%)").fill("30");
  await sale.getByRole("button", { name: "Add another discount" }).click();
  await sale.getByLabel("Discount 2 (%)").fill("10");
  await expect(sale.getByText("63", { exact: true })).toBeVisible();
  const reverse = page.getByRole("group", { name: "Find the discount percentage" });
  await reverse.getByLabel("Original price for reverse calculation").fill("100");
  await reverse.getByLabel("Final price").fill("120");
  await expect(reverse.getByText("Final price must be between zero and the original price.")).toBeVisible();
  await expect(page.getByRole("button", { name: /^calculate$/i })).toHaveCount(0);
});

test("time duration crosses midnight and validates optional date pairs", async ({ page }) => {
  await page.goto("/time-duration-calculator");
  await page.getByLabel("Start time").fill("22:30");
  await page.getByLabel("End time").fill("01:15");
  await expect(page.getByText("2 hr 45 min")).toBeVisible();
  await page.getByLabel("Start date (optional)").fill("2026-10-14");
  await expect(page.getByText("Enter both dates or leave both blank.")).toBeVisible();
  await expect(page.getByRole("button", { name: /calculate/i })).toHaveCount(0);
});

test("business days changes weekend rules and rejects a reversed range", async ({ page }) => {
  await page.goto("/business-days-calculator");
  const range = page.getByRole("group", { name: "Working days between dates" });
  await range.getByLabel("Start date").fill("2026-10-29");
  await range.getByLabel("End date").fill("2026-10-31");
  await expect(range.getByText("2 working days")).toBeVisible();
  await range.getByLabel("Weekend").selectOption("fri-sat");
  await expect(range.getByText("1 working day")).toBeVisible();
  await range.getByLabel("Start date").fill("2026-11-02");
  await expect(range.getByText("End date must be on or after start date.")).toBeVisible();
  await expect(page.getByRole("button", { name: /calculate/i })).toHaveCount(0);
});

test("Tier 1 calculators fit a phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const tool of pages) {
    await page.goto(`/${tool.slug}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    for (const locator of [page.locator("input"), page.locator('[aria-live="polite"]')]) {
      const count = await locator.count();
      for (let index = 0; index < count; index += 1) {
        const box = await locator.nth(index).boundingBox();
        expect(box?.x ?? 0).toBeGreaterThanOrEqual(0);
        expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
      }
    }
  }
});
