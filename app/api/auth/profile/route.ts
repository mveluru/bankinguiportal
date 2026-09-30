import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getProfile, saveProfile } from "@/lib/profiles";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

// /api/auth/* is excluded from proxy.ts, so these handlers check the session themselves.
async function currentSession() {
  return verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function GET() {
  const session = await currentSession();
  if (!session) return NextResponse.json({ message: "Not signed in." }, { status: 401 });
  return NextResponse.json({
    username: session.username,
    customerId: session.customerId,
    sessionExpires: new Date(session.exp * 1000).toISOString(),
    ...getProfile(session.username),
  });
}

export async function PUT(request: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ message: "Not signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const error = saveProfile(session.username, {
    displayName: String(body?.displayName ?? ""),
    email: String(body?.email ?? ""),
  });
  if (error) return NextResponse.json({ message: error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
