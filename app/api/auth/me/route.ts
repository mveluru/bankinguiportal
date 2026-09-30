import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getProfile } from "@/lib/profiles";
import { getPreferences } from "@/lib/preferences";
import { roleOf } from "@/lib/users";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export async function GET() {
  const session = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ message: "Not signed in." }, { status: 401 });
  return NextResponse.json({
    username: session.username,
    customerId: session.customerId,
    displayName: getProfile(session.username).displayName,
    role: roleOf(session.username),
    activityDays: getPreferences(session.username).activityDays,
    sessionExpires: session.exp * 1000, // epoch ms
  });
}
