"use client";

import Link from "next/link";
import { useState } from "react";
import { ErrorMessage } from "@/components/StateBlock";
import { credentialsApi } from "@/lib/api";
import { PASSWORD_HINT, PASSWORD_PATTERN } from "@/lib/passwords";
import type { PortalKind } from "@/lib/types";

export default function ChangePassword({ kind }: { kind: PortalKind }) {
  const staff = kind === "staff";
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const newPassword = String(f.get("newPassword"));
    if (newPassword !== String(f.get("confirmPassword"))) {
      setError("New passwords do not match.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await credentialsApi(kind).changePassword(String(f.get("currentPassword")), newPassword);
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    // The backend revokes every earlier token, this session's included, so the portal has already dropped it.
    return (
      <>
        <h1>Password changed</h1>
        <p role="status" className="deposit">
          For your security you have been signed out everywhere. <Link href={staff ? "/staff/login" : "/login"}>Sign in</Link> with the new password.
        </p>
      </>
    );
  }

  return (
    <>
      <Link href={staff ? "/staff/settings" : "/settings"} className="tap">← Settings</Link>
      <h1>Change password</h1>
      <form className="stack" onSubmit={onSubmit}>
        <label>
          Current password
          <input name="currentPassword" type="password" required autoComplete="current-password" />
        </label>
        <label>
          New password ({PASSWORD_HINT})
          <input name="newPassword" type="password" required pattern={PASSWORD_PATTERN} inputMode="numeric" autoComplete="new-password" />
        </label>
        <label>
          Confirm new password
          <input name="confirmPassword" type="password" required pattern={PASSWORD_PATTERN} inputMode="numeric" autoComplete="new-password" />
        </label>
        {error && <ErrorMessage message={error} />}
        <button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Change password"}
        </button>
      </form>
    </>
  );
}
