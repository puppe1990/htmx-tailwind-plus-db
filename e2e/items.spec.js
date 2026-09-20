import { expect, test } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { openDb } from "../src/db.mjs";

const E2E_DB = `file:${fileURLToPath(new URL("../src/data/e2e.db", import.meta.url))}`;
const PASSWORD = "demo1234";

// 12 extra rows push the list past one page (seed has 2), so pagination is real.
const EXTRA_ITEMS = Array.from({ length: 12 }, (_, index) => ({
  id: `e2e-${String(index).padStart(2, "0")}`,
  title: `E2E item ${index}`,
  body: `corpo ${index}`,
  status: "novo",
}));

test.beforeAll(async () => {
  const db = await openDb({ url: E2E_DB });
  await db.seed(EXTRA_ITEMS);
  db.close();
});

async function login(page) {
  await page.goto("/");
  await expect(page.locator("#login-overlay")).toBeVisible();
  await page.fill('#login-overlay input[name="password"]', PASSWORD);
  await page.click('#login-overlay button[type="submit"]');
  await expect(page.locator("#items-table tbody tr").first()).toBeVisible();
}

test("login, filter, edit, paginate and logout", async ({ page }) => {
  await login(page);

  await page.fill("#search", "e2e-03");
  await expect(page.locator("#items-table tbody tr")).toHaveCount(1);
  await expect(page.locator('#items-table tr[data-id="e2e-03"]')).toBeVisible();

  await page.click('#filters button[type="reset"]');
  await expect(page.locator("#items-table tbody tr")).toHaveCount(10);

  const status = page.locator('#items-table tr[data-id="e2e-00"] select');
  await status.selectOption("concluido");
  await page.reload();
  await expect(
    page.locator('#items-table tr[data-id="e2e-00"] select'),
  ).toHaveValue("concluido");

  await page.click('nav button:has-text("Próxima")');
  await expect(page.locator("nav")).toContainText("Página 2 de 2");

  await page.click('a[href="/logout"]');
  await expect(page.locator("#login-overlay")).toBeVisible();
});

test("shows and hides the password", async ({ page }) => {
  await page.goto("/");
  const input = page.locator('#login-overlay input[name="password"]');
  await input.fill(PASSWORD);
  await expect(input).toHaveAttribute("type", "password");
  await page.click('[data-toggle="password"]');
  await expect(input).toHaveAttribute("type", "text");
  await page.click('[data-toggle="password"]');
  await expect(input).toHaveAttribute("type", "password");
});
