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
  // A customer can only look at their own account: the box is filled in with it and cannot be edited.
  await expect(page.locator(".side-account")).toHaveText(ACCOUNT); // account id, then the name, then "Customer since" in the left panel
  await expect(page.locator(".side-name")).toHaveText(/\S+ \S+/);
  await expect(page.getByLabel("Go to account number")).toHaveValue(ACCOUNT);
  await expect(page.getByLabel("Go to account number")).toHaveAttribute("readonly", "");
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
  // The left panel shows "Customer since <year>" where staff see their role, and it stays (unlike the banner).
  await expect(page.locator(".side-role")).toHaveText(/Customer since \d{4}$/);
  await page.reload();
  await expect(page.locator(".side-role")).toHaveText(/Customer since \d{4}$/);
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(greeting).toHaveCount(0);

  await page.context().clearCookies();
  await signInCustomer(page); // fresh sign-in: shown again, then gone after moving to another screen and back
  await page.getByRole("link", { name: "Help" }).first().click();
  await expect(page).toHaveURL(/\/help$/); // wait for the route change: the banner is cleared by navigating, not by clicking
  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(greeting).toHaveCount(0);
});

// Read-only: never presses Generate statement, because the backend also emails/texts the statement.
test("Statements: the customer's own account is selected, then pick a date range", async ({ page }) => {
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Statements" }).click();
  await expect(page.getByRole("heading", { name: "Statements" })).toBeVisible();
  await expect(page.getByText(ACCOUNT).first()).toBeVisible(); // nothing to choose with one account: it is already selected
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
  await expect(page.getByRole("heading", { name: "Welcome", exact: true })).toBeVisible();
  await page.clock.runFor(2_000);
  await expect(greeting).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Welcome", exact: true })).toHaveCount(0); // the word goes with the banner
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
});

test("the daily request limit pops up once when exceeded, never inline, and again only after a success", async ({ page }) => {
  const message = "Daily request limit exceeded for customer 1: max 1000 requests per day";
  const limited = (route: import("@playwright/test").Route) => route.fulfill({ status: 429, contentType: "text/plain", body: message });
  const dialog = page.getByRole("dialog", { name: "Daily request limit reached" });
  await page.evaluate(() => sessionStorage.removeItem("dailyLimitShown")); // independent of any real limit hit while signing in

  // Once the limit is used up every call for that customer fails, so refuse the Dashboard call and the top bar's count call alike.
  const refuseAll = async () => {
    await page.unroute("**/api/portal/home**");
    await page.unroute("**/api/portal/rate-limit");
    await page.route("**/api/portal/home**", limited);
    await page.route("**/api/portal/rate-limit", limited);
  };
  await refuseAll();
  await page.goto("/");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(message)).toBeVisible();
  await expect(page.locator("p.error")).toHaveCount(0); // the limit message is in the pop-up only, not red on the screen
  await dialog.getByRole("button", { name: "OK" }).click();

  // Every request keeps failing while the limit is exceeded, but the pop-up is shown once, not on every load.
  await page.reload();
  await expect(page.getByRole("heading", { name: /Dashboard|Welcome/ })).toBeVisible();
  await expect(dialog).toBeHidden();
  await expect(page.locator("p.error")).toHaveCount(0);

  // A successful request means the limit reset; exceeding it again pops up again.
  await page.unroute("**/api/portal/home**");
  await page.unroute("**/api/portal/rate-limit");
  await page.route("**/api/portal/home**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ totalActiveAccounts: 0, totalSuspendedAccounts: 0, accounts: [], nearbyLocations: [] }) }),
  );
  await page.reload();
  await expect(page.getByRole("heading", { name: /Your accounts/ })).toBeVisible();
  await refuseAll();
  await page.reload();
  await expect(dialog).toBeVisible();

  await dialog.getByRole("link", { name: "Read more in Help" }).click();
  await expect(page).toHaveURL(/\/help#request-limit$/);
  await expect(page.getByText(message).first()).toBeVisible();
});
