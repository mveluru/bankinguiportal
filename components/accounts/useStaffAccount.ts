"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { accountsApi } from "@/lib/api";
import type { AccountOverviewResponse, SessionUser } from "@/lib/types";

/**
 * Loads the account for a staff-only screen. Employees whose role lacks the privilege are sent back to the dashboard, so
 * the page is never shown to them (the backend refuses the calls too). `allowed` must be a stable function.
 */
export function useStaffAccount(allowed: (user: SessionUser) => boolean) {
  const { accountNumber } = useParams<{ accountNumber: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [account, setAccount] = useState<AccountOverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const permitted = !!user && allowed(user);

  useEffect(() => {
    if (!loading && !permitted) router.replace("/staff");
  }, [loading, permitted, router]);

  useEffect(() => {
    if (!permitted) return;
    let cancelled = false;
    accountsApi("staff")
      .getOverview(accountNumber)
      .then((a) => !cancelled && setAccount(a))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [accountNumber, permitted]);

  return { accountNumber, account, setAccount, error, setError, permitted };
}
