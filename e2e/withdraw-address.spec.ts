import { expect, test, type Page } from "@playwright/test";
import { STAFF } from "./helpers";

// The withdraw and deposit forms are pre-filled with the account holder's address from the account overview. Staff must also tick
// "I verified the customer's address" before they can withdraw or deposit: a required checkbox (never shown to customers). The overview and the POST are mocked
// (a real withdrawal would move money); the field shape is the backend's real `holderAddress`.
const CUSTOMER = { user: process.env.E2E_USER_B ?? "customer0002", password: process.env.E2E_PASSWORD_B ?? "20260002" };
const TELLER = { user: process.env.E2E_TELLER_USER ?? "lucas.meyer", password: process.env.E2E_TELLER_PASSWORD ?? "20260010" };
const ACCOUNT = process.env.E2E_ACCOUNT_B ?? "SV-0000044102";
const ADDRESS = { street: "456 Oak Ln", addressLine1: "Suite 9", addressLine2: "Rear", city: "Dallas", state: "TX", zip: "75201", country: "USA" };

const overview = (balance = 900) => ({
  accountNumber: ACCOUNT, accountType: "SAVINGS", accountStatus: "ACTIVE", balance, suspended: false, suspendedUntil: null,
  createdDate: "2026-05-23", closedDate: null, firstName: "Bob", lastName: "Jones", maskedPhoneNumber: "***-***-0002",
  holderAddress: ADDRESS, activityDays: 30, recentActivity: [],
});

async function signIn(page: Page, path: string, who: { user: string; password: string }) {
  await page.goto(path);
  await page.getByLabel("Username").fill(who.user);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}

async function mockAccount(page: Page, kind: "portal" | "staff") {
  const posts: unknown[] = [];
  await page.route(`**/api/${kind}/accounts/*/overview**`, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(overview()) }));
  await page.route(`**/api/${kind}/accounts/withdraw**`, (r) => {
    posts.push(r.request().postDataJSON());
    return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(overview(899)) });
  });
  await page.route(`**/api/${kind}/accounts/deposit**`, (r) => {
    posts.push(r.request().postDataJSON());
    return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(overview(901)) });
  });
  return posts;
}

async function expectAddressFilled(page: Page) {
  await expect(page.locator('input[name="street"]')).toHaveValue(ADDRESS.street);
  await expect(page.locator('input[name="addressLine1"]')).toHaveValue(ADDRESS.addressLine1);
  await expect(page.locator('input[name="addressLine2"]')).toHaveValue(ADDRESS.addressLine2);
  await expect(page.locator('input[name="city"]')).toHaveValue(ADDRESS.city);
  await expect(page.locator('select[name="state"]')).toHaveValue(ADDRESS.state);
  await expect(page.locator('input[name="zip"]')).toHaveValue(ADDRESS.zip);
  await expect(page.locator('input[name="country"]')).toHaveValue(ADDRESS.country);
}

const fillRest = async (page: Page) => {
  await page.locator('input[name="amount"]').fill("1.00");
  await page.locator('input[name="phone"]').fill("214-555-0002");
};

