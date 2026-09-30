import { NextResponse } from "next/server";
import { createResetToken } from "@/lib/resets";
import { userExists } from "@/lib/users";

/**
 * Always answers the same way so the endpoint can't be used to discover usernames.
 * Demo delivery: there is no email service, so the reset link is printed to the server console.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const username = String(body?.username ?? "").trim();

  if (username && userExists(username)) {
    const link = `${new URL(request.url).origin}/reset-password?token=${createResetToken(username)}`;
    console.log(`[demo mailer] Password reset link for "${username}" (valid 30 min, single use): ${link}`);
  }
  return NextResponse.json({ ok: true });
}
