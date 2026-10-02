"use client";

import { useEffect, useState } from "react";
import StatementViewer from "@/components/accounts/StatementViewer";
import { ErrorMessage, Loading } from "@/components/StateBlock";
import { getHome } from "@/lib/api";
import { accountLabel } from "@/lib/format";
import type { PortalAccountSummary } from "@/lib/types";

/** Statements: choose one of your accounts, then a date range. (Staff have no statement call in the backend.) */
export default function StatementsPage() {
  const [accounts, setAccounts] = useState<PortalAccountSummary[] | null>(null);
  const [account, setAccount] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHome()
      .then((h) => {
        setAccounts(h.accounts); // no account is preselected: the customer picks one
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <>
      <h1>Statements</h1>
      {error && <ErrorMessage message={error} />}
      {!accounts && !error && <Loading />}
      {accounts && accounts.length === 0 && <p className="muted">You have no accounts to show a statement for.</p>}
      {accounts && accounts.length > 0 && (
        <>
          <label className="no-print" style={{ maxWidth: 420 }}>
            Account
            <select value={account} onChange={(e) => setAccount(e.target.value)}>
              <option value="" disabled>Select an account</option>
              {accounts.map((a) => (
                <option key={a.accountNumber} value={a.accountNumber}>
                  {accountLabel(a.accountType)} · {a.accountNumber}
                </option>
              ))}
            </select>
          </label>
          {account && <StatementViewer key={account} accountNumber={account} />}
        </>
      )}
    </>
  );
}
