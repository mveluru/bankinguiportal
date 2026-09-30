import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { recentActivity } from "@/lib/audit";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/** The signed-in user's own recent sign-in and security activity. Nobody can read another user's. */
export async function GET(request: Request) {
  const session = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ message: "Not signed in." }, { status: 401 });

  const limit = Math.min(200, Math.max(1, Number(new URL(request.url).searchParams.get("limit")) || 50));
  return NextResponse.json({ events: recentActivity(session.username, limit) });
}
