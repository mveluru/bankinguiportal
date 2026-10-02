"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { can, useAuth } from "@/components/AuthProvider";
import { titleCase } from "@/lib/format";

interface Item {
  href: string;
  label: string;
  /** Highlighted for these path prefixes too (the screens that belong to the feature). */
  also?: string[];
}

/**
 * The left-hand panel: every feature as a button on a light-blue background, shown only to signed-in users. Staff get
 * only the features their role's privileges allow (a convenience: the backend refuses the calls anyway). Sign out sits in the top right corner and asks first.
 */
export default function SideNav() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const [signingOut, setSigningOut] = useState(false);

  if (!user) return null;

  const staff = user.kind === "staff";
  const items: Item[] = staff
    ? [
        { href: "/staff", label: "Dashboard", also: ["/staff/accounts"] },
        ...(can(user, "OPEN_ACCOUNT") ? [{ href: "/staff/accounts/open", label: "Open an account" }] : []),
        ...(can(user, "MANAGE_CUSTOMER_LOGINS") ? [{ href: "/staff/customers", label: "Customer logins" }] : []),
        ...(can(user, "MANAGE_EMPLOYEES") ? [{ href: "/staff/employees", label: "UserMgnt" }] : []),
        { href: "/help", label: "Help" },
        { href: "/staff/settings", label: "Settings" },
      ]
    : [
        { href: "/", label: "Home", also: ["/accounts"] },
        { href: "/statements", label: "Statements" },
        { href: "/help", label: "Help" },
        { href: "/settings", label: "Settings" },
      ];

  // The most specific match wins, so "Dashboard" is not lit up on /staff/accounts/open.
  const exact = items.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`) && i.href !== "/" && i.href !== "/staff");
  const active = (i: Item) =>
    exact ? exact === i : pathname === i.href || !!i.also?.some((p) => pathname === p || pathname.startsWith(`${p}/`));

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
    <aside className="sidebar">
      {/* Staff: the employee's role (Area Manager, Manager, Teller) above the Dashboard button. */}
      {staff && user.role && <p className="side-role">{titleCase(user.role)}</p>}
      <nav aria-label="Main">
        {items.map((i) => (
          <Link key={i.href} href={i.href} className="side-btn" aria-current={active(i) ? "page" : undefined}>
            {i.label}
          </Link>
        ))}
      </nav>
      {/* Top right corner of the page, just under the top bar (see .signout-corner). */}
      <button type="button" className="signout-corner" onClick={() => dialog.current?.showModal()}>
        Sign out
      </button>
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
    </aside>
  );
}
