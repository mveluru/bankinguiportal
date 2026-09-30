"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import ThemePicker from "@/components/ThemePicker";
import { ErrorMessage, Loading } from "@/components/StateBlock";
import { ACTIVITY_DAY_OPTIONS, type Preferences } from "@/lib/preferences-shared";

const NOTIFY_OPTIONS = [
  { key: "newDevice", label: "New sign-in alerts", hint: "When your account is used from a device we haven't seen before." },
  { key: "failedAttempts", label: "Failed sign-in attempts", hint: "A summary of wrong passwords before you signed in." },
  { key: "accountUpdates", label: "Informational account updates", hint: "An admin unlocking or re-enabling you, or a password reset link being requested." },
] as const;

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [twoFactor, setTwoFactor] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/preferences")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? "Could not load settings.");
        return r.json();
      })
      .then(setPrefs)
      .catch((e: Error) => setError(e.message));
    fetch("/api/auth/2fa/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => setTwoFactor(s ? s.enabled : null))
      .catch(() => {});
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!prefs) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/auth/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message ?? "Could not save settings.");
      setPrefs(body);
      await refresh(); // pick up the new default activity window
      window.dispatchEvent(new Event("notifications-changed")); // muted categories change the unread badge
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <h1>Settings</h1>

      <h2>Account &amp; security</h2>
      <div className="grid">
        <Link href="/settings/profile" className="card">
          <strong>Profile</strong>
          <div className="muted">Display name and email</div>
        </Link>
        <Link href="/settings/password" className="card">
          <strong>Password</strong>
          <div className="muted">Change your password</div>
        </Link>
        <Link href="/settings/two-factor" className="card">
          <strong>Two-factor authentication</strong>
          <div className="muted">
            {twoFactor === null ? "Extra protection at sign-in" : twoFactor ? "On" : "Off: recommended"}
          </div>
        </Link>
        <Link href="/settings/activity" className="card">
          <strong>Sign-in activity</strong>
          <div className="muted">Recent sign-ins and security changes</div>
        </Link>
        {user?.role === "admin" && (
          <Link href="/admin/users" className="card">
            <strong>User management</strong>
            <div className="muted">Admin: view and manage users</div>
          </Link>
        )}
      </div>

      <h2>Appearance</h2>
      <ThemePicker />
      <p className="muted">Saved on this device.</p>

      <h2>Preferences</h2>
      {!prefs ? (
        error ? <ErrorMessage message={error} /> : <Loading />
      ) : (
        <form className="stack" onSubmit={save} onChange={() => saved && setSaved(false)}>
          <label>
            Default activity window
            <select
              value={prefs.activityDays}
              onChange={(e) => setPrefs({ ...prefs, activityDays: Number(e.target.value) })}
            >
              {ACTIVITY_DAY_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  Last {d} days
                </option>
              ))}
            </select>
            <span className="muted">Used for an account&apos;s recent activity and as the start date of new statements.</span>
          </label>

          <fieldset className="choice-group">
            <legend>Notifications</legend>
            {NOTIFY_OPTIONS.map((o) => (
              <label key={o.key} className="choice">
                <input
                  type="checkbox"
                  checked={prefs.notify[o.key]}
                  onChange={(e) => setPrefs({ ...prefs, notify: { ...prefs.notify, [o.key]: e.target.checked } })}
                />
                <span>
                  <strong>{o.label}</strong>
                  <span className="muted"> {o.hint}</span>
                </span>
              </label>
            ))}
            <p className="muted" style={{ margin: 0 }}>
              Password, two-factor, lockout and other security changes are always shown.
            </p>
          </fieldset>

          {saved && (
            <p role="status" className="deposit">
              Settings saved.
            </p>
          )}
          {error && <ErrorMessage message={error} />}
          <button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save preferences"}
          </button>
        </form>
      )}
    </>
  );
}
