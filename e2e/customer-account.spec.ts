import { expect, test, type Page } from "@playwright/test";

// A second demo customer (Bob, one savings account), so these specs run even when customer0001's daily request limit is used up.
// Read-only: Generate statement is answered by a mock, because the real call emails/texts a copy of the statement.
const USER = process.env.E2E_USER_B ?? "customer0002";
const PASSWORD = process.env.E2E_PASSWORD_B ?? "20260002";
const ACCOUNT = process.env.E2E_ACCOUNT_B ?? "SV-0000044102";

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(USER);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: /^Welcome$/ })).toBeVisible();
}

test("Go to account number: prefilled with the customer's own account; View shows it in the box", async ({ page }) => {
  await signIn(page);
  await expect(page.locator(".side-account")).toHaveText(ACCOUNT);
  await expect(page.locator(".side-name")).toHaveText("Bob Jones");
  const input = page.getByLabel("Go to account number");
  await expect(input).toHaveValue(ACCOUNT);
  await expect(input).toHaveAttribute("readonly", "");
  await page.getByRole("button", { name: "View" }).click();
  const box = page.locator(".account-box");
  await expect(box.locator(".balance")).toHaveText(/\$[\d,]+\.\d{2}/);
  await expect(box.getByText(ACCOUNT).first()).toBeVisible();
});

test("a session from before the account list was saved still works (falls back to one Dashboard call)", async ({ page, context }) => {
  await signIn(page);
  const cookies = await context.cookies();
  const profile = cookies.find((c) => c.name === "bank_profile")!;
  const { accountNumbers: _dropped, ...old } = JSON.parse(decodeURIComponent(profile.value));
  void _dropped;
  await context.addCookies([{ ...profile, value: encodeURIComponent(JSON.stringify(old)) }]);
  await page.reload();
  await expect(page.getByLabel("Go to account number")).toHaveValue(ACCOUNT);
  await page.getByRole("button", { name: "View" }).click();
  await expect(page.locator(".account-box .balance")).toHaveText(/\$[\d,]+\.\d{2}/);
});

test("Statements: the customer's own account is selected; Generate shows the statement, with Print and Download", async ({ page }) => {
  await signIn(page);
  await page.route("**/api/portal/accounts/*/statement**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        accountNumber: ACCOUNT,
        beginDate: "2026-09-01",
        endDate: "2026-10-01",
        transactions: [{ accountNumber: ACCOUNT, transactionType: "DEPOSIT", amount: 100, balanceAfter: 600, transactionDate: "2026-09-15", depositType: "check" }],
      }),
    }),
  );
  await page.getByRole("link", { name: "Statements" }).click();
  await expect(page.getByRole("heading", { name: "Statements" })).toBeVisible();
  await expect(page.getByText(ACCOUNT).first()).toBeVisible();
  await page.getByRole("button", { name: "Generate statement" }).click();
  await expect(page.getByRole("heading", { name: new RegExp(`Statement ${ACCOUNT}`) })).toBeVisible();
  await expect(page.getByRole("cell", { name: "$100.00" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Print" })).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download CSV" }).click()]);
  expect(download.suggestedFilename()).toBe(`statement-${ACCOUNT}-2026-09-01-2026-10-01.csv`);
});

test("View never leaves the box blank: when the account cannot be loaded it says so, in grey, without the limit text", async ({ page }) => {
  await signIn(page);
  await page.route("**/api/portal/accounts/*/overview**", (route) =>
    route.fulfill({ status: 429, contentType: "text/plain", body: "Daily request limit exceeded for customer 2: max 1000 requests per day" }),
  );
  await page.getByRole("button", { name: "View" }).click();
  const box = page.locator(".account-box");
  await expect(box.getByText("This isn't available right now. Please try again later.")).toBeVisible();
  await expect(box.locator(".error")).toHaveCount(0); // not red
  await expect(box.getByText(/Daily request limit/)).toHaveCount(0); // the limit text is only in the pop-up
});
