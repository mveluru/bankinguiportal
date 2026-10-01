import { expect, test } from "@playwright/test";
import { ACCOUNT, signInCustomer, signInStaff } from "./helpers";

// Read-only: browses the staff portal as an area manager; never changes an account or a login.
test("staff sign in, see their role, look up an account and list employees", async ({ page }) => {
  await signInStaff(page);
  await expect(page.getByText("Area Manager").first()).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
});

test("signing out ends the session", async ({ page }) => {
  await signInStaff(page);
  await page.getByRole("button", { name: "Sign out" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/staff\/login/);
  await page.goto("/staff");
  await expect(page).toHaveURL(/\/staff\/login/);
});
