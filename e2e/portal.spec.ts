import { expect, test } from "@playwright/test";
import { ACCOUNT, signInCustomer } from "./helpers";

// Read-only: these specs never deposit, withdraw, suspend, close or request a statement.
test.beforeEach(async ({ page }) => {
  await signInCustomer(page);
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
