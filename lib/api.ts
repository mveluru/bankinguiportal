import type {
  AccountOverviewResponse,
  AccountApiResponse,
  AccountResult,
  BankStatement,
  DepositRequest,
  WithdrawRequest,
  AccountRegistrationRequest,
  OpenAccountResponse,
  PortalHomeResponse,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081/brite";
const CUSTOMER_ID = process.env.NEXT_PUBLIC_CUSTOMER_ID ?? "demo-customer";

export class ApiError extends Error {}

/** Business-rule failures come back as plain text, bean-validation failures as Spring's JSON error. */
async function errorMessage(res: Response): Promise<string> {
  const body = await res.text();
  try {
    const json = JSON.parse(body);
    const fields = Array.isArray(json.errors)
      ? json.errors.map((e: { defaultMessage?: string }) => e.defaultMessage).filter(Boolean)
      : [];
    return fields.length ? fields.join("; ") : json.message ?? json.error ?? body;
  } catch {
    return body || `Request failed (${res.status})`;
  }
}

async function request<T>(path: string, init?: RequestInit, base = BASE): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      ...init,
      cache: "no-store",
      headers: { "Content-Type": "application/json", "X-Customer-Id": CUSTOMER_ID, ...init?.headers },
    });
  } catch {
    // A 429 from the rate-limit filter carries no CORS headers, so it surfaces as a network error too.
    throw new ApiError("Cannot reach the banking service. It may be down, or you may be rate limited.");
  }
  if (!res.ok) throw new ApiError(await errorMessage(res));
  return res.json();
}

export const getHome = (state?: string) =>
  request<PortalHomeResponse>(`/bff/v1/portal/home${state ? `?state=${encodeURIComponent(state)}` : ""}`);

export const getOverview = (accountNumber: string, days?: number) =>
  request<AccountOverviewResponse>(
    `/bff/v1/portal/accounts/${encodeURIComponent(accountNumber)}/overview${days ? `?days=${days}` : ""}`,
  );

export const openAccount = (body: AccountRegistrationRequest) =>
  request<OpenAccountResponse>("/bff/v1/portal/accounts/open", { method: "POST", body: JSON.stringify(body) });

// Non-BFF endpoints go through the Next.js rewrite (same origin, so no CORS).
const PROXY = "/api/banking";

const toResult = (a: AccountApiResponse): AccountResult => ({
  accountNumber: (a.checkingAccountNumber ?? a.savingAccountNumber) as string,
  accountType: a.accountType,
  balance: (a.checkingBalance ?? a.savingBalance) as number,
});

export const withdraw = (body: WithdrawRequest) =>
  request<AccountApiResponse>("/v1/api/accounts/withdraw", { method: "POST", body: JSON.stringify(body) }, PROXY).then(
    toResult,
  );

export const deposit = (body: DepositRequest) =>
  request<AccountApiResponse>("/v1/api/accounts/deposit", { method: "POST", body: JSON.stringify(body) }, PROXY).then(
    toResult,
  );

/** Side effect: the backend emails/SMSes the statement, so only call this on an explicit user action. */
export const getStatement = (accountNumber: string, beginDate: string, endDate: string) =>
  request<BankStatement>(
    `/v1/api/accounts/${encodeURIComponent(accountNumber)}/statement?beginDate=${beginDate}&endDate=${endDate}`,
    undefined,
    PROXY,
  );

/** Irreversible: the backend has no reopen operation and does not require a zero balance. */
export const closeAccount = (accountNumber: string) =>
  request<AccountApiResponse>(
    `/v1/api/accounts/${encodeURIComponent(accountNumber)}/close`,
    { method: "POST" },
    PROXY,
  ).then(toResult);
