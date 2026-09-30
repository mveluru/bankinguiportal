"use client";

import Link from "next/link";
import { useState } from "react";
import { ErrorMessage } from "@/components/StateBlock";

const MIN_LENGTH = 8; // keep in sync with MIN_PASSWORD_LENGTH in lib/users.ts

export default function ChangePasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const currentPassword = String(f.get("currentPassword"));
    const newPassword = String(f.get("newPassword"));
    if (newPassword !== String(f.get("confirmPassword"))) {
      setError("New passwords do not match.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message ?? "Could not change password.");
      form.reset();
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Link href="/settings" className="tap">← Settings</Link>
      <h1>Change password</h1>
      {done && (
        <p role="status" className="deposit">
          Password changed. Use the new password next time you sign in.
        </p>
      )}
      <form className="stack" onSubmit={onSubmit} onChange={() => done && setDone(false)}>
        <label>
          Current password
          <input name="currentPassword" type="password" required autoComplete="current-password" />
        </label>
        <label>
          New password (min {MIN_LENGTH} characters)
          <input name="newPassword" type="password" required minLength={MIN_LENGTH} autoComplete="new-password" />
        </label>
        <label>
          Confirm new password
          <input name="confirmPassword" type="password" required minLength={MIN_LENGTH} autoComplete="new-password" />
        </label>
        {error && <ErrorMessage message={error} />}
        <button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Change password"}
        </button>
      </form>
    </>
  );
}
