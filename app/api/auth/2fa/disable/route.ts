import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { disableTwoFactor, isTwoFactorEnabled, verifyTwoFactor } from "@/lib/twofactor";
import { authenticate } from "@/lib/users";

/** Turning 2FA off needs both the password and a current code (or recovery code). */
export async function POST(request: Request) {
  const session = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ message: "Not signed in." }, { status: 401 });
  if (!isTwoFactorEnabled(session.username)) {
    return NextResponse.json({ message: "Two-factor authentication is not enabled." }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  if (!authenticate(session.username, String(body?.password ?? ""))) {
    return NextResponse.json({ message: "Password is incorrect." }, { status: 400 });
  }
  const result = verifyTwoFactor(session.username, String(body?.code ?? ""));
  if (result === "locked") {
    return NextResponse.json({ message: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }
  if (result !== "ok") return NextResponse.json({ message: "That code is not valid." }, { status: 400 });

  disableTwoFactor(session.username);
  return NextResponse.json({ ok: true });
}