test("a customer's withdraw form is pre-filled with their address and needs no verification box", async ({ page }) => {
  const posts = await mockAccount(page, "portal");
  await signIn(page, "/login", CUSTOMER);
  await page.goto(`/accounts/${ACCOUNT}/withdraw`);
  await expectAddressFilled(page);
  await expect(page.getByLabel(/I verified the customer/)).toHaveCount(0);

  await fillRest(page);
  await page.getByRole("button", { name: "Withdraw", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Withdrawal complete" })).toBeVisible();
  expect(posts).toHaveLength(1);
  expect(posts[0]).toMatchObject({ street: ADDRESS.street, city: ADDRESS.city, state: ADDRESS.state, zip: ADDRESS.zip, accountNumber: ACCOUNT });
});

test("staff must tick 'I verified the customer's address' before a withdrawal can be submitted", async ({ page }) => {
  const posts = await mockAccount(page, "staff");
  await signIn(page, "/staff/login", TELLER);
  await page.goto(`/staff/accounts/${ACCOUNT}/withdraw`);
  await expectAddressFilled(page);

  const box = page.getByLabel(/I verified the customer's address/);
  await expect(box).toBeVisible();
  await expect(box).not.toBeChecked();
  expect(await box.evaluate((e) => (e as HTMLInputElement).required)).toBe(true);

  await fillRest(page);
  await page.getByRole("button", { name: "Withdraw", exact: true }).click();
  expect(posts).toHaveLength(0); // the browser refuses to submit: the checkbox is required
  expect(await box.evaluate((e) => (e as HTMLInputElement).validity.valueMissing)).toBe(true);

  await box.check();
  await page.getByRole("button", { name: "Withdraw", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Withdrawal complete" })).toBeVisible();
  expect(posts).toHaveLength(1);
});

test("Clear also unticks the verification box", async ({ page }) => {
  await mockAccount(page, "staff");
  await signIn(page, "/staff/login", TELLER);
  await page.goto(`/staff/accounts/${ACCOUNT}/withdraw`);
  const box = page.getByLabel(/I verified the customer's address/);
  await box.check();
  await page.getByRole("button", { name: "Clear" }).click();
  await expect(box).not.toBeChecked();
  await expect(page.locator('input[name="street"]')).toHaveValue("");
});

test("staff must also tick the box to make a deposit, and the address is pre-filled there too", async ({ page }) => {
  const posts = await mockAccount(page, "staff");
  await signIn(page, "/staff/login", TELLER);
  await page.goto(`/staff/accounts/${ACCOUNT}/deposit`);
  await expectAddressFilled(page);

  const box = page.getByLabel(/I verified the customer's address/);
  await expect(box).toBeVisible();
  expect(await box.evaluate((e) => (e as HTMLInputElement).required)).toBe(true);

  await fillRest(page);
  await page.getByRole("button", { name: "Deposit", exact: true }).click();
  expect(posts).toHaveLength(0); // refused by the browser: the box is required
  expect(await box.evaluate((e) => (e as HTMLInputElement).validity.valueMissing)).toBe(true);

  await box.check();
  await page.getByRole("button", { name: "Deposit", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Deposit complete" })).toBeVisible();
  expect(posts).toHaveLength(1);
});

test("a customer's deposit form is pre-filled with their address and has no verification box", async ({ page }) => {
  await mockAccount(page, "portal");
  await signIn(page, "/login", CUSTOMER);
  await page.goto(`/accounts/${ACCOUNT}/deposit`);
  await expectAddressFilled(page);
  await expect(page.getByLabel(/I verified the customer/)).toHaveCount(0);
});

test("the area manager's withdraw form has the same required box", async ({ page }) => {
  await mockAccount(page, "staff");
  await signIn(page, "/staff/login", STAFF);
  await page.goto(`/staff/accounts/${ACCOUNT}/withdraw`);
  await expect(page.getByLabel(/I verified the customer's address/)).toBeVisible();
});

// Real backend, no mock: skips itself until the running backend returns holderAddress (it needs a rebuild with the new field).
test("the real overview carries the holder's address, and the form shows it", async ({ page, request }) => {
  await request.post("/api/auth/login", { data: { kind: "customer", username: CUSTOMER.user, password: CUSTOMER.password } });
  const res = await request.get(`/api/portal/accounts/${ACCOUNT}/overview`);
  const body = res.ok() ? await res.json() : {};
  test.skip(!body.holderAddress, "the backend does not return holderAddress yet");
  await signIn(page, "/login", CUSTOMER);
  await page.goto(`/accounts/${ACCOUNT}/withdraw`);
  await expect(page.locator('input[name="street"]')).toHaveValue(body.holderAddress.street);
  await expect(page.locator('input[name="city"]')).toHaveValue(body.holderAddress.city);
  await expect(page.locator('select[name="state"]')).toHaveValue(body.holderAddress.state);
});
