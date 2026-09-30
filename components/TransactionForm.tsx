"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { deposit, getOverview, withdraw } from "@/lib/api";
import { accountLabel, formatMoney } from "@/lib/format";
import type { AccountOverviewResponse, AccountResult } from "@/lib/types";
import { ErrorMessage, Loading } from "@/components/StateBlock";

const SUPPORTED = ["CHECKING", "SAVINGS"];

/**
 * Shared withdraw/deposit form. The backend validates (but does not use) the holder's name and
 * address, so we collect them; names are prefilled from the account overview.
 */
export default function TransactionForm({ kind }: { kind: "withdraw" | "deposit" }) {
  const { accountNumber } = useParams<{ accountNumber: string }>();
  const [account, setAccount] = useState<AccountOverviewResponse | null>(null);
  const [result, setResult] = useState<AccountResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isWithdraw = kind === "withdraw";

  useEffect(() => {
    let cancelled = false;
    getOverview(accountNumber)
      .then((a) => !cancelled && setAccount(a))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [accountNumber]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!account) return;
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const holder = {
      firstName: get("firstName"),
      lastName: get("lastName"),
      street: get("street"),
      addressLine1: get("addressLine1"),
      addressLine2: get("addressLine2") || undefined,
      city: get("city"),
      state: get("state").toUpperCase(),
      zip: get("zip"),
    };
    const amount = Number(get("amount"));
    setSubmitting(true);
    setError(null);
    try {
      setResult(
        isWithdraw
          ? await withdraw({ ...holder, accountNumber, accountType: account.accountType, withdrawAmount: amount })
          : await deposit({
              ...holder,
              accountNumber,
              accountType: account.accountType,
              amount,
              depositType: get("depositType") as "cash" | "check",
            }),
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!account) return error ? <ErrorMessage message={error} /> : <Loading />;

  const back = (
    <Link href={`/accounts/${accountNumber}`} className="tap">
      ← Back to account
    </Link>
  );

  if (account.accountStatus === "CLOSED" || !SUPPORTED.includes(account.accountType)) {
    return (
      <>
        {back}
        <p className="error">
          {account.accountStatus === "CLOSED"
            ? "This account is closed and cannot be used for transactions."
            : `${accountLabel(account.accountType)} accounts don't support ${kind}s.`}
        </p>
      </>
    );
  }

  if (result) {
    return (
      <>
        <h1>{isWithdraw ? "Withdrawal" : "Deposit"} complete</h1>
        <p>
          New balance for {result.accountNumber}: <strong>{formatMoney(result.balance)}</strong>
        </p>
        {back}
      </>
    );
  }

  return (
    <>
      {back}
      <h1>{isWithdraw ? "Withdraw funds" : "Deposit funds"}</h1>
      <p className="muted">
        {accountLabel(account.accountType)} {account.accountNumber} · balance {formatMoney(account.balance)}
      </p>
      <form className="stack" onSubmit={onSubmit}>
        <label>
          Amount (USD)
          <input name="amount" type="number" step="0.01" min="0.01" required />
        </label>
        {!isWithdraw && (
          <label>
            Deposit type
            <select name="depositType" defaultValue="check">
              <option value="check">Check</option>
              <option value="cash">Cash (max $5,000)</option>
            </select>
          </label>
        )}
        <h2 style={{ margin: "8px 0 0" }}>Account holder</h2>
        <label>First name<input name="firstName" required maxLength={50} pattern="[A-Za-z]+" defaultValue={account.firstName} /></label>
        <label>Last name<input name="lastName" required maxLength={25} pattern="[A-Za-z]+" defaultValue={account.lastName} /></label>
        <label>Street<input name="street" required /></label>
        <label>Address line 1<input name="addressLine1" required maxLength={50} /></label>
        <label>Address line 2<input name="addressLine2" /></label>
        <label>City<input name="city" required maxLength={50} /></label>
        <label>State<input name="state" required maxLength={2} pattern="[A-Za-z]{2}" placeholder="TX" /></label>
        <label>ZIP<input name="zip" required pattern="\d{5}" maxLength={5} /></label>
        {error && <ErrorMessage message={error} />}
        <button type="submit" disabled={submitting}>
          {submitting ? "Submitting…" : isWithdraw ? "Withdraw" : "Deposit"}
        </button>
      </form>
    </>
  );
}
