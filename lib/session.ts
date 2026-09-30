// Demo session: an HMAC-signed cookie. Uses Web Crypto so it runs in both route handlers and proxy.ts.
// This is front-end-only demo auth: the banking backend does not authenticate requests.
export const SESSION_COOKIE = "bank_session";
/** Session length in seconds: SESSION_MAX_AGE_SECONDS, default 8 hours. */
export const sessionMaxAge = () => Number(process.env.SESSION_MAX_AGE_SECONDS) || 60 * 60 * 8;
/** "Remember me" session length in seconds: REMEMBER_ME_MAX_AGE_SECONDS, default 30 days. */
export const rememberMaxAge = () => Number(process.env.REMEMBER_ME_MAX_AGE_SECONDS) || 60 * 60 * 24 * 30;
export const sessionLifetime = (remember: boolean) => (remember ? rememberMaxAge() : sessionMaxAge());

/**
 * Cookie attributes for the session cookie. Without "remember me" there is no maxAge, so it is a
 * browser-session cookie that goes away when the browser closes (the signed expiry still applies).
 */
export const sessionCookieOptions = (remember: boolean) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  ...(remember ? { maxAge: rememberMaxAge() } : {}),
});

export interface Session {
  username: string;
  customerId: string;
  exp: number; // epoch seconds
  remember?: boolean; // "remember me": persistent cookie + longer lifetime, preserved on refresh
}

export function authSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set in production");
  return "dev-only-secret";
}

const enc = new TextEncoder();

const b64url = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

const key = (usage: KeyUsage) =>
  crypto.subtle.importKey("raw", enc.encode(authSecret()), { name: "HMAC", hash: "SHA-256" }, false, [usage]);

async function sign(claims: object): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify(claims)));
  const sig = await crypto.subtle.sign("HMAC", await key("sign"), enc.encode(payload));
  return `${payload}.${b64url(sig)}`;
}

/** Returns the signed claims if the signature is valid and the token hasn't expired. */
async function open<T extends { exp: number; kind?: string }>(token: string | undefined): Promise<T | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await key("verify"), fromB64url(sig), enc.encode(payload));
    if (!ok) return null;
    const claims: T = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    return claims.exp > Date.now() / 1000 ? claims : null;
  } catch {
    return null;
  }
}

export async function createSessionToken(username: string, customerId: string, remember = false): Promise<string> {
  const session: Session = {
    username,
    customerId,
    exp: Math.floor(Date.now() / 1000) + sessionLifetime(remember),
    ...(remember ? { remember } : {}),
  };
  return sign(session);
}

export async function verifySessionToken(token: string | undefined): Promise<Session | null> {
  const claims = await open<Session & { kind?: string }>(token);
  // A 2FA-pending token is signed with the same key; it must never be accepted as a session.
  return claims && claims.kind === undefined ? claims : null;
}

/** Username from a validly signed session token even if it has expired. For audit logging only, never for access. */
export async function peekSessionUsername(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    if (!(await crypto.subtle.verify("HMAC", await key("verify"), fromB64url(sig), enc.encode(payload)))) return null;
    const claims = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    return claims.kind === undefined && typeof claims.username === "string" ? claims.username : null;
  } catch {
    return null;
  }
}

// --- Two-factor "pending" token: proves the password step passed, valid only for the code step. ---
export const PENDING_COOKIE = "bank_2fa_pending";
export const PENDING_MAX_AGE = 5 * 60; // seconds

export interface PendingTwoFactor {
  kind: "2fa";
  username: string;
  customerId: string;
  remember?: boolean;
  exp: number; // epoch seconds
}

export const createPendingToken = (username: string, customerId: string, remember: boolean) =>
  sign({
    kind: "2fa",
    username,
    customerId,
    ...(remember ? { remember } : {}),
    exp: Math.floor(Date.now() / 1000) + PENDING_MAX_AGE,
  } satisfies PendingTwoFactor);

export async function verifyPendingToken(token: string | undefined): Promise<PendingTwoFactor | null> {
  const claims = await open<PendingTwoFactor>(token);
  return claims?.kind === "2fa" ? claims : null;
}

export const pendingCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: PENDING_MAX_AGE,
});
