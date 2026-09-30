"use client";

import Link from "next/link";
import { useState } from "react";
import { openAccount } from "@/lib/api";
import { accountLabel } from "@/lib/format";
import type { AccountRegistrationRequest, OpenAccountResponse } from "@/lib/types";
import LocationCard from "@/components/LocationCard";
import { ErrorMessage } from "@/components/StateBlock";

const ACCOUNT_TYPES = ["CHECKING", "SAVINGS", "INVESTMENT", "RETIREMENT", "CREDIT_OR_LOAN"];

/** <input type="date"> yields yyyy-MM-dd; the API wants MM/dd/yyyy. */
const toApiDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
};

export default function OpenAccountPage() {
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
          Your new {accountLabel(a.accountType)} account is{" "}
          <Link href={`/accounts/${a.accountNumber}`}>{a.accountNumber}</Link>.
        </p>
        <h2>Branches &amp; ATMs in {result.nearbyLocations[0]?.state ?? "your state"}</h2>
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
      <form className="stack" onSubmit={onSubmit}>
        <label>First name<input name="firstName" required maxLength={50} /></label>
        <label>Last name<input name="lastName" required maxLength={50} /></label>
        <label>Date of birth<input name="dateOfBirth" type="date" required min="1940-01-01" /></label>
        <label>Address line 1<input name="addressLine1" required maxLength={50} /></label>
        <label>Address line 2<input name="addressLine2" /></label>
        <label>Street<input name="street" required /></label>
        <label>City<input name="city" required /></label>
        <label>State<input name="state" required maxLength={2} pattern="[A-Za-z]{2}" placeholder="TX" /></label>
        <label>ZIP<input name="zip" required pattern="\d{5}" maxLength={5} /></label>
        <label>
          Account type
          <select name="accountType" defaultValue="CHECKING">
            {ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>{accountLabel(t)}</option>
            ))}
          </select>
        </label>
        {error && <ErrorMessage message={error} />}
        <p className="muted" style={{ margin: 0 }}>
          By opening an account you agree to the <Link href="/terms">Terms of Use</Link> and acknowledge the{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
        <button type="submit" disabled={submitting}>{submitting ? "Opening…" : "Open account"}</button>
      </form>
    </>
  );
}
