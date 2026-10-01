"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getHome } from "@/lib/api";
import { accountLabel, formatSuspendedUntil } from "@/lib/format";
import type { PortalHomeResponse } from "@/lib/types";
import Greeting from "@/components/Greeting";
import LocationCard from "@/components/LocationCard";
import { ErrorMessage, Loading } from "@/components/StateBlock";

export default function HomePage() {
  const router = useRouter();
  const [state, setState] = useState("");
  const [data, setData] = useState<PortalHomeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lookup, setLookup] = useState("");

  useEffect(() => {
    let cancelled = false;
    getHome(state.length === 2 ? state : undefined)
      .then((d) => !cancelled && (setData(d), setError(null)))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [state]);

  return (
    <>
      <Greeting />
      <h1>Welcome</h1>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (lookup.trim()) router.push(`/accounts/${encodeURIComponent(lookup.trim())}`);
        }}
      >
        <label>
          Go to account number
          <input value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="CH-0000088291" />
        </label>
        <button type="submit">View</button>
      </form>

      {error && <ErrorMessage message={error} />}
      {!data && !error && <Loading />}
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
