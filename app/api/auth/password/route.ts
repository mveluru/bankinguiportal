import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { checkLock, clearFailures, lockedResponse, registerFailure } from "@/lib/lockout";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { MIN_PASSWORD_LENGTH, changePassword } from "@/lib/users";

const MESSAGES = {
  "wrong-current": ["Current password is incorrect.", 400],
  "too-short": [`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`, 400],
  "same-as-current": ["New password must be different from the current one.", 400],
  "unknown-user": ["Account not found.", 404],
} as const;

export async function POST(request: Request) {
  // /api/auth/* is excluded from proxy.ts, so this handler checks the session itself.
  const session = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ message: "Not signed in." }, { status: 401 });

  // Guessing the current password here is as good as guessing it at sign-in, so it shares the lockout.
  const lock = checkLock(session.username);
  if (lock.locked) return lockedResponse(lock);

  const body = await request.json().catch(() => null);
  const result = changePassword(session.username, String(body?.currentPassword ?? ""), String(body?.newPassword ?? ""));
  if (result === "ok") {
    clearFailures(session.username);
    return NextResponse.json({ ok: true });
  }
  if (result === "wrong-current") {
    const after = registerFailure(session.username);
    if (after.locked) return lockedResponse(after);
  }

  const [message, status] = MESSAGES[result];
  return NextResponse.json({ message }, { status });
}
