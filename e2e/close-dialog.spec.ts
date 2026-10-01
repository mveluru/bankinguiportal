import { expect, test } from "@playwright/test";
import { ACCOUNT, signInCustomer } from "./helpers";

// Never clicks Yes: the account is left open. Needs an account that is not already closed.
test.beforeEach(async ({ page }) => {
  await signInCustomer(page);
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
