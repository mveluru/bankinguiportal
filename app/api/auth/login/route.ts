import { NextResponse } from "next/server";
import { getProfile } from "@/lib/profiles";
import { SESSION_COOKIE, createSessionToken, sessionMaxAge, verifySessionToken } from "@/lib/session";
import { authenticate } from "@/lib/users";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const user = authenticate(String(body?.username ?? "").trim(), String(body?.password ?? ""));
  if (!user) return NextResponse.json({ message: "Invalid username or password." }, { status: 401 });

  const token = await createSessionToken(user.username, user.customerId);
  const session = (await verifySessionToken(token))!;
  const res = NextResponse.json({
    username: user.username,
    customerId: user.customerId,
    displayName: getProfile(user.username).displayName,
    sessionExpires: session.exp * 1000,
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAge(),
  });
  return res;
}
