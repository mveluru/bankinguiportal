import { readErrorMessage } from "@/lib/http-error";
import { announceRateLimit, clearRateLimitNotice } from "@/lib/rate-limit";
import type {
  AccountOverviewResponse,
  AccountRegistrationRequest,
  AccountResult,
  BankStatement,
  CustomerRateLimitView,
  EmployeeRateLimitView,
  DepositRequest,
  EmployeeRole,
  LoginStatus,
  LoginStatusView,
  OpenAccountResponse,
  Page,
  PortalEmployee,
  PortalHomeResponse,
  PortalKind,
  RateLimitView,
  SecurityAnswer,
  SecurityQuestionView,
  SuspendAccountRequest,
  UpdateSuspensionRequest,
  WithdrawRequest,
} from "./types";

// The browser only talks to its own origin. /api/portal/* and /api/staff/* are route handlers that add the session's
// Bearer token and forward to the backend BFF (/bff/v1/portal/*, /bff/v1/staff/*). See lib/bff-proxy.ts.
const ROOT: Record<PortalKind, string> = { customer: "/api/portal", staff: "/api/staff" };

export class ApiError extends Error {
  constructor(message: string, readonly status = 0) {
    super(message);
  }
}

// A 401 here means the token expired or was revoked (the proxy has cleared the cookies); the next page load sends the user to sign in.
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError("Cannot reach the portal server.");
  }
  if (!res.ok) {
    const message = await readErrorMessage(res);
    if (res.status === 429) announceRateLimit(message); // the daily request limit: one pop-up, never inline (see lib/rate-limit.ts)
    throw new ApiError(message, res.status);
  }
  clearRateLimitNotice(); // a success means the limit has reset
  return res.status === 204 ? (undefined as T) : res.json();
}

const send = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });
const acct = (kind: PortalKind, n: string) => `${ROOT[kind]}/accounts/${encodeURIComponent(n)}`;

const overviewToResult = (o: AccountOverviewResponse): AccountResult => ({
  accountNumber: o.accountNumber,
  accountType: o.accountType,
  balance: o.balance,
});

// --- Accounts: the same calls for both portals (a customer's own accounts, or any account for staff). ---
export const accountsApi = (kind: PortalKind) => ({
  getOverview: (accountNumber: string, days?: number) =>
    request<AccountOverviewResponse>(`${acct(kind, accountNumber)}/overview${days ? `?days=${days}` : ""}`),

  // The backend validates the holder's name and address and returns the refreshed overview. Staff may name the
  // branch/ATM (locationId); without it the transaction is recorded at their own branch.
  withdraw: (body: WithdrawRequest, locationId?: number) =>
    request<AccountOverviewResponse>(
      `${ROOT[kind]}/accounts/withdraw${locationId ? `?locationId=${locationId}` : ""}`,
      send("POST", body),
    ).then(overviewToResult),

  deposit: (body: DepositRequest, locationId?: number) =>
    request<AccountOverviewResponse>(
      `${ROOT[kind]}/accounts/deposit${locationId ? `?locationId=${locationId}` : ""}`,
      send("POST", body),
    ).then(overviewToResult),

  /** Irreversible: the backend has no reopen operation and does not require a zero balance. Returns the refreshed overview. */
  closeAccount: (accountNumber: string) => request<AccountOverviewResponse>(`${acct(kind, accountNumber)}/close`, send("POST")),
});

// --- Customer portal ---
export const getHome = (state?: string) =>
  request<PortalHomeResponse>(`${ROOT.customer}/home${state ? `?state=${encodeURIComponent(state)}` : ""}`);

/** Side effect: the backend emails/SMSes the statement (hence a POST), so only call this on an explicit user action. */
export const getStatement = (accountNumber: string, beginDate: string, endDate: string) =>
  request<BankStatement>(`${acct("customer", accountNumber)}/statement?beginDate=${beginDate}&endDate=${endDate}`, send("POST"));

// --- Staff portal ---
/** Opens an account for a customer at the office (OPEN_ACCOUNT). Returns the new account plus nearby branches. */
export const openAccount = (body: AccountRegistrationRequest) =>
  request<OpenAccountResponse>(`${ROOT.staff}/accounts/open`, send("POST", body));

/** Suspended accounts reject every withdraw/deposit until reactivated. Returns the refreshed overview. */
export const suspendAccount = (accountNumber: string, body: SuspendAccountRequest) =>
  request<AccountOverviewResponse>(`${acct("staff", accountNumber)}/suspend`, send("POST", body));

export const updateSuspension = (accountNumber: string, body: UpdateSuspensionRequest) =>
  request<AccountOverviewResponse>(`${acct("staff", accountNumber)}/suspension`, send("PATCH", body));

