import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/** Gate every page and the /api/banking proxy behind the demo session (login + auth endpoints stay open). */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  // Reachable while signed out (and signed in: a reset link should work in any browser state). /help is public
  // because people who can't sign in are exactly who needs it.
  if (pathname === "/forgot-password" || pathname === "/reset-password" || pathname === "/help") return NextResponse.next();

  if (pathname === "/login" || pathname === "/login/verify") {
    return session ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }
  if (session) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ message: "Not signed in." }, { status: 401 });
  }
  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
