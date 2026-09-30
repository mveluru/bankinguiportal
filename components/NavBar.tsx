"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function NavBar() {
  const { user, logout } = useAuth();
  return (
    <header className="topbar">
      <Link href="/" className="brand">
        Brite Banking
      </Link>
      {user && (
        <nav>
          <Link href="/">Home</Link>
          <Link href="/accounts/open">Open an account</Link>
          <span className="muted">{user.username}</span>
          <button type="button" className="link" onClick={logout}>
            Sign out
          </button>
        </nav>
      )}
    </header>
  );
}
