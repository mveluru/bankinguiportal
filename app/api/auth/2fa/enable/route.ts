import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { confirmEnable } from "@/lib/twofactor";

/** Step 2: confirm a code from the app. Returns the recovery codes, which are shown only this once. */
export async function POST(request: Request) {
  const session = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ message: "Not signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const recoveryCodes = confirmEnable(session.username, String(body?.code ?? "").trim());
  if (!recoveryCodes) {
    return NextResponse.json({ message: "That code is not valid. Check your app and try again." }, { status: 400 });
  }
  return NextResponse.json({ recoveryCodes });
}
