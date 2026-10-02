"use client";

import AccountLookup from "@/components/accounts/AccountLookup";
import { useAuth } from "@/components/AuthProvider";
import Greeting from "@/components/Greeting";
import { Loading } from "@/components/StateBlock";

/**
 * Staff dashboard: the title, the one-time welcome banner and a lookup to any account. The employee's role, permissions
 * and branch are not repeated here: the role (click it for the permissions) is in the left panel and the branch is under the brand.
 */
export default function StaffHomePage() {
  const { user } = useAuth();

  if (!user) return <Loading />;

  return (
    <>
      <h1 className="center">Brite Dashboard</h1>
      <Greeting />

      {user.privileges?.includes("VIEW_ACCOUNT") && <AccountLookup kind="staff" />}
    </>
  );
}
