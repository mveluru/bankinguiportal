"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { hardNavigate } from "@/lib/navigation";
import { ErrorMessage } from "@/components/StateBlock";

function VerifyForm() {
  const params = useSearchParams();
  const { verifyTwoFactor } = useAuth();
  const [useRecovery, setUseRecovery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code")).trim();
    setSubmitting(true);
    setError(null);
    try {
      await verifyTwoFactor(code);
      const next = params.get("next");
      hardNavigate(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <form className="stack" onSubmit={onSubmit} key={String(useRecovery)}>
      <p className="muted">
        {useRecovery
          ? "Enter one of your recovery codes. Each code works once."
          : "Enter the 6-digit code from your authenticator app."}
      </p>
      <label>
        {useRecovery ? "Recovery code" : "Authentication code"}
        <input
          name="code"
          required
          autoFocus
          autoComplete="one-time-code"
          {...(useRecovery
            ? { placeholder: "xxxxxx-xxxxxx" }
            : { inputMode: "numeric" as const, pattern: "\\d{6}", maxLength: 6, placeholder: "123456" })}
        />
      </label>
      {error && <ErrorMessage message={error} />}
      <button type="submit" disabled={submitting}>
        {submitting ? "Verifying…" : "Verify"}
      </button>
      <p>
        <button type="button" className="link tap" onClick={() => (setError(null), setUseRecovery((v) => !v))}>
          {useRecovery ? "Use authenticator code instead" : "Use a recovery code"}
        </button>
      </p>
      <p>
        <Link href="/login" className="tap">← Back to sign in</Link>
      </p>
    </form>
  );
}

export default function VerifyPage() {
  return (
    <>
      <h1>Two-step verification</h1>
      <Suspense>
        <VerifyForm />
      </Suspense>
    </>
  );
}
