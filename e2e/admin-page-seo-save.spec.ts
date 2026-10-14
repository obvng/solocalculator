import { expect, test } from "@playwright/test";
import { createHash, randomBytes } from "node:crypto";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
const baseUrl = process.env.E2E_BASE_URL;
const ownerEmail = process.env.OWNER_EMAIL;
const canRun = Boolean(databaseUrl && baseUrl && ownerEmail);

test.describe("admin page SEO save path", () => {
  test.skip(!canRun, "Set E2E_BASE_URL, OWNER_EMAIL and its matching DATABASE_URL to run the database round-trip test.");

  test("POSTs the form and persists the title and description", async ({ page }) => {
    const sql = postgres(databaseUrl!, { prepare: false, max: 1 });
    let [owner] = await sql<{ id: string }[]>`select id from owners where email = ${ownerEmail!} limit 1`;
    let createdOwner = false;
    if (!owner) {
      [owner] = await sql<{ id: string }[]>`
        insert into owners (email, password_hash, display_name)
        values (${ownerEmail!}, 'e2e-session-only', 'SEO save test')
        returning id
      `;
      createdOwner = true;
    }
    const [original] = await sql<{ browser_title: string; meta_description: string; updated_at: Date }[]>`
      select browser_title, meta_description, updated_at
      from page_seo
      where page_key = 'tip-calculator'
    `;

    expect(original, "tip-calculator must exist in the database used by the web server").toBeTruthy();

    const suffix = Date.now().toString();
    const savedTitle = `Tip calculator save test ${suffix}`;
    const savedDescription = `Database round-trip description ${suffix}.`;
    const sessionToken = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(sessionToken).digest("hex");

    await sql`
      insert into sessions (owner_id, token_hash, expires_at)
      values (${owner.id}, ${tokenHash}, now() + interval '10 minutes')
    `;

    try {
      const target = new URL(baseUrl!);
      await page.context().addCookies([{ name: "solocalculator_admin", value: sessionToken, domain: target.hostname, path: "/", httpOnly: true, secure: target.protocol === "https:", sameSite: "Strict" }]);

      await page.goto("/admin/pages/tip-calculator");
      await expect(page).toHaveURL(/\/admin\/pages\/tip-calculator$/);
      await page.getByLabel("SEO title").fill(savedTitle);
      await page.getByLabel("Meta description").fill(savedDescription);
      await page.getByRole("button", { name: "Save changes" }).click();
      await expect(page).toHaveURL(/\/admin\/pages\/tip-calculator\?saved=1$/);

      const [stored] = await sql<{ browser_title: string; meta_description: string }[]>`
        select browser_title, meta_description
        from page_seo
        where page_key = 'tip-calculator'
      `;
      expect(stored).toEqual({ browser_title: savedTitle, meta_description: savedDescription });

      await page.reload();
      await expect(page.getByLabel("SEO title")).toHaveValue(savedTitle);
      await expect(page.getByLabel("Meta description")).toHaveValue(savedDescription);
    } finally {
      await sql`delete from sessions where token_hash = ${tokenHash}`;
      await sql`
        update page_seo
        set browser_title = ${original.browser_title},
            meta_description = ${original.meta_description},
            updated_at = ${original.updated_at}
        where page_key = 'tip-calculator'
      `;
      if (createdOwner) await sql`delete from owners where id = ${owner.id}`;
      await sql.end();
    }
  });
});
