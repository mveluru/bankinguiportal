"use client";

import Link from "next/link";
import { useState } from "react";
import { openAccount } from "@/lib/api";
import { accountHref, accountLabel } from "@/lib/format";
import type { AccountRegistrationRequest, OpenAccountResponse } from "@/lib/types";
import LocationCard from "@/components/LocationCard";
import HolderFields, { clearFormFields } from "@/components/HolderFields";
import { ErrorMessage } from "@/components/StateBlock";

const ACCOUNT_TYPES = ["CHECKING", "SAVINGS", "INVESTMENT", "RETIREMENT", "CREDIT_OR_LOAN"];

/** <input type="date"> yields yyyy-MM-dd; the API wants MM/dd/yyyy. */
const toApiDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
};

/** Staff only: open an account for a customer at the office (OPEN_ACCOUNT). The customer then needs a login (Customer logins). */
export default function OpenAccount() {
  const [result, setResult] = useState<OpenAccountResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const body: AccountRegistrationRequest = {
      firstName: get("firstName"),
      lastName: get("lastName"),
      phoneNumber: get("phone"),
      dateOfBirth: toApiDate(get("dateOfBirth")),
      addressLine1: get("addressLine1"),
      addressLine2: get("addressLine2") || undefined,
      street: get("street"),
      city: get("city"),
      state: get("state").toUpperCase(),
      zip: get("zip"),
      accountType: get("accountType"),
    };
    setSubmitting(true);
    setError(null);
    try {
      setResult(await openAccount(body));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    const a = result.account;
    return (
      <>
        <h1>Account opened</h1>
        <p>
          The new {accountLabel(a.accountType)} account for {a.firstName} {a.lastName} is{" "}
          <Link href={accountHref("staff", a.accountNumber)}>{a.accountNumber}</Link>.
        </p>
        <p className="muted">
          The customer can only sign in once they have a login: create one under <Link href="/staff/customers">Customer logins</Link>.
        </p>
        <h2>Branches &amp; ATMs in {result.nearbyLocations[0]?.state ?? "the customer's state"}</h2>
        <div className="grid">
          {result.nearbyLocations.map((l) => (
            <LocationCard key={l.id} loc={l} />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <h1>Open an account</h1>
      <form className="stack wide" onSubmit={onSubmit}>
        <label>
          Account type
          <select name="accountType" defaultValue="CHECKING">
            {ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>{accountLabel(t)}</option>
            ))}
          </select>
        </label>
        <HolderFields showDob />
        {error && <ErrorMessage message={error} />}
        <p className="muted" style={{ margin: 0 }}>
          Opening an account means the customer agrees to the <Link href="/terms">Terms of Use</Link> and acknowledges the{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
        <div className="row actions">
          <button type="submit" disabled={submitting}>{submitting ? "Opening…" : "Open account"}</button>
          <button
            type="button"
            disabled={submitting}
            onClick={(e) => {
              clearFormFields(e.currentTarget.form!);
              setError(null);
            }}
          >
            Clear
          </button>
        </div>
      </form>
    </>
  );
}
