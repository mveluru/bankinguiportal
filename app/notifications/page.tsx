"use client";

import { useCallback, useEffect, useState } from "react";
import { ErrorMessage, Loading } from "@/components/StateBlock";

interface AppNotification {
  id: string;
  ts: string;
  level: "ok" | "warn" | "info";
  title: string;
  detail?: string;
  unread: boolean;
}

const ICON = { ok: "✓", warn: "!", info: "i" } as const;
const ICON_LABEL = { ok: "Confirmation", warn: "Needs attention", info: "Information" } as const;

/** "5 minutes ago" for recent items; the exact time is always available in the tooltip. */
function ago(iso: string) {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return "just now";
  const unit = (n: number, name: string) => `${Math.floor(n)} ${name}${Math.floor(n) === 1 ? "" : "s"} ago`;
  if (s < 3600) return unit(s / 60, "minute");
  if (s < 86400) return unit(s / 3600, "hour");
  if (s < 7 * 86400) return unit(s / 86400, "day");
  return new Date(iso).toLocaleDateString();
}

export default function NotificationsPage() {
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      fetch("/api/auth/notifications")
        .then(async (r) => {
          if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? "Could not load notifications.");
          return r.json();
        })
        .then((d) => {
          setItems(d.notifications);
          setUnreadCount(d.unreadCount);
        })
        .catch((e: Error) => setError(e.message)),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  async function markAllRead() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-all-read" }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? "Could not update notifications.");
      await load();
      window.dispatchEvent(new Event("notifications-changed")); // refresh the nav badge
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!items) return error ? <ErrorMessage message={error} /> : <Loading />;

  const shown = onlyUnread ? items.filter((n) => n.unread) : items;

  return (
    <>
      <div className="page-head">
        <h1>Notifications</h1>
        <button type="button" onClick={markAllRead} disabled={busy || unreadCount === 0}>
          Mark all as read
        </button>
      </div>
      <p className="muted">
        Security and account updates for you. {unreadCount > 0 ? `${unreadCount} unread.` : "You're all caught up."}
      </p>
      {error && <ErrorMessage message={error} />}

      <div className="row" style={{ marginBottom: 12 }} role="group" aria-label="Filter notifications">
        <button type="button" className={onlyUnread ? "secondary" : undefined} aria-pressed={!onlyUnread} onClick={() => setOnlyUnread(false)}>
          All
        </button>
        <button type="button" className={onlyUnread ? undefined : "secondary"} aria-pressed={onlyUnread} onClick={() => setOnlyUnread(true)}>
          Unread{unreadCount > 0 ? ` (${unreadCount})` : ""}
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="muted">{onlyUnread ? "No unread notifications." : "Nothing yet. Security updates will show up here."}</p>
      ) : (
        <ul className="notice-list">
          {shown.map((n) => (
            <li key={n.id} className={`notice ${n.unread ? "unread" : ""}`}>
              <span className={`notice-icon ${n.level}`} role="img" aria-label={ICON_LABEL[n.level]}>
                {ICON[n.level]}
              </span>
              <div>
                <div className="notice-title">
                  {n.title} {n.unread && <span className="badge">New</span>}
                </div>
                {n.detail && <div className="muted">{n.detail}</div>}
                <time className="muted" dateTime={n.ts} title={new Date(n.ts).toLocaleString()}>
                  {ago(n.ts)}
                </time>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
