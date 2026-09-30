"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EVENT_INFO, FAILURE_EVENTS, type AuditRecord } from "@/lib/audit-events";
import { ErrorMessage, Loading } from "@/components/StateBlock";

/** "Chrome on macOS" from a user-agent string; falls back to a short raw prefix. */
function device(ua?: string) {
  if (!ua) return "—";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : null;
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : null;
  return browser || os ? [browser, os].filter(Boolean).join(" on ") : ua.slice(0, 30);
}

export default function ActivityPage() {
  const [events, setEvents] = useState<AuditRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/activity?limit=50")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? "Could not load activity.");
        return r.json();
      })
      .then((d) => setEvents(d.events))
      .catch((e: Error) => setError(e.message));
  }, []);

  if (!events) return error ? <ErrorMessage message={error} /> : <Loading />;

  // Events are newest first. The newest sign-in is this session; failures newer than the one before it are the
  // ones worth a look ("since your previous sign-in").
  const signIns = events.filter((e) => e.event === "login_success");
  const previous = signIns[1];
  const suspicious = events.filter(
    (e) => FAILURE_EVENTS.includes(e.event) && (!previous || e.ts > previous.ts),
  ).length;

  return (
    <>
      <Link href="/settings/profile">← Profile</Link>
      <h1>Sign-in activity</h1>
      <p className="muted">Recent sign-ins and security changes on your account (newest first).</p>

      {suspicious > 0 && (
        <p role="status" className="error">
          <strong>
            {suspicious} failed or refused attempt{suspicious === 1 ? "" : "s"}
          </strong>{" "}
          since {previous ? "your previous sign-in" : "the log began"}. If that wasn&apos;t you,{" "}
          <Link href="/settings/password">change your password</Link> and consider{" "}
          <Link href="/settings/two-factor">turning on two-factor authentication</Link>.
        </p>
      )}

      {events.length === 0 ? (
        <p className="muted">Nothing recorded yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Event</th>
              <th>Device</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e, i) => {
              const info = EVENT_INFO[e.event] ?? { label: e.event, level: "info" as const };
              return (
                <tr key={`${e.ts}-${i}`}>
                  <td>{new Date(e.ts).toLocaleString()}</td>
                  <td className={info.level === "warn" ? "withdrawal" : info.level === "ok" ? "deposit" : undefined}>
                    {info.label}
                    {e.detail && <span className="muted"> ({e.detail})</span>}
                  </td>
                  <td>{device(e.userAgent)}</td>
                  <td>{e.ip ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
