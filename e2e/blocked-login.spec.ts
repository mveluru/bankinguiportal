import { expect, test, type Page } from "@playwright/test";

// A customer none of whose accounts is ACTIVE cannot sign in: the backend answers 403 with a message that names the account status
// (SUSPENDED, CLOSED, INACTIVE or DORMANT), and the sign-in screen shows exactly that text, with no session started.
const message = (status: string) => `Sign-in is not available: your account status is ${status}. Please contact the customer support service.`;

async function trySignIn(page: Page, username = "customer0001", password = "20260001") {
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

for (const status of ["SUSPENDED", "CLOSED", "INACTIVE", "DORMANT"]) {
  test(`${status}: the sign-in screen shows the backend's message and nobody is signed in`, async ({ page }) => {
    await page.route("**/api/auth/login", (route) => route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ message: message(status) }) }));
    await trySignIn(page);
    await expect(page.getByRole("alert").filter({ hasText: message(status) })).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0);
    expect((await page.context().cookies()).some((c) => c.name === "bank_token")).toBe(false);
  });
}

// Real backend, no mock: customer0001's only account is suspended. Skips itself if that account has been reactivated.
test("customer0001 (suspended account) is refused by the real backend with its message", async ({ page, request }) => {
  const res = await request.post("/api/auth/login", { data: { kind: "customer", username: "customer0001", password: "20260001" } });
  test.skip(res.ok(), "customer0001 can sign in (no non-active account to test with)");
  expect(res.status()).toBe(403);
  expect((await res.json()).message).toMatch(/^Sign-in is not available: your account status is [A-Z]+\. Please contact the customer support service\.$/);

  await trySignIn(page);
  await expect(page.getByRole("alert").filter({ hasText: /Sign-in is not available: your account status is/ })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});
