// Mirrors the BFF DTOs in springbootexampleprojects (org.bee.banking.bff.dto).
export type AccountType = "CHECKING" | "SAVINGS" | "INVESTMENT" | "RETIREMENT" | "CREDIT_OR_LOAN";
export type AccountStatus = "ACTIVE" | "CLOSED";

export interface PortalAccountSummary {
  accountNumber: string;
  accountType: AccountType;
  accountStatus: AccountStatus;
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
  createdDate: string;
  closedDate: string | null;
  firstName: string;
  lastName: string;
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
  dateOfBirth: string; // MM/dd/yyyy
  street: string;
  city: string;
  state: string; // two uppercase letters
  zip: string; // five digits
  addressLine1: string;
  addressLine2?: string;
  accountType: string;
}
