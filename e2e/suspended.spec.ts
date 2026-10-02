import { expect, test, type Browser } from "@playwright/test";
import { ACCOUNT, signInCustomer, signInStaff } from "./helpers";

// Changes data: a staff manager suspends ACCOUNT, then reactivates it (also in cleanup). Needs an ACTIVE account, so it
// skips itself when ACCOUNT is already suspended or closed rather than guessing what state to restore.
// Customers can't suspend or reactivate; only staff can.

async function reactivate(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await signInStaff(page);
    await page.goto(`/staff/accounts/${ACCOUNT}/reactivate`);
    const button = page.getByRole("button", { name: "Reactivate account" });
    if (await button.isVisible({ timeout: 5000 }).catch(() => false)) {
      await button.click();
      await expect(page.getByText(/Account reactivated\./)).toBeVisible();
    }
  } finally {
    await context.close();
  }
}

test("staff suspend an account, the customer sees it read-only, staff reactivate it", async ({ page, browser }) => {
  const staff = await browser.newContext();
  const manager = await staff.newPage();
  await signInStaff(manager);
  await manager.goto(`/staff/accounts/${ACCOUNT}`);
  await expect(manager.locator(".balance")).toBeVisible();
  test.skip(!(await manager.getByRole("link", { name: "Suspend account" }).isVisible()), `${ACCOUNT} is not an active account`);

  try {
    await manager.goto(`/staff/accounts/${ACCOUNT}/suspend`);
    await manager.getByLabel(/Reason \/ notes/).fill("e2e suspended-account spec");
    await manager.getByRole("button", { name: "Suspend account" }).click();
    await expect(manager.getByText("Account suspended.")).toBeVisible();

    // The customer: read-only account page, no deposit/withdraw, and nowhere to lift the suspension.
    await signInCustomer(page);
    await page.goto(`/accounts/${ACCOUNT}`);
    await expect(page.getByText(/read-only/).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Deposit" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Withdraw" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /suspen/i })).toHaveCount(0);

    await manager.goto(`/staff/accounts/${ACCOUNT}`);
    await manager.getByRole("link", { name: "Reactivate account" }).click();
    await manager.getByRole("button", { name: "Reactivate account" }).click();
    await expect(manager.getByText(/Account reactivated\./)).toBeVisible();
  } finally {
    await staff.close();
    await reactivate(browser);
  }
});
