"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { hardNavigate } from "@/lib/navigation";
import { ErrorMessage } from "@/components/StateBlock";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      const { twoFactorRequired } = await login(
        String(f.get("username")).trim(),
        String(f.get("password")),
        f.get("remember") === "on",
      );
      // Only follow same-site relative redirects.
      const next = params.get("next");
      const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
      if (twoFactorRequired) router.replace(`/login/verify?next=${encodeURIComponent(target)}`);
      else hardNavigate(target);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      {params.get("expired") && !error && <p role="status" className="muted">Your session timed out. Please sign in again.</p>}
      <label>
        Username
        <input name="username" required autoComplete="username" autoFocus />
      </label>
      <label>
        Password
        <input name="password" type="password" required autoComplete="current-password" />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input name="remember" type="checkbox" style={{ width: "auto" }} />
        Remember me on this device
      </label>
      {error && <ErrorMessage message={error} />}
      <button type="submit" disabled={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
      </button>
      <p>
        <Link href="/forgot-password">Forgot password?</Link>
      </p>
      <p className="muted">Demo login only. Accounts are configured in DEMO_USERS.</p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <>
      <h1>Sign in</h1>
      <Suspense>
        <LoginForm />
      </Suspense>
    </>
  );
}
