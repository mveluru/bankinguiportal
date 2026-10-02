// Mirrors the BFF DTOs in bankingservices (org.bee.banking.bff.dto).
export type AccountType = "CHECKING" | "SAVINGS" | "INVESTMENT" | "RETIREMENT" | "CREDIT_OR_LOAN";
// INACTIVE and DORMANT are set by hand on the backend for now: no transactions, and a holder with no ACTIVE account cannot sign in.
export type AccountStatus = "ACTIVE" | "SUSPENDED" | "CLOSED" | "INACTIVE" | "DORMANT";

export interface PortalAccountSummary {
  accountNumber: string;
  accountType: AccountType;
  accountStatus: AccountStatus;
  suspended: boolean;
  suspendedUntil: string | null; // ISO local date-time; null = indefinite
  createdDate: string;
  closedDate: string | null;
  firstName: string;
  lastName: string;
}

export interface PortalLocation {
  id: number;
  name: string;
  locationType: "OFFICE" | "ATM" | "BOTH";
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
  opensAt: string | null;
  closesAt: string | null;
  timeZone: string | null;
  phoneNumber: string | null;
  services: string[];
}

export interface PortalHomeResponse {
  totalActiveAccounts: number;
  totalSuspendedAccounts: number;
  accounts: PortalAccountSummary[];
  nearbyLocations: PortalLocation[];
}

export interface PortalActivityItem {
  transactionType: "DEPOSIT" | "WITHDRAWAL";
  amount: number;
  balanceAfter: number;
  transactionDate: string;
  depositType: string | null;
}

/** The account holder's address on file (from the overview), used to pre-fill the holder fields of a withdraw or deposit. */
export interface HolderAddress {
  street: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string | null;
}

export interface AccountOverviewResponse {
  accountNumber: string;
  accountType: AccountType;
  accountStatus: AccountStatus;
  balance: number;
  suspended: boolean;
  suspendedUntil: string | null; // ISO local date-time; null = indefinite
  createdDate: string;
  closedDate: string | null;
  firstName: string;
  lastName: string;
  maskedPhoneNumber: string | null; // ***-***-0101; null if none on file
  holderAddress?: HolderAddress | null; // absent on an older backend; null if no address is on file
  activityDays: number;
  recentActivity: PortalActivityItem[];
}

export interface OpenAccountResponse {
  account: AccountOverviewResponse;
  nearbyLocations: PortalLocation[];
}

export interface AccountRegistrationRequest {
  firstName: string;
  lastName: string;
  phoneNumber: string; // ###-###-####
  dateOfBirth: string; // MM/dd/yyyy
  street: string;
  city: string;
  state: string; // two uppercase letters
  zip: string; // five digits
  addressLine1: string;
  addressLine2?: string;
  accountType: string;
}

export interface SuspendAccountRequest {
  notes: string; // required, max 500
  startDateTime?: string; // ISO local date-time, not in the future; omitted = now
  endDateTime?: string; // ISO local date-time, in the future; omitted = indefinite
}

export interface UpdateSuspensionRequest {
  notes?: string;
  endDateTime?: string;
}

export interface AccountHolderDetails {
  firstName: string; // letters only
  lastName: string;
  street: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zip: string;
}

export interface WithdrawRequest extends AccountHolderDetails {
  accountNumber: string;
  accountType: AccountType;
  withdrawAmount: number;
}

export interface DepositRequest extends AccountHolderDetails {
  accountNumber: string;
  accountType: AccountType;
  amount: number;
  depositType: "cash" | "check";
}

/** Normalised result of withdraw/deposit. */
export interface AccountResult {
  accountNumber: string;
  accountType: AccountType;
  balance: number;
}

export interface AccountTransaction {
  accountNumber: string;
  transactionType: "DEPOSIT" | "WITHDRAWAL";
  amount: number;
  balanceAfter: number;
  transactionDate: string;
  depositType: string | null;
}

export interface BankStatement {
  accountNumber: string;
  beginDate: string;
  endDate: string;
  transactions: AccountTransaction[];
}

// --- Auth, staff portal and credentials (org.brite.banking.bff.dto / domain / request) ---
export type PortalKind = "customer" | "staff";
export type EmployeeRole = "TELLER" | "MANAGER" | "AREA_MANAGER";
export type EmployeeStatus = "ACTIVE" | "ON_LEAVE" | "TERMINATED";
export type LoginStatus = "ACTIVE" | "INACTIVE" | "LOCKED" | "SUSPENDED";
export type EmployeePrivilege =
  | "VIEW_ACCOUNT"
  | "DEPOSIT"
  | "WITHDRAW"
  | "OPEN_ACCOUNT"
  | "SUSPEND_ACCOUNT"
  | "UPDATE_SUSPENSION"
  | "REACTIVATE_ACCOUNT"
  | "CLOSE_ACCOUNT"
  | "VIEW_BRANCH_REPORTS"
  | "MANAGE_EMPLOYEES"
  | "MANAGE_CUSTOMER_LOGINS";

export interface PortalEmployee {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  role: EmployeeRole;
  jobTitle: string | null;
  status: EmployeeStatus;
  hireDate: string | null;
  bankLocationId: number | null;
  region: string | null;
  privileges: EmployeePrivilege[];
}

/** A daily request limit and today's usage: the same shape for a customer and for an employee. */
export interface RateLimitView {
  dailyLimit: number; // the limit that applies today
  customLimit: number | null; // their own limit; null = on the default
  defaultLimit: number;
  usageDate: string;
  requestsToday: number; // counted against their token
  remainingToday: number;
  loginsToday: number; // successful sign-ins today
}

/** GET/PUT /staff/customers/{id}/rate-limit */
export interface CustomerRateLimitView extends RateLimitView {
  customerId: number;
}

/** GET/PUT /staff/employees/{employeeNumber}/rate-limit */
export interface EmployeeRateLimitView extends RateLimitView {
  employeeNumber: string;
}

/** Spring Data page, as returned by GET /staff/employees. */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // zero-based page index
  size: number;
}

export interface LoginStatusView {
  username: string;
  status: LoginStatus;
  statusReason: string | null;
  statusChangedAt: string | null;
  lockedUntil: string | null;
}

export interface SecurityQuestionView {
  question: string; // catalog code, e.g. FIRST_CAR
  text: string;
}

export interface SecurityAnswer {
  question: string;
  answer: string;
}

/** The signed-in user as the browser sees it. The JWT itself stays in an httpOnly cookie. */
export interface SessionUser {
  kind: PortalKind;
  username: string;
  displayName: string;
  customerId?: number; // customers
  customerSince?: number; // customers: year of their earliest account (display only)
  accountNumbers?: string[]; // customers: their own accounts at sign-in, oldest first (display and defaults only; the backend enforces ownership)
  employeeNumber?: string; // staff
  role?: EmployeeRole;
  privileges?: EmployeePrivilege[];
  branch?: PortalLocation | null; // staff: null for an area manager
  sessionExpires: number; // epoch ms, from the token's exp claim
}
