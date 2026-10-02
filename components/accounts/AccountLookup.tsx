"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import AccountDetail from "@/components/accounts/AccountDetail";
import type { PortalKind } from "@/lib/types";

/**
 * "Go to account number" plus the big square box that shows the account (scrollable both ways) when View is pressed, on the same
 * screen. Staff type any account number (16 characters at most, blank to start). A customer can only ever look at their own
 * account(s): the box is filled in with their account id and cannot be changed (one account), or is a list of just their accounts.
 * The backend refuses anyone else's account anyway; this keeps the screen from offering it.
 */
export default function AccountLookup({ kind }: { kind: PortalKind }) {
  const { user } = useAuth();
  const own = kind === "customer" ? (user?.accountNumbers ?? []) : [];
  const [entered, setEntered] = useState("");
  const [shown, setShown] = useState<string | null>(null);
  const customer = kind === "customer";
  const value = customer ? (own.includes(entered) ? entered : own[0] ?? "") : entered;

  return (
    <div className="lookup-layout">
      <form
        className="row lookup"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) setShown(value.trim());
        }}
      >
        <label>
          Go to account number
          {customer && own.length > 1 ? (
            <select value={value} onChange={(e) => setEntered(e.target.value)}>
              {own.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          ) : (
            <input value={value} readOnly={customer} onChange={(e) => setEntered(e.target.value)} maxLength={16} autoComplete="off" />
          )}
        </label>
        <button type="submit" disabled={!value.trim()}>View</button>
      </form>
      {shown && (
        <section className="account-box" aria-label={`Account ${shown}`} tabIndex={0}>
          <AccountDetail key={shown} kind={kind} accountNumber={shown} embedded />
        </section>
      )}
    </div>
  );
}
