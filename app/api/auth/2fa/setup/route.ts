import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { otpauthUri } from "@/lib/totp";
import { beginSetup } from "@/lib/twofactor";

/** Step 1 of enabling 2FA: returns a fresh secret plus a QR code for the authenticator app. */
export async function POST() {
  const session = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ message: "Not signed in." }, { status: 401 });

  const secret = beginSetup(session.username);
  if (!secret) return NextResponse.json({ message: "Two-factor authentication is already enabled." }, { status: 409 });

  const qr = await QRCode.toDataURL(otpauthUri(secret, session.username), { margin: 1, width: 220 });
  return NextResponse.json({ secret, qr });
}
