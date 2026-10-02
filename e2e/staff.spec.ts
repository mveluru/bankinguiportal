import { expect, test } from "@playwright/test";
import { ACCOUNT, signInCustomer, signInStaff } from "./helpers";

// Read-only: browses the staff portal as an area manager; never changes an account or a login.
test("staff sign in, see their role, look up an account and list employees", async ({ page }) => {
  await signInStaff(page);
  await expect(page.getByRole("status").filter({ hasText: /^Welcome Priya Raman EMP-000001$/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Brite Banking Dashboard" })).toBeVisible();
  await expect(page.locator(".side-role")).toHaveText("Area Manager"); // the role sits above the Dashboard button
  await expect(page.getByRole("link", { name: "UserMgnt" })).toBeVisible();

  await page.getByLabel("Go to account number").fill(ACCOUNT);
  await page.getByRole("button", { name: "View" }).click();
  await expect(page).toHaveURL(new RegExp(`/staff/accounts/${ACCOUNT}$`));
  await expect(page.locator(".balance")).toHaveText(/\$[\d,]+\.\d{2}/);

  await page.getByRole("link", { name: "UserMgnt" }).click();
  await expect(page.getByRole("heading", { name: "Employees" })).toBeVisible();
  await expect(page.locator("tbody tr").first()).toBeVisible();
});

test("a customer cannot reach the staff portal, and staff land on theirs", async ({ page }) => {
  await signInCustomer(page);
  await page.goto("/staff/employees");
  await expect(page).not.toHaveURL(/\/staff/);
  await expect(page.getByRole("heading", { name: "Welcome", exact: true })).toBeVisible();
});

test("signing out ends the session", async ({ page }) => {
  await signInStaff(page);
  await page.getByRole("button", { name: "Sign out" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/staff\/login/);
  await page.goto("/staff");
  await expect(page).toHaveURL(/\/staff\/login/);
});

// Read-only. A teller has no suspend/reactivate privilege (managers and area managers do), so those pages are not shown.
test("a teller does not see the suspend or reactivate pages", async ({ page }) => {
  await page.goto("/staff/login");
  await page.getByLabel("Username").fill(process.env.E2E_TELLER_USER ?? "lucas.meyer");
  await page.getByLabel("Password").fill(process.env.E2E_TELLER_PASSWORD ?? "20260010");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  // The left panel only offers what a teller's role allows.
  const panel = page.getByRole("navigation", { name: "Main" });
  await expect(panel.getByRole("link", { name: "Open an account" })).toBeVisible();
  await expect(panel.getByRole("link", { name: "Customer logins" })).toHaveCount(0);
  await expect(panel.getByRole("link", { name: "UserMgnt" })).toHaveCount(0);

  await page.goto(`/staff/accounts/${ACCOUNT}`);
  await expect(page.locator(".balance")).toBeVisible();
  await expect(page.getByRole("link", { name: /suspen|reactivate/i })).toHaveCount(0);

  for (const tail of ["suspend", "reactivate"]) {
    await page.goto(`/staff/accounts/${ACCOUNT}/${tail}`);
    await expect(page).toHaveURL(/\/staff$/);
  }
});

test("a manager sees the reactivate page for a suspended account", async ({ page }) => {
  await signInStaff(page);
  await page.goto(`/staff/accounts/${ACCOUNT}`);
  await expect(page.locator(".balance")).toBeVisible();
  const link = page.getByRole("link", { name: "Reactivate account" });
  test.skip(!(await link.isVisible()), `${ACCOUNT} is not suspended`);
  await link.click();
  await expect(page.getByRole("heading", { name: "Reactivate account" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reactivate account" })).toBeVisible(); // not clicked: read-only
});
