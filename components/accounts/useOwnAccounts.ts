"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getHome } from "@/lib/api";

/**
 * The signed-in customer's own account numbers (oldest first). They come from the sign-in (profile cookie), so no request is
 * needed. A session that started before that was saved falls back to one Dashboard call. `null` while still unknown; an empty
 * list when there are none or they can't be loaded.
 */
export function useOwnAccounts(): string[] | null {
  const { user } = useAuth();
  const saved = user?.kind === "customer" ? user.accountNumbers : undefined;
  const [fetched, setFetched] = useState<string[] | null>(null);
  const needFetch = user?.kind === "customer" && !saved;

  useEffect(() => {
    if (!needFetch) return;
    let cancelled = false;
    getHome()
      .then((h) => !cancelled && setFetched([...h.accounts].sort((a, b) => a.createdDate.localeCompare(b.createdDate)).map((a) => a.accountNumber)))
      .catch(() => !cancelled && setFetched([]));
    return () => {
      cancelled = true;
    };
  }, [needFetch]);

  if (saved) return saved;
  return needFetch ? fetched : user ? [] : null;
}
