import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { activitySummaries, audit } from "@/lib/audit";
import { checkLock } from "@/lib/lockout";
import { getProfile } from "@/lib/profiles";
import { twoFactorStatus } from "@/lib/twofactor";
import { demoUsers } from "@/lib/users";

/** Admin-only, read-only list of every user. Deliberately includes no passwords, hashes, secrets or codes. */
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (typeof admin !== "string") return admin;

  const activity = activitySummaries();
  const users = demoUsers().map((u) => {
    const profile = getProfile(u.username);
    const lock = checkLock(u.username);
    const summary = activity[u.username.toLowerCase()] ?? { failed24h: 0 };
    return {
      username: u.username,
      customerId: u.customerId,
      role: u.role,
      displayName: profile.displayName,
      email: profile.email,
      twoFactorEnabled: twoFactorStatus(u.username).enabled,
      locked: lock.locked,
      lockedForSeconds: lock.retryAfterSeconds,
      lastSignIn: summary.lastSignIn ?? null,
      lastFailure: summary.lastFailure ?? null,
      failedLast24h: summary.failed24h,
    };
  });

  audit(request, "admin_users_viewed", admin, `${users.length} users`);
  return NextResponse.json({ users });
}
