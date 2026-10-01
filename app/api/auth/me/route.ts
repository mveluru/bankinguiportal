import { NextResponse } from "next/server";
import { getSession } from "@/lib/backend";

/** The signed-in user for the UI (profile plus the token's expiry). The token itself is never returned. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Not signed in." }, { status: 401 });
  return NextResponse.json(session.user, { headers: { "Cache-Control": "no-store" } });
}
