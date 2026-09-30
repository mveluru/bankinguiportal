"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import ThemeToggle from "@/components/ThemeToggle";

export default function NavBar() {
  const { user, logout } = useAuth();
  const dialog = useRef<HTMLDialogElement>(null);
  const [signingOut, setSigningOut] = useState(false);

  async function confirmSignOut() {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
      dialog.current?.close();
    }
  }

  return (
    <header className="topbar">
      <Link href="/" className="brand">
        Brite Banking
      </Link>
      <div className="row" style={{ alignItems: "center" }}>
        {user && (
          <nav>
            <Link href="/">Home</Link>
            <Link href="/accounts/open">Open an account</Link>
            {user.role === "admin" && <Link href="/admin/users">Admin</Link>}
            <Link href="/settings/profile">{user.displayName || user.username}</Link>
            <button type="button" className="link" onClick={() => dialog.current?.showModal()}>
              Sign out
            </button>
          </nav>
        )}
        <ThemeToggle />
      </div>
      <dialog ref={dialog} className="confirm" aria-labelledby="signout-title">
        <h2 id="signout-title" style={{ marginTop: 0 }}>Sign out?</h2>
        <p className="muted">You will need to sign in again to view your accounts.</p>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="secondary" onClick={() => dialog.current?.close()} disabled={signingOut}>
            Cancel
          </button>
          <button type="button" onClick={confirmSignOut} disabled={signingOut}>
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </dialog>
    </header>
  );
}
