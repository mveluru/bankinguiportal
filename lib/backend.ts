import { cookies } from "next/headers";
import { PROFILE_COOKIE, TOKEN_COOKIE, decodeToken } from "@/lib/session";
import type { PortalKind, SessionUser } from "@/lib/types";

// Server-only: the browser never calls the banking service. Route handlers do, adding the Bearer token from the cookie.
const BACKEND = (process.env.BANKING_BACKEND_URL ?? "http://localhost:8081/brite").replace(/\/+$/, "");
const trim = (p: string) => p.replace(/\/+$/, "");
const PREFIX: Record<PortalKind, string> = {
  customer: trim(process.env.BFF_PORTAL_PATH ?? "/bff/v1/portal"),
  staff: trim(process.env.BFF_STAFF_PATH ?? "/bff/v1/staff"),
};

/** The gateway requires an X-Customer-Id header (its rate-limit key) on every call, even before login. */
export function rateKey(request: Request, user: SessionUser | null): string {
  if (user) return user.employeeNumber ?? String(user.customerId);
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "anonymous";
}

export function callBackend(kind: PortalKind, path: string, init: RequestInit & { token?: string; key: string }) {
  const { token, key, headers, ...rest } = init;
  return fetch(`${BACKEND}${PREFIX[kind]}${path}`, {
    ...rest,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-Customer-Id": key,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
}

/** The current session from the cookies, or null if signed out or the token has expired. */
export async function getSession(): Promise<{ token: string; user: SessionUser } | null> {
  const jar = await cookies();
  const token = jar.get(TOKEN_COOKIE)?.value;
  const claims = decodeToken(token);
  if (!token || !claims || claims.exp <= Date.now() / 1000) return null;
  try {
    const profile = JSON.parse(jar.get(PROFILE_COOKIE)?.value ?? "");
    return { token, user: { ...profile, sessionExpires: claims.exp * 1000 } };
  } catch {
    return null;
  }
}
