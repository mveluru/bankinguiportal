"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getMyUsage } from "@/lib/api";

/**
 * "Logins today: N" for the signed-in customer or employee, next to Sign out. The number is the banking service's count of their
 * successful sign-ins today (it is recorded there at every sign-in, in customer_rate_limits / employee_rate_limits). Fetched once per
 * page load and on click, because every call counts as a request against the daily limit; shows nothing if it can't be loaded
 * (for example an older backend without the endpoint, or the limit already used up).
 */
export default function LoginCount() {
  const { user } = useAuth();
  const [count, setCount] = useState<number | null>(null);
  const kind = user?.kind;

  useEffect(() => {
    if (!kind) return;
    let cancelled = false;
    getMyUsage(kind)
      .then((u) => !cancelled && setCount(u.loginsToday))
      .catch(() => !cancelled && setCount(null));
    return () => {
      cancelled = true;
    };
  }, [kind]);

  if (!user || count === null) return null;

  return (
    <span className="login-count" title="Your successful sign-ins today" aria-label={`Logins today: ${count}`}>
      Logins today: <strong>{count}</strong>
    </span>
  );
}
