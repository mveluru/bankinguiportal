"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { can, useAuth } from "@/components/AuthProvider";
import { accountsApi, reactivateAccount, suspendAccount, updateSuspension } from "@/lib/api";
import { accountHref, accountLabel, formatMoney, formatSuspendedUntil } from "@/lib/format";
import type { AccountOverviewResponse } from "@/lib/types";
import { ErrorMessage, Loading } from "@/components/StateBlock";

/** <input type="datetime-local"> yields yyyy-MM-ddTHH:mm; the API wants an ISO local date-time. */
const toApiDateTime = (v: string) => (v ? `${v}:00` : undefined);

/** Staff only: suspend an active account, or change / lift the current suspension. Each action needs its own privilege. */
export default function SuspendAccount() {
  const { accountNumber } = useParams<{ accountNumber: string }>();
  const { user } = useAuth();
  const { getOverview } = accountsApi("staff");
  const [account, setAccount] = useState<AccountOverviewResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
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
  }, [accountNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  async function run(action: () => Promise<AccountOverviewResponse>, done: string) {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      setAccount(await action());
      setMessage(done);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function onSuspend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    return run(
      () =>
        suspendAccount(accountNumber, {
          notes: get("notes"),
          startDateTime: toApiDateTime(get("startDateTime")),
          endDateTime: toApiDateTime(get("endDateTime")),
        }),
      "Account suspended.",
    );
  }

  function onUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    return run(
      () =>
        updateSuspension(accountNumber, {
          notes: get("notes") || undefined,
          endDateTime: toApiDateTime(get("endDateTime")),
        }),
      "Suspension updated.",
    );
  }

  const back = (
    <Link href={accountHref("staff", accountNumber)} className="tap">
      ← Back to account
    </Link>
  );

  if (!account) return error ? <ErrorMessage message={error} /> : <Loading />;

  if (account.accountStatus === "CLOSED") {
    return (
      <>
        {back}
        <p className="error">This account is closed and cannot be suspended.</p>
      </>
    );
  }

  if (account.suspended ? !can(user, "UPDATE_SUSPENSION") && !can(user, "REACTIVATE_ACCOUNT") : !can(user, "SUSPEND_ACCOUNT")) {
    return (
      <>
        {back}
        <p className="error">Your role does not allow {account.suspended ? "changing or lifting a suspension" : "suspending accounts"}. Ask a manager.</p>
      </>
    );
  }

  return (
    <>
      {back}
      <h1>{account.suspended ? "Manage suspension" : "Suspend account"}</h1>
      <p className="muted">
        {accountLabel(account.accountType)} {account.accountNumber} · balance {formatMoney(account.balance)}
      </p>
      {message && <p role="status">{message}</p>}
      {account.suspended ? (
        <>
          <p className="error">Suspended {formatSuspendedUntil(account.suspendedUntil)}.</p>
          <form className="stack wide" onSubmit={onUpdate}>
            <p className="muted">Leave a field empty to keep its current value. At least one is required.</p>
            <label>
              New end date and time
              <input name="endDateTime" type="datetime-local" />
            </label>
            <label>
              Notes
              <textarea name="notes" maxLength={500} rows={3} />
            </label>
            {error && <ErrorMessage message={error} />}
            <div className="row actions">
              {can(user, "UPDATE_SUSPENSION") && (
                <button type="submit" disabled={submitting}>
                  {submitting ? "Saving…" : "Update suspension"}
                </button>
              )}
              <button
                type="button"
                hidden={!can(user, "REACTIVATE_ACCOUNT")}
                disabled={submitting}
                onClick={() => run(() => reactivateAccount(accountNumber), "Account reactivated.")}
              >
                Reactivate account
              </button>
            </div>
          </form>
        </>
      ) : (
        <form className="stack wide" onSubmit={onSuspend}>
          <p className="muted">
            A suspended account rejects every deposit and withdrawal until it is reactivated or the end time passes.
          </p>
          <label>
            <span>Reason / notes<span className="req">*</span></span>
            <textarea name="notes" required maxLength={500} rows={3} />
          </label>
          <div className="row">
            <label>
              Start (optional, not in the future; default now)
              <input name="startDateTime" type="datetime-local" />
            </label>
            <label>
              End (optional; empty = indefinite)
              <input name="endDateTime" type="datetime-local" />
            </label>
          </div>
          {error && <ErrorMessage message={error} />}
          <button type="submit" disabled={submitting}>
            {submitting ? "Suspending…" : "Suspend account"}
          </button>
        </form>
      )}
    </>
  );
}
