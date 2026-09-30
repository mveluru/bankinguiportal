import { NextResponse } from "next/server";
import { disableAccount, enableAccount } from "@/lib/accounts";
import { requireAdmin } from "@/lib/admin";
import { audit } from "@/lib/audit";
import { clearFailures } from "@/lib/lockout";
import { disableTwoFactor } from "@/lib/twofactor";
import { userExists } from "@/lib/users";

const ACTIONS = ["unlock", "reset-2fa", "disable", "enable"] as const;
type Action = (typeof ACTIONS)[number];

/**
 * Admin actions on one existing user: unlock, reset two-factor (lost device), disable (also signs them out
 * everywhere, immediately) and enable. Each action is recorded twice in the audit log: on the target's own history,
 * so they can see it on their activity screen, and on the admin's.
 */
export async function POST(request: Request, { params }: { params: Promise<{ username: string }> }) {
  const admin = await requireAdmin(request);
  if (typeof admin !== "string") return admin;

  // Defence in depth on top of SameSite cookies: only accept a real JSON request.
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ message: "Expected application/json." }, { status: 415 });
  }

  const { username: raw } = await params;
  const username = decodeURIComponent(raw);
  if (!userExists(username)) return NextResponse.json({ message: "User not found." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const action = body?.action as Action;
  if (!ACTIONS.includes(action)) return NextResponse.json({ message: "Unknown action." }, { status: 400 });

  // An admin who disabled themselves could strand the system with nobody able to undo it.
  if (action === "disable" && username === admin) {
    return NextResponse.json({ message: "You can't disable your own account." }, { status: 400 });
  }

  switch (action) {
    case "unlock":
      clearFailures(username);
      audit(request, "account_unlocked", username, `by ${admin}`);
      break;
    case "reset-2fa":
      disableTwoFactor(username);
      audit(request, "two_factor_reset", username, `by ${admin}`);
      break;
    case "disable":
      disableAccount(username);
      audit(request, "account_disabled", username, `by ${admin}`);
      break;
    case "enable":
      enableAccount(username);
      audit(request, "account_enabled", username, `by ${admin}`);
      break;
  }
  audit(request, "admin_action", admin, `${action} ${username}`);
  return NextResponse.json({ ok: true });
}
