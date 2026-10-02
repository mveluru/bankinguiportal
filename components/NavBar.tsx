"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import SignOutButton from "@/components/SignOutButton";
import ThemeToggle from "@/components/ThemeToggle";
import { homeOf } from "@/lib/session";

/** The top bar: brand (with the employee's name and id, and their branch beneath, for staff) Sign out and the theme switch. The menu is the left panel, `SideNav`. */
export default function NavBar() {
  const { user } = useAuth();
  const staff = user?.kind === "staff";

  return (
    <header className="topbar">
      <div className="brand-block">
        <Link href={user ? homeOf(user.kind) : "/"} className="brand">
          Brite Banking{staff && ` · ${user.displayName} ${user.employeeNumber}`}
        </Link>
        {/* Staff with a home branch: it is shown under the brand (area managers have none). */}
        {staff && user.branch && (
          <span className="brand-sub">
            {user.branch.name} · {user.branch.city}, {user.branch.state}
          </span>
        )}
      </div>
      <div className="topbar-actions push">
        {!user && (
          <Link href="/help" className="tap">
            Help
          </Link>
        )}
        <SignOutButton />
        <ThemeToggle />
      </div>
    </header>
  );
}
