import { NextResponse } from "next/server";
import { getProfile } from "@/lib/profiles";
import {
  PENDING_COOKIE,
  SESSION_COOKIE,
  createPendingToken,
  createSessionToken,
  pendingCookieOptions,
  sessionCookieOptions,
  verifySessionToken,
} from "@/lib/session";
import { isDisabled } from "@/lib/accounts";
import { audit } from "@/lib/audit";
import { checkLock, clearFailures, lockedResponse, registerFailure } from "@/lib/lockout";
import { isTwoFactorEnabled } from "@/lib/twofactor";
import { authenticate, roleOf } from "@/lib/users";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const remember = body?.remember === true;
  const username = String(body?.username ?? "").trim();

  // Checked before the password so a locked name gets the same answer whether or not the password is right.
  const lock = checkLock(username);
  if (lock.locked) {
    audit(request, "login_blocked", username);
    return lockedResponse(lock);
  }

  const user = authenticate(username, String(body?.password ?? ""));
  if (!user) {
    const after = registerFailure(username);
    audit(request, "login_failed", username);
    if (after.locked) audit(request, "lockout", username);
    return after.locked
      ? lockedResponse(after)
      : NextResponse.json({ message: "Invalid username or password." }, { status: 401 });
  }
  clearFailures(username);

  // Only revealed after the right password, so it can't be used to probe which accounts exist or are disabled.
  if (isDisabled(user.username)) {
    audit(request, "login_disabled", user.username);
    return NextResponse.json({ message: "This account has been disabled. Contact an administrator." }, { status: 403 });
  }

  // Password is right, but with 2FA on no session exists until the code step succeeds.
  if (isTwoFactorEnabled(user.username)) {
    audit(request, "two_factor_required", user.username);
    const res = NextResponse.json({ twoFactorRequired: true });
    res.cookies.set(PENDING_COOKIE, await createPendingToken(user.username, user.customerId, remember), pendingCookieOptions());
    return res;
  }

  const token = await createSessionToken(user.username, user.customerId, remember);
  const session = await verifySessionToken(token);
  if (!session) return NextResponse.json({ message: "Sign-in failed. Please try again." }, { status: 403 });
  audit(request, "login_success", user.username, remember ? "remember me" : undefined);
  const res = NextResponse.json({
    username: user.username,
    customerId: user.customerId,
    displayName: getProfile(user.username).displayName,
    role: roleOf(user.username),
    sessionExpires: session.exp * 1000,
  });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(remember));
  return res;
}
