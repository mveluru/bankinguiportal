import { expect, test } from "@playwright/test";

// Read-only: these specs never deposit, withdraw, suspend, close or request a statement.
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

test("home lists accounts from the banking service", async ({ page }) => {
  await expect(page.getByRole("heading", { name: /Your accounts \(\d+ active, \d+ suspended\)/ })).toBeVisible();
  await expect(page.locator("a.card").first()).toBeVisible();
  await expect(page.getByText("Cannot reach the banking service")).toHaveCount(0);
});

test("account screen shows the balance and recent activity", async ({ page }) => {
  await page.getByLabel("Go to account number").fill(ACCOUNT);
  await page.getByRole("button", { name: "View" }).click();

  await expect(page).toHaveURL(new RegExp(`/accounts/${ACCOUNT}$`));
  await expect(page.getByText(ACCOUNT)).toBeVisible();
  await expect(page.locator(".balance")).toHaveText(/\$[\d,]+\.\d{2}/);
  await expect(page.getByRole("heading", { name: "Recent activity" })).toBeVisible();
  await expect(page.getByText("Cannot reach the banking service")).toHaveCount(0);
});
