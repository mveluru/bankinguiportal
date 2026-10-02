"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { accountsApi } from "@/lib/api";
import { accountHref, accountLabel, formatMoney } from "@/lib/format";
import type { AccountOverviewResponse, PortalKind } from "@/lib/types";
import { ErrorMessage, Loading } from "@/components/StateBlock";

export default function CloseAccount({ kind }: { kind: PortalKind }) {
  const { accountNumber } = useParams<{ accountNumber: string }>();
  const { getOverview, closeAccount } = accountsApi(kind);
  const [account, setAccount] = useState<AccountOverviewResponse | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [closed, setClosed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let cancelled = false;
    getOverview(accountNumber)
      .then((a) => !cancelled && setAccount(a))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [accountNumber, kind]); // eslint-disable-line react-hooks/exhaustive-deps

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    dialog.current?.showModal();
  }

  async function onConfirm() {
    dialog.current?.close();
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
    <Link href={accountHref(kind, accountNumber)} className="tap">
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
          <Link href={kind === "staff" ? "/staff" : "/"} className="tap">
            Dashboard
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
          balance when closing, so {kind === "staff" ? "withdraw the customer's funds" : "withdraw your funds"} first.
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

      <dialog ref={dialog} className="confirm" aria-labelledby="close-confirm-title">
        <h2 id="close-confirm-title" style={{ marginTop: 0 }}>Close this account?</h2>
        <p className="muted">
          Account {account.accountNumber} will be closed permanently. This cannot be undone.
        </p>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="secondary" onClick={() => dialog.current?.close()}>
            No
          </button>
          <button type="button" className="danger" onClick={onConfirm}>
            Yes
          </button>
        </div>
      </dialog>
    </>
  );
}
