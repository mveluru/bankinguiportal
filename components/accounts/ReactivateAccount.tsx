"use client";

import Link from "next/link";
import { useState } from "react";
import { can } from "@/components/AuthProvider";
import { useStaffAccount } from "@/components/accounts/useStaffAccount";
import { ErrorMessage, Loading } from "@/components/StateBlock";
import { reactivateAccount } from "@/lib/api";
import { accountHref, accountLabel, formatMoney, formatSuspendedUntil } from "@/lib/format";

/** Staff only (managers and area managers, REACTIVATE_ACCOUNT): lift an account's suspension so it can transact again. */
export default function ReactivateAccount() {
  const { accountNumber, account, setAccount, error, setError, permitted } = useStaffAccount((u) => can(u, "REACTIVATE_ACCOUNT"));
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onReactivate() {
    setSubmitting(true);
    setError(null);
    try {
      setAccount(await reactivateAccount(accountNumber));
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const back = (
    <Link href={accountHref("staff", accountNumber)} className="tap">
      ← Back to account
    </Link>
  );

  if (!permitted) return <Loading />;
  if (!account) return error ? <ErrorMessage message={error} /> : <Loading />;

  return (
    <>
      {back}
      <h1>Reactivate account</h1>
      <p className="muted">
        {accountLabel(account.accountType)} {account.accountNumber} · balance {formatMoney(account.balance)}
      </p>
      {done ? (
        <p role="status">Account reactivated. It accepts deposits and withdrawals again.</p>
      ) : account.suspended ? (
        <>
          <p className="error">Suspended {formatSuspendedUntil(account.suspendedUntil)}. Deposits and withdrawals are blocked until it is reactivated.</p>
          {error && <ErrorMessage message={error} />}
          <button type="button" disabled={submitting} onClick={onReactivate}>
            {submitting ? "Reactivating…" : "Reactivate account"}
          </button>
        </>
      ) : (
        <p className="muted">This account is not suspended.</p>
      )}
    </>
  );
}
