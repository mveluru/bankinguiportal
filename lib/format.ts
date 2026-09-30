const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
export const formatMoney = (n: number) => money.format(n);

const ACCOUNT_LABELS: Record<string, string> = {
  CHECKING: "Checking",
  SAVINGS: "Savings",
  INVESTMENT: "Brokerage Investment",
  RETIREMENT: "Retirement Portfolio",
  CREDIT_OR_LOAN: "Line of Credit / Loan",
};
export const accountLabel = (t: string) => ACCOUNT_LABELS[t] ?? t;
export const titleCase = (s: string) =>
  s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
