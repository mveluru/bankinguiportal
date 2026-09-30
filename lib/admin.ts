import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { roleOf } from "@/lib/users";

/**
 * Guard for admin-only API routes: the real access control (the nav link and page are just convenience).
 * Returns the admin's username, or the 401/403 response to send. The role comes from the current configuration,
 * not from the session token.
 */
export async function requireAdmin(request: Request): Promise<string | NextResponse> {
  const session = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ message: "Not signed in." }, { status: 401 });
  if (roleOf(session.username) !== "admin") {
    audit(request, "admin_access_denied", session.username, new URL(request.url).pathname);
    return NextResponse.json({ message: "Administrator access required." }, { status: 403 });
  }
  return session.username;
}
