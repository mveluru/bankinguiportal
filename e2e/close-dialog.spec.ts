import { expect, test } from "@playwright/test";

// Never clicks Yes: the account is left open. Needs an account that is not already closed.
const USER = process.env.E2E_USER ?? "demo";
const PASSWORD = process.env.E2E_PASSWORD ?? "demo1234";
const ACCOUNT = process.env.E2E_ACCOUNT ?? "CH-0000088291";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill(USER);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
});

test("close account asks Yes/No and No leaves the account open", async ({ page }) => {
  await page.goto(`/accounts/${ACCOUNT}/close`);
  const button = page.getByRole("button", { name: "Permanently close account" });
  await expect(button).toBeDisabled();

  await page.getByLabel(/to confirm/).fill(ACCOUNT);
  await button.click();

  const dialog = page.getByRole("dialog", { name: "Close this account?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Yes" })).toBeVisible();

  await dialog.getByRole("button", { name: "No" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { name: "Account closed" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Close account" })).toBeVisible();
});
