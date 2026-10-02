"use client";

import { useCallback, useEffect, useState } from "react";
import { ErrorMessage, Loading } from "@/components/StateBlock";
import { getCustomerRateLimit, setCustomerRateLimit } from "@/lib/api";
import type { CustomerRateLimitView } from "@/lib/types";

const MAX = 1_000_000; // the backend's upper bound

/**
 * Staff (MANAGE_CUSTOMER_LOGINS): a customer's daily request limit and today's usage from the banking service, including how many
 * times they signed in today, so a manager can check sign-in activity and raise or reset the limit. The count is the backend's.
 */
export default function CustomerRateLimitPanel({ customerId }: { customerId: string }) {
  const [view, setView] = useState<CustomerRateLimitView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setError(null);
    return getCustomerRateLimit(customerId)
      .then(setView)
      .catch((e: Error) => setError(e.message));
  }, [customerId]);

  useEffect(() => {
    // Loads from the backend on mount; the setState calls happen when the request settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function save(max: number | null) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const v = await setCustomerRateLimit(customerId, max);
      setView(v);
      setMessage(max === null ? `Back on the default limit (${v.defaultLimit} requests a day).` : `Daily limit set to ${v.dailyLimit} requests.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!view) return error ? <ErrorMessage message={error} /> : <Loading />;

  const used = Math.min(100, Math.round((view.requestsToday / Math.max(view.dailyLimit, 1)) * 100));

  return (
    <section className="stack" aria-labelledby="rate-limit-heading">
      <h2 id="rate-limit-heading">Daily requests and sign-ins</h2>
      <p className="muted">
        {view.usageDate} · {view.customLimit === null ? `default limit (${view.defaultLimit} a day)` : `this customer's own limit (default is ${view.defaultLimit})`}
      </p>
      <dl className="rate-stats">
        <div><dt>Sign-ins today</dt><dd>{view.loginsToday}</dd></div>
        <div><dt>Requests today</dt><dd>{view.requestsToday}</dd></div>
        <div><dt>Remaining today</dt><dd>{view.remainingToday}</dd></div>
        <div><dt>Daily limit</dt><dd>{view.dailyLimit}</dd></div>
      </dl>
      <progress max={100} value={used} aria-label={`${used}% of today's requests used`} />
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          const raw = String(new FormData(e.currentTarget).get("limit") ?? "").trim();
          if (raw) void save(Number(raw));
        }}
      >
        <label>
          Set this customer&apos;s own daily limit
          <input name="limit" type="number" min={1} max={MAX} step={1} inputMode="numeric" />
        </label>
        <button type="submit" disabled={busy}>Set limit</button>
        <button type="button" className="secondary" disabled={busy || view.customLimit === null} onClick={() => save(null)}>
          Use default
        </button>
        <button type="button" className="secondary" disabled={busy} onClick={() => load()}>
          Refresh
        </button>
      </form>
      {message && <p role="status">{message}</p>}
      {error && <ErrorMessage message={error} />}
    </section>
  );
}
