"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { accountsApi } from "@/lib/api";
import { accountHref, accountLabel, formatMoney, formatSuspendedUntil } from "@/lib/format";
import type { AccountOverviewResponse, AccountResult, PortalKind } from "@/lib/types";
import HolderFields, { clearFormFields } from "@/components/HolderFields";
import { ErrorMessage, Loading } from "@/components/StateBlock";

const SUPPORTED = ["CHECKING", "SAVINGS"];

/**
 * Shared withdraw/deposit form. The backend validates (but does not use) the holder's name and
 * address, so we collect them; names are prefilled from the account overview.
 */
export default function TransactionForm({ kind, portal = "customer" }: { kind: "withdraw" | "deposit"; portal?: PortalKind }) {
  const { accountNumber } = useParams<{ accountNumber: string }>();
  const { user } = useAuth();
  const { getOverview, deposit, withdraw } = accountsApi(portal);
  // An area manager has no home branch, so the transaction must name the branch/ATM that handled it.
  const needsLocation = portal === "staff" && user?.branch === null;
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
  }, [accountNumber, portal]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const locationId = get("locationId") ? Number(get("locationId")) : undefined;
    setSubmitting(true);
    setError(null);
    try {
      setResult(
        isWithdraw
          ? await withdraw({ ...holder, accountNumber, accountType: account.accountType, withdrawAmount: amount }, locationId)
          : await deposit({
              ...holder,
              accountNumber,
              accountType: account.accountType,
              amount,
              depositType: get("depositType") as "cash" | "check",
            }, locationId),
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function clearForm(form: HTMLFormElement) {
    clearFormFields(form);
    setError(null);
  }

  if (!account) return error ? <ErrorMessage message={error} /> : <Loading />;

  const back = (
    <Link href={accountHref(portal, accountNumber)} className="tap">
      ← Back to account
    </Link>
  );

  if (account.accountStatus !== "ACTIVE" || !SUPPORTED.includes(account.accountType)) {
    return (
      <>
        {back}
        <p className="error">
          {account.accountStatus === "CLOSED"
            ? "This account is closed and cannot be used for transactions."
            : account.accountStatus === "SUSPENDED"
            ? `This account is suspended ${formatSuspendedUntil(account.suspendedUntil)} and cannot be used for transactions until it is reactivated.`
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
        {accountLabel(account.accountType)} {account.accountNumber}
      </p>
      <form className="stack wide" onSubmit={onSubmit}>
        <p style={{ margin: 0 }}>
          Current Balance: <strong>{formatMoney(account.balance)}</strong>
        </p>
        <label>
          <span>Amount (USD)<span className="req">*</span></span>
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
        {needsLocation && (
          <label>
            <span>Branch / ATM id<span className="req">*</span></span>
            <input name="locationId" type="number" min="1" required />
          </label>
        )}
        <HolderFields defaultFirstName={account.firstName} defaultLastName={account.lastName} />
        {error && <ErrorMessage message={error} />}
        <div className="row actions">
          <button type="submit" disabled={submitting}>
            {submitting ? "Submitting…" : isWithdraw ? "Withdraw" : "Deposit"}
          </button>
          <button type="button" disabled={submitting} onClick={(e) => clearForm(e.currentTarget.form!)}>
            Clear
          </button>
        </div>
      </form>
    </>
  );
}
