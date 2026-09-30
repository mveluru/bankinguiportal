"use client";

import Link from "next/link";
import { useState } from "react";
import { ErrorMessage } from "@/components/StateBlock";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const username = String(new FormData(e.currentTarget).get("username")).trim();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) throw new Error("Could not send the request. Try again.");
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1>Forgot password</h1>
      {sent ? (
        <>
          <p role="status">If that username exists, a reset link has been sent. It expires in 30 minutes.</p>
          <p className="muted">Demo: there is no email service, so the link is printed in the Next.js server console.</p>
        </>
      ) : (
        <form className="stack" onSubmit={onSubmit}>
          <label>
            Username
            <input name="username" required autoComplete="username" autoFocus />
          </label>
          {error && <ErrorMessage message={error} />}
          <button type="submit" disabled={submitting}>
            {submitting ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
      <p>
        <Link href="/login">← Back to sign in</Link>
      </p>
    </>
  );
}
