import type {
  AccountOverviewResponse,
  AccountResult,
  BankStatement,
  DepositRequest,
  WithdrawRequest,
  AccountRegistrationRequest,
  OpenAccountResponse,
  PortalHomeResponse,
  SuspendAccountRequest,
  UpdateSuspensionRequest,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081/brite";
// Path prefix of the backend's BFF endpoints, per environment (NEXT_PUBLIC_*: inlined at build time).
const PORTAL = (process.env.NEXT_PUBLIC_BFF_PORTAL_PATH ?? "/bff/v1/portal").replace(/\/+$/, "");
// Set from the logged-in user by AuthProvider; falls back to the env default (rate-limit key only).
let customerId = process.env.NEXT_PUBLIC_CUSTOMER_ID ?? "demo-customer";
export const setCustomerId = (id: string | null) => {
  customerId = id ?? process.env.NEXT_PUBLIC_CUSTOMER_ID ?? "demo-customer";
};

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
      headers: { "Content-Type": "application/json", "X-Customer-Id": customerId, ...init?.headers },
    });
  } catch {
    // A 429 from the rate-limit filter carries no CORS headers, so it surfaces as a network error too.
    throw new ApiError("Cannot reach the banking service. It may be down, or you may be rate limited.");
  }
  if (!res.ok) throw new ApiError(await errorMessage(res));
  return res.json();
}

export const getHome = (state?: string) =>
  request<PortalHomeResponse>(`${PORTAL}/home${state ? `?state=${encodeURIComponent(state)}` : ""}`);

export const getOverview = (accountNumber: string, days?: number) =>
  request<AccountOverviewResponse>(
    `${PORTAL}/accounts/${encodeURIComponent(accountNumber)}/overview${days ? `?days=${days}` : ""}`,
  );

export const openAccount = (body: AccountRegistrationRequest) =>
  request<OpenAccountResponse>(`${PORTAL}/accounts/open`, { method: "POST", body: JSON.stringify(body) });

const accountPath = (n: string) => `${PORTAL}/accounts/${encodeURIComponent(n)}`;

/** Suspended accounts reject every withdraw/deposit until reactivated. Returns the refreshed overview. */
export const suspendAccount = (accountNumber: string, body: SuspendAccountRequest) =>
  request<AccountOverviewResponse>(`${accountPath(accountNumber)}/suspend`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateSuspension = (accountNumber: string, body: UpdateSuspensionRequest) =>
  request<AccountOverviewResponse>(`${accountPath(accountNumber)}/suspension`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const reactivateAccount = (accountNumber: string) =>
  request<AccountOverviewResponse>(`${accountPath(accountNumber)}/reactivate`, { method: "POST" });

const overviewToResult = (o: AccountOverviewResponse): AccountResult => ({
  accountNumber: o.accountNumber,
  accountType: o.accountType,
  balance: o.balance,
});

// BFF endpoints: the backend validates the holder's name and address, and returns the refreshed overview.
export const withdraw = (body: WithdrawRequest) =>
  request<AccountOverviewResponse>(`${PORTAL}/accounts/withdraw`, {
    method: "POST",
    body: JSON.stringify(body),
  }).then(overviewToResult);

export const deposit = (body: DepositRequest) =>
  request<AccountOverviewResponse>(`${PORTAL}/accounts/deposit`, {
    method: "POST",
    body: JSON.stringify(body),
  }).then(overviewToResult);

/**
 * Side effect: the backend emails/SMSes the statement (hence a POST), so only call this on an explicit user action.
 */
export const getStatement = (accountNumber: string, beginDate: string, endDate: string) =>
  request<BankStatement>(`${accountPath(accountNumber)}/statement?beginDate=${beginDate}&endDate=${endDate}`, {
    method: "POST",
  });

/** Irreversible: the backend has no reopen operation and does not require a zero balance. Returns the refreshed overview. */
export const closeAccount = (accountNumber: string) =>
  request<AccountOverviewResponse>(`${accountPath(accountNumber)}/close`, { method: "POST" });
