import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getPreferences, savePreferences } from "@/lib/preferences";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

// /api/auth/* is excluded from proxy.ts, so these handlers check the session themselves.
async function currentUser() {
  return (await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value))?.username ?? null;
}

export async function GET() {
  const username = await currentUser();
  if (!username) return NextResponse.json({ message: "Not signed in." }, { status: 401 });
  return NextResponse.json(getPreferences(username));
}

export async function PUT(request: Request) {
  const username = await currentUser();
  if (!username) return NextResponse.json({ message: "Not signed in." }, { status: 401 });
  const error = savePreferences(username, await request.json().catch(() => null));
  if (error) return NextResponse.json({ message: error }, { status: 400 });
  return NextResponse.json(getPreferences(username));
}
