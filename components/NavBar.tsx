"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import ThemeToggle from "@/components/ThemeToggle";

export default function NavBar() {
  const { user, logout } = useAuth();
  const dialog = useRef<HTMLDialogElement>(null);
  const [signingOut, setSigningOut] = useState(false);
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false); // phone-width menu; the links are always visible on wider screens

  // Unread-notification badge: refreshed on navigation, every minute, and when the notifications page marks all read.
  const signedIn = !!user;
  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    const refresh = () =>
      fetch("/api/auth/notifications?summary=1")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => !cancelled && setUnread(d?.unreadCount ?? 0))
        .catch(() => {});
    refresh();
    const timer = setInterval(refresh, 60_000);
    window.addEventListener("notifications-changed", refresh);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("notifications-changed", refresh);
    };
  }, [signedIn, pathname]);

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
      <div className="topbar-actions">
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
          <Link href="/">Home</Link>
          <Link href="/accounts/open">Open an account</Link>
          {user.role === "admin" && <Link href="/admin/users">Admin</Link>}
          <Link href="/notifications" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}>
            Notifications
            {unread > 0 && <span className="count">{unread > 99 ? "99+" : unread}</span>}
          </Link>
          <Link href="/help">Help</Link>
          <Link href="/settings">{user.displayName || user.username}</Link>
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
