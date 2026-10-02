"use client";

import { useState } from "react";
import AccountDetail from "@/components/accounts/AccountDetail";
import type { PortalKind } from "@/lib/types";

/**
 * "Go to account number": the box takes an account number (16 characters at most, nothing preset); View shows that account's
 * details in a big square box on the right of the same screen, scrollable both ways, without leaving the page. The box's own
 * links lead on to the account's full screens (deposit, withdraw, statement, ...).
 */
export default function AccountLookup({ kind }: { kind: PortalKind }) {
  const [entered, setEntered] = useState("");
  const [shown, setShown] = useState<string | null>(null);

  return (
    <div className="lookup-layout">
      <form
        className="row lookup"
        onSubmit={(e) => {
          e.preventDefault();
          if (entered.trim()) setShown(entered.trim());
        }}
      >
        <label>
          Go to account number
          <input value={entered} onChange={(e) => setEntered(e.target.value)} maxLength={16} autoComplete="off" />
        </label>
        <button type="submit">View</button>
      </form>
      {shown && (
        <section className="account-box" aria-label={`Account ${shown}`} tabIndex={0}>
          <AccountDetail key={shown} kind={kind} accountNumber={shown} embedded />
        </section>
      )}
    </div>
  );
}
