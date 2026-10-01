import { NextResponse } from "next/server";
import { callBackend, getSession, rateKey } from "@/lib/backend";
import { PROFILE_COOKIE, TOKEN_COOKIE } from "@/lib/session";
import type { PortalKind } from "@/lib/types";

export function clearSession(res: NextResponse) {
  res.cookies.set(TOKEN_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(PROFILE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

/**
 * Forwards /api/portal/* and /api/staff/* to the backend BFF with the session's Bearer token. The backend decides
 * who may do what; this only adds the credential, keeps the token out of the browser and refuses cross-site posts.
 */
export async function proxyToBff(request: Request, kind: PortalKind, segments: string[]) {
  // ".." would let a request climb out of the BFF prefix once the URL is normalised.
  if (segments.some((s) => s === "." || s === "..")) return NextResponse.json({ message: "Bad path." }, { status: 400 });

  // Sign-in has its own route so the token goes into the cookie and never into a response body.
  if (segments.join("/") === "login") return NextResponse.json({ message: "Not found." }, { status: 404 });

  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) {
    return NextResponse.json({ message: "Cross-site request refused." }, { status: 403 });
  }

  const session = await getSession();
  const path = `/${segments.map(encodeURIComponent).join("/")}${new URL(request.url).search}`;
  const hasBody = !["GET", "HEAD"].includes(request.method);
  let res: Response;
  try {
    res = await callBackend(kind, path, {
      method: request.method,
      body: hasBody ? await request.text() : undefined,
      token: session?.token,
      key: rateKey(request, session?.user ?? null),
    });
  } catch {
    return NextResponse.json({ message: "Cannot reach the banking service. It may be down." }, { status: 502 });
  }

  const out = new NextResponse(res.status === 204 ? null : await res.text(), {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
  // A rejected token means the session is over; and a password change revokes every earlier token, including this one.
  const passwordChanged = res.ok && request.method === "PUT" && segments.join("/") === "password";
  return (session && res.status === 401) || passwordChanged ? clearSession(out) : out;
}
