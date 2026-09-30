// Demo session: an HMAC-signed cookie. Uses Web Crypto so it runs in both route handlers and proxy.ts.
// This is front-end-only demo auth: the banking backend does not authenticate requests.
export const SESSION_COOKIE = "bank_session";
export const SESSION_MAX_AGE = 60 * 60 * 8; // seconds

export interface Session {
  username: string;
  customerId: string;
  exp: number; // epoch seconds
}

function secret(): string {
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
  crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, [usage]);

export async function createSessionToken(username: string, customerId: string): Promise<string> {
  const session: Session = { username, customerId, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE };
  const payload = b64url(enc.encode(JSON.stringify(session)));
  const sig = await crypto.subtle.sign("HMAC", await key("sign"), enc.encode(payload));
  return `${payload}.${b64url(sig)}`;
}

export async function verifySessionToken(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    const ok = await crypto.subtle.verify("HMAC", await key("verify"), fromB64url(sig), enc.encode(payload));
    if (!ok) return null;
    const session: Session = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    return session.exp > Date.now() / 1000 ? session : null;
  } catch {
    return null;
  }
}
