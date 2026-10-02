"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import ThemeToggle from "@/components/ThemeToggle";
import { homeOf } from "@/lib/session";

/** The top bar: brand (with the employee's name and id for staff) and the theme switch. The menu is the left panel, `SideNav`. */
export default function NavBar() {
  const { user } = useAuth();
  const staff = user?.kind === "staff";

  return (
    <header className="topbar">
      <Link href={user ? homeOf(user.kind) : "/"} className="brand">
        Brite Banking{staff && ` · ${user.displayName} ${user.employeeNumber}`}
      </Link>
      <div className="topbar-actions push">
        {!user && (
          <Link href="/help" className="tap">
            Help
          </Link>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
