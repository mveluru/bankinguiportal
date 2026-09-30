import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions, verifySessionToken } from "@/lib/session";

/** "Stay signed in": re-issues the session cookie with a fresh expiry. Only works while still signed in. */
export async function POST() {
  const session = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ message: "Session expired." }, { status: 401 });

  const token = await createSessionToken(session.username, session.customerId, session.remember === true);
  const fresh = await verifySessionToken(token);
  if (!fresh) return NextResponse.json({ message: "Session expired." }, { status: 401 });
  const res = NextResponse.json({ sessionExpires: fresh.exp * 1000 });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(session.remember === true));
  return res;
}
