import { NextResponse } from "next/server";
import { getProfile } from "@/lib/profiles";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions, verifySessionToken } from "@/lib/session";
import { authenticate } from "@/lib/users";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const remember = body?.remember === true;
  const user = authenticate(String(body?.username ?? "").trim(), String(body?.password ?? ""));
  if (!user) return NextResponse.json({ message: "Invalid username or password." }, { status: 401 });

  const token = await createSessionToken(user.username, user.customerId, remember);
  const session = (await verifySessionToken(token))!;
  const res = NextResponse.json({
    username: user.username,
    customerId: user.customerId,
    displayName: getProfile(user.username).displayName,
    sessionExpires: session.exp * 1000,
  });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(remember));
  return res;
}
