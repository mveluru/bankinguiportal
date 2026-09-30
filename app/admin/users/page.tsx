"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ErrorMessage, Loading } from "@/components/StateBlock";

interface AdminUser {
  username: string;
  customerId: string;
  role: "admin" | "user";
  displayName: string;
  email: string;
  twoFactorEnabled: boolean;
  disabled: boolean;
  locked: boolean;
  lockedForSeconds: number;
  lastSignIn: string | null;
  lastFailure: string | null;
  failedLast24h: number;
}

type Action = "unlock" | "reset-2fa" | "disable" | "enable";

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : "Never");

/** Actions that need an explicit confirmation before they run. */
const CONFIRM: Partial<Record<Action, { title: string; body: (u: string) => string; button: string; danger: boolean }>> = {
  "reset-2fa": {
    title: "Reset two-factor authentication?",
    body: (u) => `${u} will be able to sign in with just their password until they set up two-factor again. Do this only for a user who lost their device.`,
    button: "Reset two-factor",
    danger: true,
  },
  disable: {
    title: "Disable this account?",
    body: (u) => `${u} will be signed out everywhere immediately and won't be able to sign in until you enable the account again.`,
    button: "Disable account",
    danger: true,
  },
};

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ username: string; action: Action } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  const load = useCallback(
    () =>
      fetch("/api/admin/users")
        .then(async (r) => {
          const body = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(r.status === 403 ? "You don't have access to this page." : body.message ?? "Could not load users.");
          return body;
        })
        .then((d) => setUsers(d.users))
        .catch((e: Error) => setError(e.message)),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (users ?? []).filter(
      (u) => !q || [u.username, u.displayName, u.email, u.customerId].some((f) => f.toLowerCase().includes(q)),
    );
  }, [users, query]);

  async function perform(username: string, action: Action) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(username)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message ?? "Action failed.");
      setNotice(
        {
          unlock: `Unlocked ${username}.`,
          "reset-2fa": `Two-factor reset for ${username}.`,
          disable: `Disabled ${username} and signed them out.`,
          enable: `Enabled ${username}.`,
        }[action],
      );
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function request(username: string, action: Action) {
    if (CONFIRM[action]) {
      setPending({ username, action });
      dialog.current?.showModal();
    } else {
      perform(username, action);
    }
  }

  if (!users) return error ? <ErrorMessage message={error} /> : <Loading />;

  const count = (pred: (u: AdminUser) => boolean) => users.filter(pred).length;
  const confirm = pending && CONFIRM[pending.action];

  return (
    <>
      <h1>User management</h1>
      <p className="muted">
        {users.length} users · {count((u) => u.role === "admin")} Admin · {count((u) => u.twoFactorEnabled)} with
        two-factor · {count((u) => u.locked)} locked · {count((u) => u.disabled)} disabled
      </p>

      {notice && (
        <p role="status" className="deposit">
          {notice}
        </p>
      )}
      {error && <ErrorMessage message={error} />}

      <label style={{ maxWidth: 320, marginBottom: 12 }}>
        Search
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Username, name, email or customer ID" />
      </label>

      <div className="table-wrap">
      <table className="stack-sm">
        <thead>
          <tr>
            <th>User</th>
            <th>Email</th>
            <th>2FA</th>
            <th>Status</th>
            <th>Last sign-in</th>
            <th className="num">Failed (24h)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((u) => {
            const self = u.username === me?.username;
            return (
              <tr key={u.username}>
                <td data-label="User">
                  <div>
                    <strong>{u.username}</strong> {u.role === "admin" && <span className="badge">Admin</span>}
                    <div className="muted">
                      {u.displayName ? `${u.displayName} · ` : ""}
                      {u.customerId}
                    </div>
                  </div>
                </td>
                <td data-label="Email">{u.email || <span className="muted">—</span>}</td>
                <td data-label="2FA" className={u.twoFactorEnabled ? "deposit" : "muted"}>{u.twoFactorEnabled ? "On" : "Off"}</td>
                <td data-label="Status" className={u.disabled || u.locked ? "withdrawal" : undefined}>
                  {u.disabled ? "Disabled" : u.locked ? `Locked (${Math.ceil(u.lockedForSeconds / 60)} min left)` : "Active"}
                </td>
                <td data-label="Last sign-in">{when(u.lastSignIn)}</td>
                <td data-label="Failed (24h)" className={`num ${u.failedLast24h > 0 ? "withdrawal" : ""}`}>{u.failedLast24h}</td>
                <td data-label="Actions">
                  <div className="row" style={{ gap: 8 }}>
                    {u.locked && (
                      <button type="button" className="secondary" disabled={busy} onClick={() => request(u.username, "unlock")}>
                        Unlock
                      </button>
                    )}
                    {u.twoFactorEnabled && (
                      <button type="button" className="secondary" disabled={busy} onClick={() => request(u.username, "reset-2fa")}>
                        Reset 2FA
                      </button>
                    )}
                    {u.disabled ? (
                      <button type="button" className="secondary" disabled={busy} onClick={() => request(u.username, "enable")}>
                        Enable
                      </button>
                    ) : (
                      !self && (
                        <button type="button" className="secondary" disabled={busy} onClick={() => request(u.username, "disable")}>
                          Disable
                        </button>
                      )
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {shown.length === 0 && (
            <tr>
              <td colSpan={7} className="muted">
                No users match.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
      <p className="muted">
        Passwords and secrets are never shown. Every action is recorded in the audit log and appears in the affected
        user&apos;s own sign-in activity.
      </p>

      <dialog ref={dialog} className="confirm" aria-labelledby="admin-confirm-title" onClose={() => setPending(null)}>
        <h2 id="admin-confirm-title" style={{ marginTop: 0 }}>{confirm?.title}</h2>
        <p className="muted">{pending && confirm?.body(pending.username)}</p>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="secondary" onClick={() => dialog.current?.close()}>
            Cancel
          </button>
          <button
            type="button"
            className={confirm?.danger ? "danger" : undefined}
            onClick={async () => {
              const p = pending;
              dialog.current?.close();
              if (p) await perform(p.username, p.action);
            }}
          >
            {confirm?.button}
          </button>
        </div>
      </dialog>
    </>
  );
}
