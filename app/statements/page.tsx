"use client";

import { useState } from "react";
import StatementViewer from "@/components/accounts/StatementViewer";
import { useOwnAccounts } from "@/components/accounts/useOwnAccounts";
import { Loading } from "@/components/StateBlock";

/**
 * Statements: a customer's own account (the only one they can see), then a date range. With several accounts there is a short
 * list of just theirs. Staff have no statement call in the backend, so this is a customer screen.
 */
export default function StatementsPage() {
  const accounts = useOwnAccounts();
  const [chosen, setChosen] = useState("");
  const account = accounts?.includes(chosen) ? chosen : (accounts?.[0] ?? "");

  return (
    <>
      <h1>Statements</h1>
      {!accounts && <Loading />}
      {accounts && accounts.length === 0 && <p className="muted">You have no accounts to show a statement for.</p>}
      {accounts && accounts.length > 1 && (
        <label className="no-print" style={{ maxWidth: 420 }}>
          Account
          <select value={account} onChange={(e) => setChosen(e.target.value)}>
            {accounts.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      )}
      {account && <StatementViewer key={account} accountNumber={account} />}
    </>
  );
}
