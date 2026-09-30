import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { SESSION_COOKIE, peekSessionUsername } from "@/lib/session";

/** `{ "reason": "expired" }` marks a timeout rather than a deliberate sign-out (for the audit log). */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  // Works for an already-expired cookie too, so a timeout can still be attributed to the right user.
  const username = await peekSessionUsername((await cookies()).get(SESSION_COOKIE)?.value);
  if (username) audit(request, body?.reason === "expired" ? "session_expired" : "logout", username);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
