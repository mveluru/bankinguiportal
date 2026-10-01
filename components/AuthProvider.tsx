"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { hardNavigate } from "@/lib/navigation";
import { loginOf } from "@/lib/session";
import { readErrorMessage } from "@/lib/http-error";
import type { PortalKind, SessionUser } from "@/lib/types";

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  /** Signs a customer or an employee in against the backend; the token stays in an httpOnly cookie. */
  login: (kind: PortalKind, username: string, password: string) => Promise<SessionUser>;
  logout: () => Promise<void>;
  /** Ends the session because it timed out and shows the sign-in page with a notice. */
  expireSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};

/** True when the signed-in employee's role grants the privilege (the backend enforces it again on every call). */
export const can = (user: SessionUser | null, privilege: NonNullable<SessionUser["privileges"]>[number]) =>
  !!user?.privileges?.includes(privilege);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (kind: PortalKind, username: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, username, password }),
    });
    if (!res.ok) throw new Error(await readErrorMessage(res));
    const u: SessionUser = await res.json();
    setUser(u);
    return u;
  }, []);

  const end = useCallback(
    async (suffix: string) => {
      const kind = user?.kind ?? "customer";
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
      setUser(null);
      hardNavigate(`${loginOf(kind)}${suffix}`);
    },
    [user],
  );

  const logout = useCallback(() => end(""), [end]);
  const expireSession = useCallback(() => end("?expired=1"), [end]);

  return <AuthContext.Provider value={{ user, loading, login, logout, expireSession }}>{children}</AuthContext.Provider>;
}
