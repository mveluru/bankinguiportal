// Mirrors the BFF DTOs in springbootexampleprojects (org.bee.banking.bff.dto).
export type AccountType = "CHECKING" | "SAVINGS" | "INVESTMENT" | "RETIREMENT" | "CREDIT_OR_LOAN";
export type AccountStatus = "ACTIVE" | "SUSPENDED" | "CLOSED";

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

/** Raw Account returned by withdraw/deposit: only the balance matching the account type is set. */
export interface AccountApiResponse {
  checkingAccountNumber: string | null;
  savingAccountNumber: string | null;
  checkingBalance: number | null;
  savingBalance: number | null;
  accountType: AccountType;
  accountStatus: AccountStatus;
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
