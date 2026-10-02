import { devices, expect, test, type Page } from "@playwright/test";
import { ACCOUNT, signInCustomer, signInStaff } from "./helpers";

// Read-only. Loads every screen on iPhone and Samsung profiles and fails if anything sticks out past the screen edge
// (page scrolls sideways, or an element is wider than the screen outside a table that scrolls on its own).
// Galaxy S9+ is 320px wide: the narrowest phone in use, so a deliberate stress case.
const PHONES = ["iPhone 15", "iPhone 13 Pro Max", "Galaxy S24", "Galaxy S9+"] as const;

const CUSTOMER_PAGES = [
  "/", "/statements", `/accounts/${ACCOUNT}`, `/accounts/${ACCOUNT}/deposit`, `/accounts/${ACCOUNT}/withdraw`,
  `/accounts/${ACCOUNT}/statement`, `/accounts/${ACCOUNT}/close`, "/settings", "/settings/password",
  "/settings/security-questions", "/help", "/terms", "/privacy",
];
const STAFF_PAGES = [
  "/staff", "/staff/accounts/open", "/staff/customers", "/staff/employees", "/staff/employees/EMP-000004",
  `/staff/accounts/${ACCOUNT}`, `/staff/accounts/${ACCOUNT}/suspend`, `/staff/accounts/${ACCOUNT}/reactivate`,
  `/staff/accounts/${ACCOUNT}/deposit`, `/staff/accounts/${ACCOUNT}/close`, "/staff/settings", "/staff/settings/password",
  "/staff/settings/security-questions",
];
const SIGNED_OUT_PAGES = ["/login", "/staff/login", "/forgot-password", "/staff/forgot-password"];

async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
}

async function expectFits(page: Page, path: string) {
  await page.goto(path);
  await settle(page);
  const r = await page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const wide = [...document.querySelectorAll("body *")]
      .filter((e) => {
        const b = e.getBoundingClientRect();
        return b.width > 0 && (b.right > w + 1 || b.left < -1) && !e.closest(".table-wrap, .account-box, dialog, .cookie-notice") && getComputedStyle(e).position !== "fixed";
      })
      .slice(0, 4)
      .map((e) => `${e.tagName.toLowerCase()}.${e.className || ""} right=${Math.round(e.getBoundingClientRect().right)}`);
    return { w, scroll: document.documentElement.scrollWidth, wide };
  });
  expect.soft(r.scroll, `${path}: page scrolls sideways (${r.scroll} > ${r.w})`).toBeLessThanOrEqual(r.w);
  expect.soft(r.wide, `${path}: elements past the screen edge`).toEqual([]);
}

for (const name of PHONES) {
  const { defaultBrowserType: _ignored, ...phone } = devices[name];
  void _ignored;
  test.describe(name, () => {
    test.use({ ...phone });
    test.setTimeout(120_000); // each test walks 13+ screens
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem("cookie_notice_ack", JSON.stringify({ v: "2", at: "x" })));
    });

    test("signed-out screens fit", async ({ page }) => {
      for (const p of SIGNED_OUT_PAGES) await expectFits(page, p);
    });
    test("customer screens fit", async ({ page }) => {
      await signInCustomer(page);
      for (const p of CUSTOMER_PAGES) await expectFits(page, p);
    });
    test("staff screens fit", async ({ page }) => {
      await signInStaff(page);
      for (const p of STAFF_PAGES) await expectFits(page, p);
    });
  });
}
