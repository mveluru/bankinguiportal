import { expect, test, type Browser } from "@playwright/test";
import { ACCOUNT, CUSTOMER, STAFF, signInCustomer, signInStaff } from "./helpers";

// Changes data: a staff manager suspends ACCOUNT, then reactivates it (the cleanup reactivates through the API even if a step fails). Needs an ACTIVE account, so it
// skips itself when ACCOUNT is already suspended or closed rather than guessing what state to restore.
// Customers can't suspend or reactivate; only staff can.

/** Cleanup that cannot be skipped by a slow page: staff sign in and reactivate through the API (a no-op if the account is not suspended). */
async function reactivate(browser: Browser) {
  const context = await browser.newContext();
  try {
    const login = await context.request.post("/api/auth/login", { data: { kind: "staff", username: STAFF.user, password: STAFF.password } });
    if (login.ok()) await context.request.post(`/api/staff/accounts/${ACCOUNT}/reactivate`, { headers: { "Content-Type": "application/json" } });
  } finally {
    await context.close();
  }
}

test("staff suspend an account, the customer cannot sign in until staff reactivate it", async ({ page, browser }) => {
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

    // The backend refuses sign-in for a customer none of whose accounts is ACTIVE, and the sign-in screen shows its message.
    await page.goto("/login");
    await page.getByLabel("Username").fill(CUSTOMER.user);
    await page.getByLabel("Password").fill(CUSTOMER.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /Sign-in is not available: your account status is SUSPENDED/ })).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);

    await manager.goto(`/staff/accounts/${ACCOUNT}`);
    await manager.getByRole("link", { name: "Reactivate account" }).click();
    await manager.getByRole("button", { name: "Reactivate account" }).click();
    await expect(manager.getByText(/Account reactivated\./)).toBeVisible();

    // Reactivated: the customer can sign in again and sees an active account with its actions.
    await signInCustomer(page);
    await page.goto(`/accounts/${ACCOUNT}`);
    await expect(page.getByRole("link", { name: "Deposit" })).toBeVisible();
  } finally {
    await staff.close();
    await reactivate(browser);
  }
});
