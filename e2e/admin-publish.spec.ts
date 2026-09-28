import { expect, test } from "@playwright/test";

const ownerEmail = process.env.E2E_OWNER_EMAIL;
const ownerPassword = process.env.E2E_OWNER_PASSWORD;
const hasOwner = Boolean(ownerEmail && ownerPassword && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

test.describe("owner publishing workflow", () => {
  test.skip(!hasOwner, "Set the documented Supabase and E2E owner variables to run owner workflow tests.");

  test("login, draft, preview, publish and sign out", async ({ page }) => {
    const slug = `browser-check-${Date.now()}`;
    await page.goto("/admin");
    await page.getByLabel("Email").fill(ownerEmail!);
    await page.getByLabel("Password").fill(ownerPassword!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin$/);

    await page.getByRole("link", { name: "Posts" }).click();
    await page.getByRole("button", { name: /new article|write the first article/i }).click();
    await page.getByLabel("Article title").fill("Browser verification article");
    await page.getByLabel("URL slug").fill(slug);
    await page.getByLabel("Excerpt").fill("A temporary article created by the owner browser test.");
    await page.locator("[contenteditable=true]").fill("This published body verifies the private editor workflow.");
    await page.getByLabel("SEO title").fill("Browser verification article");
    await page.getByLabel("Meta description").fill("A browser test article for the SoloCalculator publishing workflow.");

    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Status:")).toContainText("draft");
    const preview = page.getByRole("link", { name: "Preview article" });
    await expect(preview).toHaveAttribute("target", "_blank");

    await page.getByRole("button", { name: "Publish" }).click();
    await page.goto(`/blog/${slug}`);
    await expect(page.getByRole("heading", { name: "Browser verification article" })).toBeVisible();
    await expect(page.locator('script[type="application/ld+json"]')).toContainText("Article");

    await page.goto("/admin/account");
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
