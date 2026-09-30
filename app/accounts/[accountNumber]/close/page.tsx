"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { closeAccount, getOverview } from "@/lib/api";
import { accountLabel, formatMoney } from "@/lib/format";
import type { AccountOverviewResponse } from "@/lib/types";
import { ErrorMessage, Loading } from "@/components/StateBlock";

export default function CloseAccountPage() {
  const { accountNumber } = useParams<{ accountNumber: string }>();
  const [account, setAccount] = useState<AccountOverviewResponse | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [closed, setClosed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getOverview(accountNumber)
      .then((a) => !cancelled && setAccount(a))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [accountNumber]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await closeAccount(accountNumber);
      setClosed(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const back = (
    <Link href={`/accounts/${accountNumber}`} className="tap">
      ← Back to account
    </Link>
  );

  if (!account) return error ? <ErrorMessage message={error} /> : <Loading />;

  if (closed) {
    return (
      <>
        <h1>Account closed</h1>
        <p>{accountNumber} has been closed. This cannot be undone.</p>
        <div className="link-list">
          {back}
          <Link href="/" className="tap">
            Home
          </Link>
        </div>
      </>
    );
  }

  if (account.accountStatus === "CLOSED") {
    return (
      <>
        {back}
        <p className="error">This account is already closed.</p>
      </>
    );
  }

  return (
    <>
      {back}
      <h1>Close account</h1>
      <p className="muted">
        {accountLabel(account.accountType)} {account.accountNumber} · balance {formatMoney(account.balance)}
      </p>
      <p className="error">
        Closing an account is permanent — it cannot be reopened, and it will no longer accept deposits or withdrawals.
      </p>
      {account.balance > 0 && (
        <p className="error">
          <strong>This account still holds {formatMoney(account.balance)}.</strong> The bank does not check for a zero
          balance when closing, so withdraw your funds first.
        </p>
      )}
      <form className="stack" onSubmit={onSubmit}>
        <label>
          Type <strong>{account.accountNumber}</strong> to confirm
          <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
        </label>
        {error && <ErrorMessage message={error} />}
        <button type="submit" className="danger" disabled={submitting || confirmText.trim() !== account.accountNumber}>
          {submitting ? "Closing…" : "Permanently close account"}
        </button>
      </form>
    </>
  );
}
