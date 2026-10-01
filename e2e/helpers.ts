import { expect, type Page } from "@playwright/test";

// Demo data of the banking service (db/data 08 and 09): customer0001 owns CH-0000088291; priya.raman is an area manager.
export const CUSTOMER = { user: process.env.E2E_USER ?? "customer0001", password: process.env.E2E_PASSWORD ?? "20260001" };
export const STAFF = { user: process.env.E2E_STAFF_USER ?? "priya.raman", password: process.env.E2E_STAFF_PASSWORD ?? "20260001" };
export const ACCOUNT = process.env.E2E_ACCOUNT ?? "CH-0000088291";

async function signIn(page: Page, path: string, who: { user: string; password: string }, landing: string | RegExp) {
  await page.goto(path);
  await page.getByLabel("Username").fill(who.user);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: landing })).toBeVisible();
}

export const signInCustomer = (page: Page) => signIn(page, "/login", CUSTOMER, "Welcome");
export const signInStaff = (page: Page) => signIn(page, "/staff/login", STAFF, "Dashboard");
