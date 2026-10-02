import { expect, test, type Page } from "@playwright/test";
import { STAFF } from "./helpers";

// "Logins today: N" next to Sign out, for a customer and for an employee. Signs in for real (customer0002 and the area manager) but
// answers GET /api/{portal,staff}/rate-limit with a mock, so the specs also pass against a backend that has not been restarted with the
// self-service endpoint yet. The endpoint itself was verified against a real backend copy.
const CUSTOMER = { user: process.env.E2E_USER_B ?? "customer0002", password: process.env.E2E_PASSWORD_B ?? "20260002" };

const usage = (loginsToday: number) => ({
  dailyLimit: 1000, customLimit: null, defaultLimit: 1000, usageDate: "2026-10-01", requestsToday: 12, remainingToday: 988, loginsToday,
});

async function signIn(page: Page, path: string, who: { user: string; password: string }) {
  await page.goto(path);
  await page.getByLabel("Username").fill(who.user);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("a customer sees today's login count beside Sign out, fetched once per page load", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/portal/rate-limit", (route) => {
    calls += 1;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(usage(4)) });
  });
  await signIn(page, "/login", CUSTOMER);
  const count = page.locator(".login-count");
  await expect(count).toHaveText("Logins today: 4");
  // Beside the Sign out button, in the top bar.
  const box = await count.boundingBox();
  const signOut = await page.getByRole("button", { name: "Sign out" }).boundingBox();
  expect(box && signOut && box.x < signOut.x && Math.abs(box.y - signOut.y) < 40).toBeTruthy();
  // Every call counts against the daily limit, so it is not polled.
  await page.waitForTimeout(2500);
  expect(calls).toBeLessThanOrEqual(2); // one per page load (a dev-mode double render may add one)
});

test("an employee sees today's login count beside Sign out", async ({ page }) => {
  await page.route("**/api/staff/rate-limit", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(usage(7)) }));
  await signIn(page, "/staff/login", STAFF);
  await expect(page.locator(".login-count")).toHaveText("Logins today: 7");
});

test("nothing is shown, and nothing breaks, when the count cannot be loaded", async ({ page }) => {
  await page.route("**/api/portal/rate-limit", (route) => route.fulfill({ status: 404, contentType: "text/plain", body: "No static resource" }));
  await signIn(page, "/login", CUSTOMER);
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await expect(page.locator(".login-count")).toHaveCount(0);
  await expect(page.locator("p.error")).toHaveCount(0);
});

// Real numbers, no mock: the count rises by one with every successful sign-in. Skips itself against a backend without the endpoint.
test("the real count goes up by one with each new sign-in", async ({ page, request }) => {
  const read = async () => {
    const login = await request.post("/api/auth/login", { data: { kind: "customer", username: CUSTOMER.user, password: CUSTOMER.password } });
    expect(login.ok()).toBeTruthy();
    const res = await request.get("/api/portal/rate-limit");
    return res.status() === 200 ? ((await res.json()).loginsToday as number) : null;
  };
  const first = await read();
  test.skip(first === null, "the backend has no GET /bff/v1/portal/rate-limit yet");
  const second = await read();
  expect(second).toBe((first as number) + 1);

  await signIn(page, "/login", CUSTOMER); // a third sign-in, through the screen: the top bar shows the real count
  await expect(page.locator(".login-count")).toHaveText(new RegExp(`^Logins today: ${(first as number) + 2}$`));
});

test.describe("on a 320px phone", () => {
  test.use({ viewport: { width: 320, height: 658 }, hasTouch: true, isMobile: true });
  test("the count fits and the brand stays readable", async ({ page }) => {
    await page.route("**/api/staff/rate-limit", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(usage(7)) }));
    await signIn(page, "/staff/login", STAFF);
    await expect(page.locator(".login-count")).toHaveText("Logins today: 7");
    const brand = await page.locator(".brand").boundingBox();
    expect(brand!.width).toBeGreaterThan(150); // not squeezed to a letter per line
    expect(brand!.height).toBeLessThan(90);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    for (const b of [page.getByRole("button", { name: "Sign out" }), page.locator(".login-count")]) {
      const box = await b.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(320);
    }
  });
});

// The backend refuses sign-in for a customer none of whose accounts is ACTIVE (403 with a plain message); the sign-in screen shows it.
test("a customer whose account is not active sees the backend's message on the sign-in screen", async ({ page }) => {
  const message = "Sign-in is not available: your account status is SUSPENDED. Please contact the customer support service.";
  await page.route("**/api/auth/login", (route) => route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ message }) }));
  await signIn(page, "/login", CUSTOMER);
  await expect(page.getByRole("alert").filter({ hasText: message })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0);
});

test("Sign out looks like the Dark button, with blue text", async ({ page }) => {
  await page.route("**/api/portal/rate-limit", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(usage(1)) }));
  await signIn(page, "/login", CUSTOMER);
  const signOut = page.getByRole("button", { name: "Sign out" });
  const dark = page.getByRole("button", { name: /Switch to (dark|light) mode/ });
  await expect(signOut).toBeVisible();
  const look = (b: typeof signOut) =>
    b.evaluate((e) => {
      const s = getComputedStyle(e);
      return { bg: s.backgroundColor, border: `${s.borderTopWidth} ${s.borderTopStyle} ${s.borderTopColor}`, radius: s.borderTopLeftRadius, padding: s.padding, size: s.fontSize, color: s.color };
    });
  const [a, b] = [await look(signOut), await look(dark)];
  expect({ ...a, color: "" }).toEqual({ ...b, color: "" }); // everything but the text colour is identical
  expect(a.color).not.toBe(b.color);
  expect(a.color).toBe("rgb(11, 92, 173)"); // the brand blue
});
