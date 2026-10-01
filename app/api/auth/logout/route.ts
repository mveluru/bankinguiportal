import { NextResponse } from "next/server";
import { clearSession } from "@/lib/bff-proxy";

/** Tokens are stateless on the backend, so signing out just drops the cookies. */
export async function POST() {
  return clearSession(NextResponse.json({ ok: true }));
}
