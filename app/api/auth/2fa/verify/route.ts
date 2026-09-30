import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { getProfile } from "@/lib/profiles";
import {
  PENDING_COOKIE,
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  verifyPendingToken,
  verifySessionToken,
} from "@/lib/session";
import { verifyTwoFactor } from "@/lib/twofactor";
import { roleOf } from "@/lib/users";

/** Sign-in step 2: trades the password-step "pending" cookie plus a valid code for a real session. */
export async function POST(request: Request) {
  const jar = await cookies();
  const pending = await verifyPendingToken(jar.get(PENDING_COOKIE)?.value);
  if (!pending) {
    return NextResponse.json({ message: "Your sign-in expired. Please start again." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const result = verifyTwoFactor(pending.username, String(body?.code ?? ""));
  if (result === "locked") {
    audit(request, "two_factor_locked", pending.username);
    return NextResponse.json({ message: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }
  if (result !== "ok") {
    audit(request, "two_factor_failed", pending.username);
    return NextResponse.json({ message: "That code is not valid." }, { status: 400 });
  }

  const remember = pending.remember === true;
  const token = await createSessionToken(pending.username, pending.customerId, remember);
  const session = await verifySessionToken(token);
  if (!session) {
    // Disabled between the password step and the code step.
    audit(request, "login_disabled", pending.username);
    return NextResponse.json({ message: "This account has been disabled. Contact an administrator." }, { status: 403 });
  }
  audit(request, "login_success", pending.username, pending.remember ? "two-step, remember me" : "two-step");
  const res = NextResponse.json({
    username: pending.username,
    customerId: pending.customerId,
    displayName: getProfile(pending.username).displayName,
    role: roleOf(pending.username),
    sessionExpires: session.exp * 1000,
  });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(remember));
  res.cookies.set(PENDING_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
