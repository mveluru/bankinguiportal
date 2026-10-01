import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { TOKEN_COOKIE, homeOf, tokenKind } from "@/lib/session";

const PUBLIC_PAGES = ["/forgot-password", "/staff/forgot-password", "/help", "/terms", "/privacy"];
const LOGIN_PAGES = ["/login", "/staff/login"];

/**
 * Routes each signed-in user to their own portal and everyone else to a sign-in page. It only reads the token's
 * kind and expiry (not its signature): the real checks are the backend's, on every call. /api/* is not gated here.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const kind = tokenKind(request.cookies.get(TOKEN_COOKIE)?.value);
  const staffArea = pathname === "/staff" || pathname.startsWith("/staff/");

  if (PUBLIC_PAGES.includes(pathname)) return NextResponse.next();

  if (LOGIN_PAGES.includes(pathname)) {
    return kind ? NextResponse.redirect(new URL(homeOf(kind), request.url)) : NextResponse.next();
  }
  if (kind) {
    // Customers stay out of /staff, and staff use /staff instead of the customer screens.
    const home = homeOf(kind);
    return (kind === "staff") === staffArea ? NextResponse.next() : NextResponse.redirect(new URL(home, request.url));
  }

  const login = new URL(staffArea ? "/staff/login" : "/login", request.url);
  if (pathname !== "/" && pathname !== "/staff") login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
