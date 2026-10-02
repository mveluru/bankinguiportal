"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
 * only the features their role's privileges allow (a convenience: the backend refuses the calls anyway). Sign out is in the top bar.
 */
export default function SideNav() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [rolesOpen, setRolesOpen] = useState(false);

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
        { href: "/", label: "Dashboard", also: ["/accounts"] },
        { href: "/statements", label: "Statements" },
        { href: "/help", label: "Help" },
        { href: "/settings", label: "Settings" },
      ];

  // The most specific match wins, so "Dashboard" is not lit up on /staff/accounts/open.
  const exact = items.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`) && i.href !== "/" && i.href !== "/staff");
  const active = (i: Item) =>
    exact ? exact === i : pathname === i.href || !!i.also?.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  return (
    <aside className="sidebar">
      {/* Staff: the employee's role above the Dashboard button; clicking it shows what the role allows. */}
      {staff && user.role && (
        <div className="side-role-box">
          <button type="button" className="side-role" aria-expanded={rolesOpen} aria-controls="role-privileges" onClick={() => setRolesOpen((o) => !o)}>
            {titleCase(user.role)} <span aria-hidden="true">{rolesOpen ? "▴" : "▾"}</span>
          </button>
          {rolesOpen && (
            <ul id="role-privileges" className="side-privs" aria-label="What your role allows">
              {user.privileges?.map((p) => (
                <li key={p}>{titleCase(p)}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {/* Customers: their account id, then their name, then "Customer since <year>", where staff see their role. */}
      {!staff && (
        <div className="side-role static">
          {user.accountNumbers?.[0] && <div className="side-account">{user.accountNumbers[0]}</div>}
          <div className="side-name">{user.displayName}</div>
          <div className="side-since">{user.customerSince ? `Customer since ${user.customerSince}` : "Customer"}</div>
        </div>
      )}
      <nav aria-label="Main">
        {items.map((i) => (
          <Link key={i.href} href={i.href} className="side-btn" aria-current={active(i) ? "page" : undefined}>
            {i.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
