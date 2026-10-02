"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ErrorMessage } from "@/components/StateBlock";
import { clearGreeting } from "@/lib/greeting";
import { hardNavigate } from "@/lib/navigation";
import { homeOf } from "@/lib/session";
import type { PortalKind } from "@/lib/types";

function Form({ kind }: { kind: PortalKind }) {
  const params = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const staff = kind === "staff";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      await login(kind, String(f.get("username")).trim(), String(f.get("password")));
      // Only follow same-site relative redirects, and only into the portal the user signed in to.
      const next = params.get("next");
      const inPortal = next && (staff ? next.startsWith("/staff") : !next.startsWith("/staff"));
      const target = inPortal && next.startsWith("/") && !next.startsWith("//") ? next : homeOf(kind);
      // The welcome headline belongs to the landing screen only: drop it when sent straight to a deeper page.
      if (target !== homeOf(kind)) clearGreeting();
      hardNavigate(target);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      {params.get("expired") && !error && <p role="status" className="muted">Your session ended. Please sign in again.</p>}
      <label>
        Username
        <input name="username" required autoComplete="username" autoFocus />
      </label>
      <label>
        Password
        <input name="password" type="password" required autoComplete="current-password" />
      </label>
      {error && <ErrorMessage message={error} />}
      <button type="submit" disabled={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
      </button>
      <p className="link-list">
        <Link href={staff ? "/staff/forgot-password" : "/forgot-password"} className="tap">Forgot password?</Link>
        <Link href="/help" className="tap">Need help?</Link>
        <Link href={staff ? "/login" : "/staff/login"} className="tap">
          {staff ? "Customer sign in" : "Staff sign in"}
        </Link>
      </p>
    </form>
  );
}

export default function SignInForm({ kind }: { kind: PortalKind }) {
  const staff = kind === "staff";
  return (
    <div className="login-layout">
      <div className="login-hero">
        <h1>{staff ? "Brite Banking Employee" : "Welcome to Brite Banking"}</h1>
        <p className="muted">
          {staff
            ? "Sign in with your employee username and password to manage accounts and logins."
            : "Sign in to view your accounts, make deposits and withdrawals, and get statements."}
        </p>
      </div>
      <div className="login-card">
        <h2>{staff ? "Brite Banking Sign In" : "Sign in"}</h2>
        <Suspense>
          <Form kind={kind} />
        </Suspense>
      </div>
    </div>
  );
}
