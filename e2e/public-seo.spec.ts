import { expect, test } from "@playwright/test";

test("homepage calculator starts at zero and accepts input", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /what do you want to calculate/i })).toBeVisible();
  await expect(page.getByRole("status").getByText("0", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "7", exact: true }).click();
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByRole("button", { name: "5", exact: true }).click();
  await page.getByRole("button", { name: "Equals" }).click();
  await expect(page.getByRole("status")).toContainText("12");
});

test("retired calculator URL redirects and stays out of the sitemap", async ({ request }) => {
  const response = await request.get("/calculator", { maxRedirects: 0 });
  expect(response.status()).toBe(301);
  expect(response.headers().location).toBe("/calculators");

  const sitemapXml = await (await request.get("/sitemap.xml")).text();
  expect(sitemapXml).not.toContain("<loc>https://www.solocalculator.com/calculator</loc>");
  expect(sitemapXml).toContain("<loc>https://www.solocalculator.com/calculators</loc>");
});

test("404 responses use page-specific metadata", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle("Page not found | SoloCalculator");
  await expect(page.locator('meta[name="description"]').first()).toHaveAttribute("content", "The page you requested could not be found. Browse SoloCalculator calculators and guides.");
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
});

test("calculator SEO and discovery endpoints render", async ({ page, request }) => {
  await page.goto("/percentage-calculator");
  await expect(page).toHaveTitle("Percentage calculator");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://www.solocalculator.com/percentage-calculator");
  await expect(page.locator('input[type="number"]').first()).toHaveValue("0");

  const [robots, sitemap, feed] = await Promise.all([request.get("/robots.txt"), request.get("/sitemap.xml"), request.get("/feed.xml")]);
  expect(robots.ok()).toBeTruthy();
  expect(await robots.text()).toContain("Disallow: /admin/");
  const sitemapXml = await sitemap.text();
  expect(sitemapXml).toContain("https://www.solocalculator.com/percentage-calculator");
  for (const slug of [
    "percentage-increase-calculator",
    "percentage-of-calculator",
    "discount-calculator",
    "time-duration-calculator",
    "business-days-calculator",
  ]) {
    expect(sitemapXml).toContain(`https://www.solocalculator.com/${slug}`);
  }
  expect(await feed.text()).toContain("<rss version=\"2.0\">");
});

test("blog index never exposes drafts", async ({ page }) => {
  await page.goto("/blog");
  await expect(page.getByRole("heading", { name: "Clear answers for everyday calculations" })).toBeVisible();
  await expect(page).toHaveTitle("Helpful calculator guides | SoloCalculator");
});

test("header dropdowns and calculator directory navigate to real pages", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Calculators" }).click();
  await page.getByRole("link", { name: "All calculators" }).click();
  await expect(page).toHaveURL(/\/calculators$/);
  await expect(page.getByRole("heading", { name: "All calculators" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Discount" })).toHaveAttribute("href", "/discount-calculator");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await page.getByRole("link", { name: "All calculators" }).click();
  await expect(page).toHaveURL(/\/calculators$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
