"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ErrorMessage, Loading } from "@/components/StateBlock";

interface ProfileData {
  username: string;
  customerId: string;
  sessionExpires: string;
  displayName: string;
  email: string;
}

export default function ProfilePage() {
  const { refresh } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/profile")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? "Could not load profile.");
        return r.json();
      })
      .then(setProfile)
      .catch((e: Error) => setError(e.message));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSubmitting(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: f.get("displayName"), email: f.get("email") }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message ?? "Could not save profile.");
      await refresh();
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!profile) return error ? <ErrorMessage message={error} /> : <Loading />;

  return (
    <>
      <h1>Profile</h1>
      <div className="card" style={{ maxWidth: 480, marginBottom: 16 }}>
        <div>
          <span className="muted">Username</span> <strong>{profile.username}</strong>
        </div>
        <div>
          <span className="muted">Customer ID</span> <strong>{profile.customerId}</strong>
        </div>
        <div className="muted">Session expires {new Date(profile.sessionExpires).toLocaleString()}</div>
      </div>

      <form className="stack" onSubmit={onSubmit} onChange={() => saved && setSaved(false)}>
        <label>
          Display name
          <input name="displayName" maxLength={50} defaultValue={profile.displayName} placeholder={profile.username} />
        </label>
        <label>
          Email
          <input name="email" type="email" maxLength={100} defaultValue={profile.email} placeholder="you@example.com" />
        </label>
        {saved && (
          <p role="status" className="deposit">
            Profile saved.
          </p>
        )}
        {error && <ErrorMessage message={error} />}
        <button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save profile"}
        </button>
      </form>

      <p>
        <Link href="/settings/password">Change password</Link>
      </p>
    </>
  );
}
