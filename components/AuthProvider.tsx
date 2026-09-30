"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { setCustomerId } from "@/lib/api";

interface AuthUser {
  username: string;
  customerId: string;
  displayName?: string;
  sessionExpires: number; // epoch ms
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-reads the session user (e.g. after editing the profile). */
  refresh: () => Promise<void>;
  /** Pushes the session expiry out ("stay signed in"). Resolves false if the session is already gone. */
  extendSession: () => Promise<boolean>;
  /** Ends the session because it timed out and shows the sign-in page with a notice. */
  expireSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const apply = useCallback((u: AuthUser | null) => {
    setCustomerId(u?.customerId ?? null);
    setUser(u);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(apply)
      .catch(() => apply(null))
      .finally(() => setLoading(false));
  }, [apply]);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message ?? "Sign in failed.");
      apply(body);
    },
    [apply],
  );

  const refresh = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    apply(res.ok ? await res.json() : null);
  }, [apply]);

  const extendSession = useCallback(async () => {
    const res = await fetch("/api/auth/refresh", { method: "POST" });
    if (!res.ok) return false;
    const { sessionExpires } = await res.json();
    setUser((u) => (u ? { ...u, sessionExpires } : u));
    return true;
  }, []);

  const expireSession = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    apply(null);
    router.replace("/login?expired=1");
  }, [apply, router]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    apply(null);
    router.replace("/login");
  }, [apply, router]);

  return <AuthContext.Provider value={{ user, loading, login, logout, refresh, extendSession, expireSession }}>{children}</AuthContext.Provider>;
}
