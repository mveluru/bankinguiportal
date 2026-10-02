"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, getHome } from "@/lib/api";
import { accountLabel, formatSuspendedUntil } from "@/lib/format";
import type { PortalHomeResponse } from "@/lib/types";
import AccountLookup from "@/components/accounts/AccountLookup";
import Greeting, { useGreetingActive } from "@/components/Greeting";
import LocationCard from "@/components/LocationCard";
import { ErrorMessage, Loading } from "@/components/StateBlock";

export default function HomePage() {
  const welcome = useGreetingActive(); // "Welcome" goes away with the banner, after 20 seconds
  const [state, setState] = useState("");
  const [data, setData] = useState<PortalHomeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getHome(state.length === 2 ? state : undefined)
      .then((d) => !cancelled && (setData(d), setError(null), setSettled(true)))
      .catch((e: Error) => {
        if (cancelled) return;
        // The daily request limit has its own pop-up (RateLimitNotice); the screen itself shows nothing about it.
        if (!(e instanceof ApiError && e.status === 429)) setError(e.message);
        setSettled(true);
      });
    return () => {
      cancelled = true;
    };
  }, [state]);

  return (
    <>
      <Greeting />
      <h1>{welcome ? "Welcome" : "Dashboard"}</h1>
      <AccountLookup kind="customer" />

      {error && <ErrorMessage message={error} />}
      {!settled && !error && <Loading />}
      {data && (
        <>
          <h2>Your accounts ({data.totalActiveAccounts} active, {data.totalSuspendedAccounts} suspended)</h2>
          {data.accounts.length === 0 ? (
            <p className="muted">
              No accounts yet. Visit a branch to open one; staff open accounts for customers at the office.
            </p>
          ) : (
            <div className="grid">
              {data.accounts.map((a) => (
                <Link key={a.accountNumber} href={`/accounts/${a.accountNumber}`} className="card">
                  <strong>{accountLabel(a.accountType)}</strong>
                  {a.suspended && <span className="badge warn"> Suspended {formatSuspendedUntil(a.suspendedUntil)}</span>}
                  <div>{a.accountNumber}</div>
                  <div className="muted">
                    {a.firstName} {a.lastName} · opened {a.createdDate}
                  </div>
                </Link>
              ))}
            </div>
          )}

          <h2>Branches &amp; ATMs</h2>
          <label style={{ maxWidth: 200 }}>
            Filter by state
            <input
              value={state}
              maxLength={2}
              placeholder="TX"
              onChange={(e) => setState(e.target.value.toUpperCase())}
            />
          </label>
          <div className="grid" style={{ marginTop: 12 }}>
            {data.nearbyLocations.map((l) => (
              <LocationCard key={l.id} loc={l} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
