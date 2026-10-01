"use client";

import { useState } from "react";
import { ErrorMessage } from "@/components/StateBlock";
import { titleCase } from "@/lib/format";
import { PASSWORD_HINT, PASSWORD_PATTERN } from "@/lib/passwords";
import type { LoginStatus, LoginStatusView } from "@/lib/types";

const STATUSES: LoginStatus[] = ["ACTIVE", "INACTIVE", "LOCKED", "SUSPENDED"];

/** Runs one admin call and reports its outcome in place (the backend's own message on failure). */
function useAction() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<string>) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      setMessage(await action());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return { message, error, busy, run };
}

const describe = (v: LoginStatusView) =>
  `${v.username}: ${titleCase(v.status)}${v.statusReason ? ` (${v.statusReason})` : ""}${v.lockedUntil ? `, locked until ${v.lockedUntil.replace("T", " ").slice(0, 16)}` : ""}.`;

/** Set a login's status. The change applies at once, even to a token the user already holds. */
export function SetStatusForm({ apply }: { apply: (status: LoginStatus, reason?: string) => Promise<LoginStatusView> }) {
  const { message, error, busy, run } = useAction();
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        return run(async () => describe(await apply(f.get("status") as LoginStatus, String(f.get("reason") ?? "").trim())));
      }}
    >
      <h2>Login status</h2>
      <p className="muted">Only an Active login can sign in or transact. A change applies immediately, even to someone already signed in.</p>
      <label>
        Status
        <select name="status" defaultValue="ACTIVE">
          {STATUSES.map((s) => (
            <option key={s} value={s}>{titleCase(s)}</option>
          ))}
        </select>
      </label>
      <label>
        Reason (optional, max 200)
        <input name="reason" maxLength={200} autoComplete="off" />
      </label>
      {message && <p role="status">{message}</p>}
      {error && <ErrorMessage message={error} />}
      <button type="submit" disabled={busy}>{busy ? "Saving…" : "Set status"}</button>
    </form>
  );
}

/** Set a login's password; every token the user holds stops working. */
export function SetPasswordForm({ apply }: { apply: (newPassword: string) => Promise<void> }) {
  const { message, error, busy, run } = useAction();
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        return run(async () => {
          await apply(String(f.get("newPassword")));
          form.reset();
          return "Password set. Their earlier sessions no longer work.";
        });
      }}
    >
      <h2>Set password</h2>
      <label>
        New password ({PASSWORD_HINT})
        <input name="newPassword" type="password" required pattern={PASSWORD_PATTERN} inputMode="numeric" autoComplete="new-password" />
      </label>
      {message && <p role="status">{message}</p>}
      {error && <ErrorMessage message={error} />}
      <button type="submit" disabled={busy}>{busy ? "Saving…" : "Set password"}</button>
    </form>
  );
}

/** Create a customer's login (username and starting password). */
export function CreateLoginForm({ apply }: { apply: (username: string, password: string) => Promise<LoginStatusView> }) {
  const { message, error, busy, run } = useAction();
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        return run(async () => {
          const v = await apply(String(f.get("username")).trim(), String(f.get("password")));
          form.reset();
          return `Login created. ${describe(v)}`;
        });
      }}
    >
      <h2>Create login</h2>
      <p className="muted">A customer can only sign in once they have a login. Each customer has at most one.</p>
      <label>
        Username
        <input name="username" required autoComplete="off" />
      </label>
      <label>
        Starting password ({PASSWORD_HINT})
        <input name="password" type="password" required pattern={PASSWORD_PATTERN} inputMode="numeric" autoComplete="new-password" />
      </label>
      {message && <p role="status">{message}</p>}
      {error && <ErrorMessage message={error} />}
      <button type="submit" disabled={busy}>{busy ? "Creating…" : "Create login"}</button>
    </form>
  );
}
