import { expect, test } from "@playwright/test";

// Read-only. Uses a fake clock to skip the idle wait (default 120s; NEXT_PUBLIC_IDLE_TIMEOUT_SECONDS).
const USER = process.env.E2E_USER ?? "demo";
const PASSWORD = process.env.E2E_PASSWORD ?? "demo1234";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(USER);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
}

test("signs out and stays on the login page after 2 minutes idle", async ({ page }) => {
  await page.clock.install();
  await signIn(page);
  await page.clock.runFor(125_000);
  await expect(page).toHaveURL(/\/login\?expired=1/);
  await expect(page.getByText("Your session timed out. Please sign in again.")).toBeVisible();
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

test("activity keeps the session alive", async ({ page }) => {
  await page.clock.install();
  await signIn(page);
  await page.clock.runFor(90_000);
  await page.mouse.move(100, 100);
  await page.mouse.move(200, 200);
  await page.clock.runFor(90_000);
  await expect(page).not.toHaveURL(/\/login/);
});
