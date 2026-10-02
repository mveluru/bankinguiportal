import { expect, test } from "@playwright/test";
import { ACCOUNT, signInCustomer, signInStaff } from "./helpers";

// Read-only: browses the staff portal as an area manager; never changes an account or a login.
test("staff sign in, see their role, look up an account and list employees", async ({ page }) => {
  await signInStaff(page);
  await expect(page.getByRole("status").filter({ hasText: /^Welcome Priya Raman EMP-000001$/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Brite Dashboard" })).toBeVisible();
  // The role sits above the Dashboard button; clicking it shows what the role allows. None of that is on the dashboard itself.
  await expect(page.locator(".side-role")).toContainText("Area Manager");
  await expect(page.getByText("Manage Employees")).toHaveCount(0);
  await page.locator(".side-role").click();
  await expect(page.getByRole("list", { name: "What your role allows" }).getByText("Manage Employees")).toBeVisible();
  await expect(page.locator(".brand-sub")).toHaveCount(0); // area managers have no branch
  await expect(page.getByRole("link", { name: "UserMgnt" })).toBeVisible();

  await page.getByLabel("Go to account number").fill(ACCOUNT);
  await page.getByRole("button", { name: "View" }).click();
  await expect(page.locator(".account-box .balance")).toHaveText(/\$[\d,]+\.\d{2}/); // opens in the box, same screen

  await page.getByRole("link", { name: "UserMgnt" }).click();
  await expect(page.getByRole("heading", { name: "Employees" })).toBeVisible();
  await expect(page.locator("tbody tr").first()).toBeVisible();
});

test("a customer cannot reach the staff portal, and staff land on theirs", async ({ page }) => {
  await signInCustomer(page);
  await page.goto("/staff/employees");
  await expect(page).not.toHaveURL(/\/staff/);
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
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

  await expect(page.locator(".brand-sub")).toBeVisible(); // a teller's branch is shown under the brand

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

// Reads a customer's real limit and sign-in count from the backend; the PUT is mocked, so no customer's limit is changed.
test("a manager sees a customer's daily requests and sign-ins and can set their limit", async ({ page }) => {
  await signInStaff(page);
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Customer logins" }).click();
  await page.getByLabel("Customer id").fill(process.env.E2E_CUSTOMER_ID_B ?? "2");
  await page.getByRole("button", { name: "Select" }).click();

  const panel = page.getByRole("region", { name: "Daily requests and sign-ins" });
  await expect(panel).toBeVisible();
  for (const label of ["Sign-ins today", "Requests today", "Remaining today", "Daily limit"]) {
    await expect(panel.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(panel.locator("dd").first()).toHaveText(/^\d+$/);

  await page.route("**/api/staff/customers/*/rate-limit", (route) =>
    route.request().method() === "PUT"
      ? route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ customerId: 2, dailyLimit: 500, customLimit: 500, defaultLimit: 1000, usageDate: "2026-10-01", requestsToday: 10, remainingToday: 490, loginsToday: 3 }),
        })
      : route.continue(),
  );
  await panel.getByLabel(/own daily limit/).fill("500");
  await panel.getByRole("button", { name: "Set limit" }).click();
  await expect(panel.getByText("Daily limit set to 500 requests.")).toBeVisible();
  await expect(panel.getByRole("button", { name: "Use default" })).toBeEnabled();
});

test("a teller cannot open the customer rate-limit screen", async ({ page }) => {
  await page.goto("/staff/login");
  await page.getByLabel("Username").fill(process.env.E2E_TELLER_USER ?? "lucas.meyer");
  await page.getByLabel("Password").fill(process.env.E2E_TELLER_PASSWORD ?? "20260010");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Brite Dashboard" })).toBeVisible();
  await page.goto("/staff/customers");
  await expect(page.getByText("Managing customer logins needs the Manager role")).toBeVisible();
  await expect(page.getByLabel("Customer id")).toHaveCount(0);
});

// Reads an employee's real limit and sign-in count from the backend (area managers only); the PUT is mocked.
test("an area manager sees an employee's daily requests and sign-ins and can set their limit", async ({ page }) => {
  await signInStaff(page);
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "UserMgnt" }).click();
  await page.getByRole("link", { name: "EMP-000010" }).click();

  const panel = page.getByRole("region", { name: "Daily requests and sign-ins" });
  await expect(panel).toBeVisible();
  for (const label of ["Sign-ins today", "Requests today", "Remaining today", "Daily limit"]) {
    await expect(panel.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(panel.getByText(/default limit|own limit/)).toBeVisible();
  await expect(panel.locator("dd").first()).toHaveText(/^\d+$/);

  await page.route("**/api/staff/employees/*/rate-limit", (route) =>
    route.request().method() === "PUT"
      ? route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ employeeNumber: "EMP-000010", dailyLimit: 250, customLimit: 250, defaultLimit: 1000, usageDate: "2026-10-01", requestsToday: 5, remainingToday: 245, loginsToday: 2 }),
        })
      : route.continue(),
  );
  await panel.getByLabel(/own daily limit/).fill("250");
  await panel.getByRole("button", { name: "Set limit" }).click();
  await expect(panel.getByText("Daily limit set to 250 requests.")).toBeVisible();
});
