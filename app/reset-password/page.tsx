"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ErrorMessage } from "@/components/StateBlock";

const MIN_LENGTH = 8; // keep in sync with MIN_PASSWORD_LENGTH in lib/users.ts

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const newPassword = String(f.get("newPassword"));
    if (newPassword !== String(f.get("confirmPassword"))) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message ?? "Could not reset password.");
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <>
        <p role="status" className="deposit">
          Password reset.
        </p>
        <Link href="/login">Sign in</Link>
      </>
    );
  }

  if (!token) {
    return (
      <>
        <p className="error">This reset link is missing its token.</p>
        <Link href="/forgot-password">Request a new link</Link>
      </>
    );
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      <label>
        New password (min {MIN_LENGTH} characters)
        <input name="newPassword" type="password" required minLength={MIN_LENGTH} autoComplete="new-password" autoFocus />
      </label>
      <label>
        Confirm new password
        <input name="confirmPassword" type="password" required minLength={MIN_LENGTH} autoComplete="new-password" />
      </label>
      {error && <ErrorMessage message={error} />}
      <button type="submit" disabled={submitting}>
        {submitting ? "Saving…" : "Reset password"}
      </button>
      <p>
        <Link href="/forgot-password">Request a new link</Link>
      </p>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <h1>Reset password</h1>
      <Suspense>
        <ResetForm />
      </Suspense>
    </>
  );
}
