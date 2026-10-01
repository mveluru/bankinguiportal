import { NextResponse } from "next/server";
import { callBackend, rateKey } from "@/lib/backend";
import { readErrorMessage } from "@/lib/http-error";
import { PROFILE_COOKIE, TOKEN_COOKIE, cookieOptions, decodeToken } from "@/lib/session";
import type { PortalEmployee, PortalKind, PortalLocation, SessionUser } from "@/lib/types";

interface CustomerLogin {
  accessToken: string;
  customer: { customerId: number; firstName: string; lastName: string };
}
interface StaffLogin {
  accessToken: string;
  employee: PortalEmployee;
  branch: PortalLocation | null;
}

/**
 * Signs a customer or an employee in against the backend (POST /bff/v1/{portal|staff}/login). The JWT goes into an
 * httpOnly cookie and never into the response; the browser gets only the profile. Wrong password 401, locked 423,
 * login not active 403: the backend's message is passed on as is.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const kind: PortalKind = body?.kind === "staff" ? "staff" : "customer";
  const username = String(body?.username ?? "").trim();
  const password = String(body?.password ?? "");
  if (!username || !password) return NextResponse.json({ message: "Enter your username and password." }, { status: 400 });

  let res: Response;
  try {
    res = await callBackend(kind, "/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
      key: rateKey(request, null),
    });
  } catch {
    return NextResponse.json({ message: "Cannot reach the banking service. It may be down." }, { status: 502 });
  }
  if (!res.ok) return NextResponse.json({ message: await readErrorMessage(res) }, { status: res.status });

  const login = await res.json();
  const claims = decodeToken(login.accessToken);
  if (!claims) return NextResponse.json({ message: "The banking service returned an unusable token." }, { status: 502 });

  const user: Omit<SessionUser, "sessionExpires"> =
    kind === "staff"
      ? (({ employee, branch }: StaffLogin) => ({
          kind,
          username,
          displayName: `${employee.firstName} ${employee.lastName}`,
          employeeNumber: employee.employeeNumber,
          role: employee.role,
          privileges: employee.privileges,
          branch,
        }))(login)
      : (({ customer }: CustomerLogin) => ({
          kind,
          username,
          displayName: `${customer.firstName} ${customer.lastName}`,
          customerId: customer.customerId,
        }))(login);

  // Shown once on the landing screen and never stored. The backend has no "customer since" field, so it is the year of
  // the customer's earliest account in the sign-in response (the home bundle lists the newest open accounts only).
  const greeting =
    kind === "staff"
      ? `Welcome ${user.displayName} ${user.employeeNumber}`
      : (() => {
          const years = ((login.home?.accounts ?? []) as { createdDate?: string }[])
            .map((a) => Number(a.createdDate?.slice(0, 4)))
            .filter(Boolean);
          return `Welcome! ${user.displayName}${years.length ? ` · customer since ${Math.min(...years)}` : ""}`;
        })();

  const maxAge = Math.max(1, claims.exp - Math.floor(Date.now() / 1000));
  const out = NextResponse.json({ ...user, sessionExpires: claims.exp * 1000, greeting });
  out.cookies.set(TOKEN_COOKIE, login.accessToken, cookieOptions(maxAge));
  out.cookies.set(PROFILE_COOKIE, JSON.stringify(user), cookieOptions(maxAge));
  return out;
}
