"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { can, useAuth } from "@/components/AuthProvider";
import ThemeToggle from "@/components/ThemeToggle";
import { homeOf } from "@/lib/session";

export default function NavBar() {
  const { user, logout } = useAuth();
  const dialog = useRef<HTMLDialogElement>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); // phone-width menu; the links are always visible on wider screens
  const staff = user?.kind === "staff";

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
      <Link href={user ? homeOf(user.kind) : "/"} className="brand">
        Brite Banking{staff && " · Staff"}
      </Link>
      <div className={`topbar-actions${user ? "" : " push"}`}>
        {!user && (
          <Link href="/help" className="tap">
            Help
          </Link>
        )}
        <ThemeToggle />
        {user && (
          <button
            type="button"
            className="icon nav-toggle"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="site-nav"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        )}
      </div>
      {user && (
        <nav
          id="site-nav"
          className={menuOpen ? "open" : undefined}
          onClick={(e) => (e.target as HTMLElement).closest("a") && setMenuOpen(false)}
        >
          {staff ? (
            <>
              <Link href="/staff">Dashboard</Link>
              {can(user, "OPEN_ACCOUNT") && <Link href="/staff/accounts/open">Open an account</Link>}
              {can(user, "MANAGE_CUSTOMER_LOGINS") && <Link href="/staff/customers">Customer logins</Link>}
              {can(user, "MANAGE_EMPLOYEES") && <Link href="/staff/employees">UserMgnt</Link>}
              <Link href="/help">Help</Link>
              <Link href="/staff/settings">{user.displayName}</Link>
            </>
          ) : (
            <>
              <Link href="/">Home</Link>
              <Link href="/help">Help</Link>
              <Link href="/settings">{user.displayName}</Link>
            </>
          )}
          <button
            type="button"
            className="link"
            onClick={() => {
              setMenuOpen(false);
              dialog.current?.showModal();
            }}
          >
            Sign out
          </button>
        </nav>
      )}
      <dialog ref={dialog} className="confirm" aria-labelledby="signout-title">
        <h2 id="signout-title" style={{ marginTop: 0 }}>Sign out?</h2>
        <p className="muted">You will need to sign in again to {staff ? "continue" : "view your accounts"}.</p>
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