export const reactivateAccount = (accountNumber: string) =>
  request<AccountOverviewResponse>(`${acct("staff", accountNumber)}/reactivate`, send("POST"));

export const listEmployees = (opts: { role?: EmployeeRole | ""; page?: number; size?: number } = {}) => {
  const q = new URLSearchParams({ page: String(opts.page ?? 0), size: String(opts.size ?? 20) });
  if (opts.role) q.set("role", opts.role);
  return request<Page<PortalEmployee>>(`${ROOT.staff}/employees?${q}`);
};

export const getEmployee = (employeeNumber: string) =>
  request<PortalEmployee>(`${ROOT.staff}/employees/${encodeURIComponent(employeeNumber)}`);

export const setEmployeeLoginStatus = (employeeNumber: string, status: LoginStatus, reason?: string) =>
  request<LoginStatusView>(
    `${ROOT.staff}/employees/${encodeURIComponent(employeeNumber)}/login-status`,
    send("PUT", { status, reason: reason || undefined }),
  );

/** An employee's daily request limit and today's usage, including successful sign-ins (MANAGE_EMPLOYEES, area managers). */
export const getEmployeeRateLimit = (employeeNumber: string) =>
  request<EmployeeRateLimitView>(`${ROOT.staff}/employees/${encodeURIComponent(employeeNumber)}/rate-limit`);

/** Gives the employee their own daily limit (1 to 1,000,000), or null to put them back on the default. */
export const setEmployeeRateLimit = (employeeNumber: string, maxRequestsPerDay: number | null) =>
  request<EmployeeRateLimitView>(
    `${ROOT.staff}/employees/${encodeURIComponent(employeeNumber)}/rate-limit`,
    send("PUT", { maxRequestsPerDay }),
  );

export const setEmployeePassword = (employeeNumber: string, newPassword: string) =>
  request<void>(`${ROOT.staff}/employees/${encodeURIComponent(employeeNumber)}/password`, send("PUT", { newPassword }));

const customerLogin = (customerId: string, tail: string) => `${ROOT.staff}/customers/${encodeURIComponent(customerId)}/${tail}`;

export const createCustomerLogin = (customerId: string, username: string, password: string) =>
  request<LoginStatusView>(customerLogin(customerId, "login"), send("POST", { username, password }));

export const setCustomerLoginStatus = (customerId: string, status: LoginStatus, reason?: string) =>
  request<LoginStatusView>(customerLogin(customerId, "login-status"), send("PUT", { status, reason: reason || undefined }));

/** A customer's daily request limit and today's usage, including successful sign-ins (MANAGE_CUSTOMER_LOGINS). */
export const getCustomerRateLimit = (customerId: string) =>
  request<CustomerRateLimitView>(customerLogin(customerId, "rate-limit"));

/** Gives the customer their own daily limit (1 to 1,000,000), or null to put them back on the default. */
export const setCustomerRateLimit = (customerId: string, maxRequestsPerDay: number | null) =>
  request<CustomerRateLimitView>(customerLogin(customerId, "rate-limit"), send("PUT", { maxRequestsPerDay }));

export const setCustomerPassword = (customerId: string, newPassword: string) =>
  request<void>(customerLogin(customerId, "password"), send("PUT", { newPassword }));

/**
 * The signed-in user's own daily request usage and sign-ins today (customer: GET /portal/rate-limit; employee: GET /staff/rate-limit).
 * No privilege needed, and the call itself counts as one request, so ask once per page load, never on a timer.
 */
export const getMyUsage = (kind: PortalKind) => request<RateLimitView>(`${ROOT[kind]}/rate-limit`);

// --- Credentials: the same calls in both portals ---
export const credentialsApi = (kind: PortalKind) => ({
  /** Every token stops working afterwards (the proxy clears the cookies), so the caller must send the user to sign in. */
  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>(`${ROOT[kind]}/password`, send("PUT", { currentPassword, newPassword })),
  questionCatalog: () => request<SecurityQuestionView[]>(`${ROOT[kind]}/security-questions/catalog`),
  setSecurityQuestions: (currentPassword: string, answers: SecurityAnswer[]) =>
    request<SecurityQuestionView[]>(`${ROOT[kind]}/security-questions`, send("PUT", { currentPassword, answers })),
  resetQuestions: (username: string) =>
    request<SecurityQuestionView[]>(`${ROOT[kind]}/password-reset/questions`, send("POST", { username })),
  resetPassword: (username: string, answers: SecurityAnswer[], newPassword: string) =>
    request<void>(`${ROOT[kind]}/password-reset`, send("POST", { username, answers, newPassword })),
});
