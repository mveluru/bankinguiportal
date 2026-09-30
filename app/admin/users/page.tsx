"use client";

import { useEffect, useMemo, useState } from "react";
import { ErrorMessage, Loading } from "@/components/StateBlock";

interface AdminUser {
  username: string;
  customerId: string;
  role: "admin" | "user";
  displayName: string;
  email: string;
  twoFactorEnabled: boolean;
  locked: boolean;
  lockedForSeconds: number;
  lastSignIn: string | null;
  lastFailure: string | null;
  failedLast24h: number;
}

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : "Never");

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/admin/users")
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(r.status === 403 ? "You don't have access to this page." : body.message ?? "Could not load users.");
        return body;
      })
      .then((d) => setUsers(d.users))
      .catch((e: Error) => setError(e.message));
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (users ?? []).filter(
      (u) => !q || [u.username, u.displayName, u.email, u.customerId].some((f) => f.toLowerCase().includes(q)),
    );
  }, [users, query]);

  if (!users) return error ? <ErrorMessage message={error} /> : <Loading />;

  const count = (pred: (u: AdminUser) => boolean) => users.filter(pred).length;

  return (
    <>
      <h1>Users</h1>
      <p className="muted">
        {users.length} users · {count((u) => u.role === "admin")} admin · {count((u) => u.twoFactorEnabled)} with
        two-factor · {count((u) => u.locked)} locked
      </p>

      <label style={{ maxWidth: 320, marginBottom: 12 }}>
        Search
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Username, name, email or customer ID" />
      </label>

      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Customer ID</th>
            <th>Email</th>
            <th>2FA</th>
            <th>Status</th>
            <th>Last sign-in</th>
            <th className="num">Failed (24h)</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((u) => (
            <tr key={u.username}>
              <td>
                <strong>{u.username}</strong> {u.role === "admin" && <span className="badge">Admin</span>}
                {u.displayName && <div className="muted">{u.displayName}</div>}
              </td>
              <td>{u.customerId}</td>
              <td>{u.email || <span className="muted">—</span>}</td>
              <td className={u.twoFactorEnabled ? "deposit" : "muted"}>{u.twoFactorEnabled ? "On" : "Off"}</td>
              <td className={u.locked ? "withdrawal" : undefined}>
                {u.locked ? `Locked (${Math.ceil(u.lockedForSeconds / 60)} min left)` : "Active"}
              </td>
              <td>{when(u.lastSignIn)}</td>
              <td className={`num ${u.failedLast24h > 0 ? "withdrawal" : ""}`}>{u.failedLast24h}</td>
            </tr>
          ))}
          {shown.length === 0 && (
            <tr>
              <td colSpan={7} className="muted">
                No users match.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="muted">Read-only. Passwords and secrets are never shown.</p>
    </>
  );
}
