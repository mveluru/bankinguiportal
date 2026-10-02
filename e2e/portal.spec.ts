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
  await expect(page.getByLabel("Go to account number")).toHaveValue(""); // no default account number
  await page.getByLabel("Go to account number").fill(ACCOUNT);
  await page.getByRole("button", { name: "View" }).click();

  // The details open in the box on the right of the same screen (no navigation).
  const box = page.locator(".account-box");
  await expect(page).toHaveURL(/\/$/);
  await expect(box.getByText(ACCOUNT).first()).toBeVisible();
  await expect(box.locator(".balance")).toHaveText(/\$[\d,]+\.\d{2}/);
  await expect(box.getByRole("heading", { name: "Recent activity" })).toBeVisible();
  const scrolls = await box.evaluate((e) => getComputedStyle(e).overflow);
  expect(scrolls).toBe("auto");
  await expect(page.getByText("Cannot reach the banking service")).toHaveCount(0);
});

test("welcome headline shows once after sign-in and not after navigating on or reloading", async ({ page }) => {
  const greeting = page.getByRole("status").filter({ hasText: /^Welcome! .+ · customer since \d{4}$/ });
  await expect(greeting).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Welcome", exact: true })).toBeVisible();
  await expect(greeting).toHaveCount(0);

  await page.context().clearCookies();
  await signInCustomer(page); // fresh sign-in: shown again, then gone after moving to another screen and back
  await page.getByRole("link", { name: "Help" }).first().click();
  await expect(page).toHaveURL(/\/help$/); // wait for the route change: the banner is cleared by navigating, not by clicking
  await page.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(greeting).toHaveCount(0);
});

// Read-only: never presses Generate statement, because the backend also emails/texts the statement.
test("Statements: pick an account and a date range from the left panel", async ({ page }) => {
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Statements" }).click();
  await expect(page.getByRole("heading", { name: "Statements" })).toBeVisible();
  await expect(page.getByRole("combobox")).toHaveValue(""); // nothing preselected
  await expect(page.getByLabel("From", { exact: true })).toHaveCount(0);
  await page.getByRole("combobox").selectOption(ACCOUNT);
  await expect(page.getByLabel("From", { exact: true })).toBeVisible();
  await expect(page.getByLabel("To", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate statement" })).toBeEnabled();
});

test("the welcome banner removes itself after 20 seconds", async ({ page }) => {
  await page.context().clearCookies();
  await page.clock.install();
  await signInCustomer(page);
  const greeting = page.getByRole("status").filter({ hasText: /^Welcome! / });
  await expect(greeting).toBeVisible();
  await page.clock.runFor(19_000);
  await expect(greeting).toBeVisible();
  await page.clock.runFor(2_000);
  await expect(greeting).toHaveCount(0);
});
