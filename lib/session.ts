import type { PortalKind } from "@/lib/types";

// The backend issues the JWT (customer or employee). It lives in an httpOnly cookie that browser scripts never read;
// route handlers attach it as a Bearer header. A second httpOnly cookie holds the display profile (name, role,
// privileges) returned at login. Nothing here is trusted for access: the backend re-checks the token on every call.
// This file is edge-safe (no node imports) because proxy.ts uses it.
export const TOKEN_COOKIE = "bank_token";
export const PROFILE_COOKIE = "bank_profile";

export const cookieOptions = (maxAgeSeconds: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: maxAgeSeconds,
});

export interface TokenClaims {
  type: string; // "customer" | "employee"
  sub: string;
  exp: number; // epoch seconds
}

/** Reads a JWT's claims WITHOUT verifying the signature. For routing and display only, never for access decisions. */
export function decodeToken(token: string | undefined): TokenClaims | null {
  const payload = token?.split(".")[1];
  if (!payload) return null;
  try {
    const bytes = Uint8Array.from(atob(payload.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    const c = JSON.parse(new TextDecoder().decode(bytes));
    return typeof c.type === "string" && typeof c.sub === "string" && typeof c.exp === "number" ? c : null;
  } catch {
    return null;
  }
}

/** Which portal a still-unexpired token belongs to; null if it is missing, malformed or expired. */
export function tokenKind(token: string | undefined): PortalKind | null {
  const c = decodeToken(token);
  if (!c || c.exp <= Date.now() / 1000) return null;
  return c.type === "employee" ? "staff" : c.type === "customer" ? "customer" : null;
}

/** Home page of each portal. */
export const homeOf = (kind: PortalKind) => (kind === "staff" ? "/staff" : "/");
export const loginOf = (kind: PortalKind) => (kind === "staff" ? "/staff/login" : "/login");
