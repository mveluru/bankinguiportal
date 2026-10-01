import { expect, test, type Browser, type Page } from "@playwright/test";

// Changes data: suspends ACCOUNT as a regular user, then reactivates it as an admin (also in cleanup).
// Needs an ACTIVE account. Override the defaults with E2E_ADMIN_USER / E2E_ADMIN_PASSWORD.
const USER = process.env.E2E_USER ?? "demo";
const PASSWORD = process.env.E2E_PASSWORD ?? "demo1234";
const ADMIN = process.env.E2E_ADMIN_USER ?? "Admin";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "admin1234";
const ACCOUNT = process.env.E2E_ACCOUNT ?? "CH-0000088291";

async function signIn(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
}

async function reactivateAsAdmin(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await signIn(page, ADMIN, ADMIN_PASSWORD);
    await page.goto(`/accounts/${ACCOUNT}/suspend`);
    const reactivate = page.getByRole("button", { name: "Reactivate account" });
    if (await reactivate.isVisible({ timeout: 5000 }).catch(() => false)) {
      await reactivate.click();
      await expect(page.getByText("Account reactivated.")).toBeVisible();
    }
  } finally {
    await context.close();
  }
}

test("suspended account is read-only for a regular user; an admin can reactivate it", async ({ page, browser }) => {
  try {
    await signIn(page, USER, PASSWORD);
    await page.goto(`/accounts/${ACCOUNT}/suspend`);
    await page.getByLabel(/Reason \/ notes/).fill("e2e suspended-account spec");
    await page.getByRole("button", { name: "Suspend account" }).click();
    await expect(page.getByText("Account suspended.")).toBeVisible();

    // Regular user: read-only account page and no way into the suspension screen.
    await page.goto(`/accounts/${ACCOUNT}`);
    await expect(page.getByText(/read-only/).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Manage suspension" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Deposit" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Withdraw" })).toHaveCount(0);
    await page.goto(`/accounts/${ACCOUNT}/suspend`);
    await expect(page.getByText("Only an administrator can change or lift the suspension.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reactivate account" })).toHaveCount(0);

    // Admin: can open the suspension screen and reactivate.
    const adminContext = await browser.newContext();
    const admin = await adminContext.newPage();
    await signIn(admin, ADMIN, ADMIN_PASSWORD);
    await admin.goto(`/accounts/${ACCOUNT}`);
    await expect(admin.getByRole("link", { name: "Manage suspension" })).toBeVisible();
    await admin.getByRole("link", { name: "Manage suspension" }).click();
    await admin.getByRole("button", { name: "Reactivate account" }).click();
    await expect(admin.getByText("Account reactivated.")).toBeVisible();
    await adminContext.close();
  } finally {
    await reactivateAsAdmin(browser);
  }
});
