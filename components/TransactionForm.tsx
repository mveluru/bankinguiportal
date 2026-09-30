"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { deposit, getOverview, withdraw } from "@/lib/api";
import { accountLabel, formatMoney } from "@/lib/format";
import type { AccountOverviewResponse, AccountResult } from "@/lib/types";
import { ErrorMessage, Loading } from "@/components/StateBlock";

const SUPPORTED = ["CHECKING", "SAVINGS"];

/** Keeps only digits (max 10) and shows them as 123-456-7890; a hyphen appears only once more digits follow it. */
function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6)].filter(Boolean).join("-");
}

/**
 * Shared withdraw/deposit form. The backend validates (but does not use) the holder's name and
 * address, so we collect them; names are prefilled from the account overview.
 */
export default function TransactionForm({ kind }: { kind: "withdraw" | "deposit" }) {
  const { accountNumber } = useParams<{ accountNumber: string }>();
  const [account, setAccount] = useState<AccountOverviewResponse | null>(null);
  const [result, setResult] = useState<AccountResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isWithdraw = kind === "withdraw";

  useEffect(() => {
    let cancelled = false;
    getOverview(accountNumber)
      .then((a) => !cancelled && setAccount(a))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [accountNumber]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!account) return;
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const holder = {
      firstName: get("firstName"),
      lastName: get("lastName"),
      street: get("street"),
      addressLine1: get("addressLine1"),
      addressLine2: get("addressLine2") || undefined,
      city: get("city"),
      state: get("state").toUpperCase(),
      zip: get("zip"),
    };
    const amount = Number(get("amount"));
    setSubmitting(true);
    setError(null);
    try {
      setResult(
        isWithdraw
          ? await withdraw({ ...holder, accountNumber, accountType: account.accountType, withdrawAmount: amount })
          : await deposit({
              ...holder,
              accountNumber,
              accountType: account.accountType,
              amount,
              depositType: get("depositType") as "cash" | "check",
            }),
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  /** Empties every field (unlike form.reset(), which would restore the prefilled names); Country goes back to USA. */
  function clearForm(form: HTMLFormElement) {
    for (const el of Array.from(form.elements)) {
      if (el instanceof HTMLInputElement) el.value = el.name === "country" ? "USA" : "";
      else if (el instanceof HTMLSelectElement) el.selectedIndex = 0;
    }
    setError(null);
  }

  if (!account) return error ? <ErrorMessage message={error} /> : <Loading />;

  const back = (
    <Link href={`/accounts/${accountNumber}`} className="tap">
      ← Back to account
    </Link>
  );

  if (account.accountStatus === "CLOSED" || !SUPPORTED.includes(account.accountType)) {
    return (
      <>
        {back}
        <p className="error">
          {account.accountStatus === "CLOSED"
            ? "This account is closed and cannot be used for transactions."
            : `${accountLabel(account.accountType)} accounts don't support ${kind}s.`}
        </p>
      </>
    );
  }

  if (result) {
    return (
      <>
        <h1>{isWithdraw ? "Withdrawal" : "Deposit"} complete</h1>
        <p>
          New balance for {result.accountNumber}: <strong>{formatMoney(result.balance)}</strong>
        </p>
        {back}
      </>
    );
  }

  return (
    <>
      {back}
      <h1>{isWithdraw ? "Withdraw funds" : "Deposit funds"}</h1>
      <p className="muted">
        {accountLabel(account.accountType)} {account.accountNumber} · balance {formatMoney(account.balance)}
      </p>
      <form className="stack wide" onSubmit={onSubmit}>
        <label>
          <span>Amount (USD)<span className="req">*</span></span>
          <input name="amount" type="number" step="0.01" min="0.01" required />
        </label>
        {!isWithdraw && (
          <label>
            Deposit type
            <select name="depositType" defaultValue="check">
              <option value="check">Check</option>
              <option value="cash">Cash (max $5,000)</option>
            </select>
          </label>
        )}
        <fieldset className="subsection">
          <legend>Account holder details</legend>
          <p className="muted req-note">
            <span className="req">*</span> indicates required
          </p>
          <div className="row">
            <label>
              <span>First name<span className="req">*</span></span>
              <input name="firstName" required maxLength={50} pattern="[A-Za-z]+" defaultValue={account.firstName} />
            </label>
            <label>
              Middle
              <input name="middleName" maxLength={50} />
            </label>
            <label>
              <span>Last name<span className="req">*</span></span>
              <input name="lastName" required maxLength={25} pattern="[A-Za-z]+" defaultValue={account.lastName} />
            </label>
          </div>
        </fieldset>
        <fieldset className="subsection">
          <legend>Address</legend>
          <div className="row">
            <label>
              <span>Street<span className="req">*</span></span>
              <input name="street" required />
            </label>
            <label>
              <span>Address line 1<span className="req">*</span></span>
              <input name="addressLine1" required maxLength={50} />
            </label>
            <label>
              Address line 2
              <input name="addressLine2" />
            </label>
          </div>
          <div className="row">
            <label>
              <span>City<span className="req">*</span></span>
              <input name="city" required maxLength={50} />
            </label>
            <label className="narrow">
              <span>State<span className="req">*</span></span>
              <input name="state" required maxLength={2} pattern="[A-Za-z]{2}" placeholder="TX" />
            </label>
            <label className="narrow">
              <span>ZIP<span className="req">*</span></span>
              <input
                name="zip"
                required
                pattern="\d{5}"
                maxLength={5}
                inputMode="numeric"
                autoComplete="postal-code"
                onInput={(e) => {
                  e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "");
                }}
              />
            </label>
            <label>
              <span>Country<span className="req">*</span></span>
              <input name="country" required maxLength={50} defaultValue="USA" autoComplete="country-name" />
            </label>
          </div>
        </fieldset>
        <fieldset className="subsection">
          <legend>Contact</legend>
          <div className="row">
            <label className="narrow-phone">
              <span>Phone number<span className="req">*</span></span>
              <input
                name="phone"
                required
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={12}
                pattern="\d{3}-\d{3}-\d{4}"
                placeholder="xxx-xxx-xxxx"
                title="Phone number as 123-456-7890"
                onInput={(e) => {
                  e.currentTarget.value = formatPhone(e.currentTarget.value);
                }}
              />
            </label>
          </div>
        </fieldset>
        {error && <ErrorMessage message={error} />}
        <div className="row actions">
          <button type="submit" disabled={submitting}>
            {submitting ? "Submitting…" : isWithdraw ? "Withdraw" : "Deposit"}
          </button>
          <button type="button" disabled={submitting} onClick={(e) => clearForm(e.currentTarget.form!)}>
            Clear
          </button>
        </div>
      </form>
    </>
  );
}
