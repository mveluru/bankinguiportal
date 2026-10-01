import { expect, test } from "@playwright/test";
import { signInCustomer } from "./helpers";

// Read-only. Uses a fake clock to skip the idle wait (default 120s; NEXT_PUBLIC_IDLE_TIMEOUT_SECONDS).

test("signs out and stays on the login page after 2 minutes idle", async ({ page }) => {
  await page.clock.install();
  await signInCustomer(page);
  await page.clock.runFor(125_000);
  await expect(page).toHaveURL(/\/login\?expired=1/);
  await expect(page.getByText("Your session ended. Please sign in again.")).toBeVisible();
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

test("activity keeps the session alive", async ({ page }) => {
  await page.clock.install();
  await signInCustomer(page);
  await page.clock.runFor(90_000);
  await page.mouse.move(100, 100);
  await page.mouse.move(200, 200);
  await page.clock.runFor(90_000);
  await expect(page).not.toHaveURL(/\/login/);
});
