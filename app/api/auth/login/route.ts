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
import { checkLock, clearFailures, lockedResponse, registerFailure } from "@/lib/lockout";
import { isTwoFactorEnabled } from "@/lib/twofactor";
import { authenticate } from "@/lib/users";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const remember = body?.remember === true;
  const username = String(body?.username ?? "").trim();

  // Checked before the password so a locked name gets the same answer whether or not the password is right.
  const lock = checkLock(username);
  if (lock.locked) return lockedResponse(lock);

  const user = authenticate(username, String(body?.password ?? ""));
  if (!user) {
    const after = registerFailure(username);
    return after.locked
      ? lockedResponse(after)
      : NextResponse.json({ message: "Invalid username or password." }, { status: 401 });
  }
  clearFailures(username);

  // Password is right, but with 2FA on no session exists until the code step succeeds.
  if (isTwoFactorEnabled(user.username)) {
    const res = NextResponse.json({ twoFactorRequired: true });
    res.cookies.set(PENDING_COOKIE, await createPendingToken(user.username, user.customerId, remember), pendingCookieOptions());
    return res;
  }

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
