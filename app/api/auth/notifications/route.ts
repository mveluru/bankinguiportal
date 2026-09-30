import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildNotifications, markAllRead } from "@/lib/notifications";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

// /api/auth/* is excluded from proxy.ts, so these handlers check the session themselves.
async function currentUser() {
  return (await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value))?.username ?? null;
}

/** The signed-in user's own notifications. `?summary=1` returns only the unread count (for the nav badge). */
export async function GET(request: Request) {
  const username = await currentUser();
  if (!username) return NextResponse.json({ message: "Not signed in." }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const limit = Math.min(200, Math.max(1, Number(params.get("limit")) || 50));
  const { notifications, unreadCount } = buildNotifications(username, limit);
  return NextResponse.json(params.get("summary") ? { unreadCount } : { notifications, unreadCount });
}

/** `{ "action": "mark-all-read" }` */
export async function POST(request: Request) {
  const username = await currentUser();
  if (!username) return NextResponse.json({ message: "Not signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (body?.action !== "mark-all-read") return NextResponse.json({ message: "Unknown action." }, { status: 400 });
  markAllRead(username);
  return NextResponse.json({ ok: true, unreadCount: 0 });
}
