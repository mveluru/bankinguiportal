import { NextResponse } from "next/server";
import { consumeResetToken, isResetTokenValid } from "@/lib/resets";
import { MIN_PASSWORD_LENGTH, setPassword } from "@/lib/users";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = String(body?.token ?? "");
  const newPassword = String(body?.newPassword ?? "");

  // Validate before consuming, so a too-short password doesn't burn the single-use token.
  if (!token || !isResetTokenValid(token)) {
    return NextResponse.json({ message: "This reset link is invalid or has expired." }, { status: 400 });
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
      { status: 400 },
    );
  }
  const username = consumeResetToken(token);
  if (!username) return NextResponse.json({ message: "This reset link is invalid or has expired." }, { status: 400 });

  setPassword(username, newPassword);
  return NextResponse.json({ ok: true });
}
