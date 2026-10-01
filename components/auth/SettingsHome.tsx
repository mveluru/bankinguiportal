"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import ThemePicker from "@/components/ThemePicker";
import { titleCase } from "@/lib/format";
import type { PortalKind } from "@/lib/types";

export default function SettingsHome({ kind }: { kind: PortalKind }) {
  const { user } = useAuth();
  const base = kind === "staff" ? "/staff/settings" : "/settings";
  return (
    <>
      <h1>Settings</h1>
      {user && (
        <p className="muted">
          {user.displayName} · {user.username}
          {user.role && ` · ${titleCase(user.role)}`}
          {user.employeeNumber && ` · ${user.employeeNumber}`}
        </p>
      )}
      <h2>Account &amp; security</h2>
      <div className="grid">
        <Link href={`${base}/password`} className="card">
          <strong>Password</strong>
          <div className="muted">Change your password</div>
        </Link>
        <Link href={`${base}/security-questions`} className="card">
          <strong>Security questions</strong>
          <div className="muted">Needed to reset a forgotten password</div>
        </Link>
      </div>
      <h2>Appearance</h2>
      <ThemePicker />
    </>
  );
}
