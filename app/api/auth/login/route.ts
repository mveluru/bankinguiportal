import { NextResponse } from "next/server";
import { getProfile } from "@/lib/profiles";
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken } from "@/lib/session";
import { authenticate } from "@/lib/users";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const user = authenticate(String(body?.username ?? "").trim(), String(body?.password ?? ""));
  if (!user) return NextResponse.json({ message: "Invalid username or password." }, { status: 401 });

  const res = NextResponse.json({
    username: user.username,
    customerId: user.customerId,
    displayName: getProfile(user.username).displayName,
  });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(user.username, user.customerId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
