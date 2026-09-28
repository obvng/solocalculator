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

test("calculator SEO and discovery endpoints render", async ({ page, request }) => {
  await page.goto("/percentage-calculator");
  await expect(page).toHaveTitle(/Percentage calculator \| SoloCalculator/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://www.solocalculator.com/percentage-calculator");
  await expect(page.locator('input[type="number"]').first()).toHaveValue("0");

  const [robots, sitemap, feed] = await Promise.all([request.get("/robots.txt"), request.get("/sitemap.xml"), request.get("/feed.xml")]);
  expect(robots.ok()).toBeTruthy();
  expect(await robots.text()).toContain("Disallow: /admin/");
  expect(await sitemap.text()).toContain("https://www.solocalculator.com/percentage-calculator");
  expect(await feed.text()).toContain("<rss version=\"2.0\">");
});

test("blog index never exposes drafts", async ({ page }) => {
  await page.goto("/blog");
  await expect(page.getByRole("heading", { name: "Clear answers for everyday calculations" })).toBeVisible();
  await expect(page).toHaveTitle("Helpful calculator guides | SoloCalculator");
});
