import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { recentActivity } from "@/lib/audit";
import type { AuditRecord } from "@/lib/audit-events";
import { describeDevice } from "@/lib/device";

// In-app notifications are a curated, plain-language view over the audit log, so there is nothing to keep in sync:
// each user's only stored state is a "read up to" timestamp in .data/notifications.json (gitignored, mode 600).
// Anything newer than that marker is unread. Route handlers only.
export interface AppNotification {
  id: string;
  ts: string; // ISO
  level: "ok" | "warn" | "info";
  title: string;
  detail?: string;
  unread: boolean;
}

const STORE_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(STORE_DIR, "notifications.json");
const HISTORY = 500; // audit events considered per user (enough to judge "new device")

function readMarkers(): Record<string, string> {
  try {
    return JSON.parse(readFileSync(STORE_FILE, "utf8"));
  } catch {
    return {};
  }
}

export function markAllRead(username: string) {
  mkdirSync(STORE_DIR, { recursive: true });
  const tmp = `${STORE_FILE}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify({ ...readMarkers(), [username]: new Date().toISOString() }, null, 2), { mode: 0o600 });
  renameSync(tmp, STORE_FILE);
}

const lockMinutes = () => Number(process.env.LOCKOUT_MINUTES) || 15;
const by = (e: AuditRecord) => (e.detail?.startsWith("by ") ? ` (${e.detail})` : "");
const IF_NOT_YOU = "If this wasn't you, change your password and turn on two-factor authentication.";

/** Events that always produce a notification on their own. */
const SIMPLE: Partial<Record<AuditRecord["event"], (e: AuditRecord) => Omit<AppNotification, "id" | "ts" | "unread">>> = {
  lockout: () => ({
    level: "warn",
    title: "Your account was locked",
    detail: `Too many failed sign-in attempts. It unlocks by itself after ${lockMinutes()} minutes, or an administrator can unlock it.`,
  }),
  password_changed: () => ({ level: "ok", title: "Your password was changed", detail: IF_NOT_YOU }),
  password_reset: () => ({ level: "ok", title: "Your password was reset", detail: IF_NOT_YOU }),
  password_reset_requested: () => ({
    level: "info",
    title: "A password reset link was requested",
    detail: "If it wasn't you, ignore it: the link expires after 30 minutes and only works once.",
  }),
  two_factor_enabled: () => ({ level: "ok", title: "Two-factor authentication was turned on" }),
  two_factor_disabled: () => ({ level: "warn", title: "Two-factor authentication was turned off", detail: IF_NOT_YOU }),
  two_factor_reset: (e) => ({
    level: "warn",
    title: `An administrator reset your two-factor authentication${by(e)}`,
    detail: "You can sign in with just your password until you set it up again.",
  }),
  account_unlocked: (e) => ({ level: "info", title: `An administrator unlocked your account${by(e)}` }),
  account_disabled: (e) => ({ level: "warn", title: `Your account was disabled by an administrator${by(e)}` }),
  account_enabled: (e) => ({ level: "ok", title: `Your account was re-enabled${by(e)}` }),
};

/** Notifications for a user, newest first, plus how many are unread (across all of them, not just the page). */
export function buildNotifications(username: string, limit = 50): { notifications: AppNotification[]; unreadCount: number } {
  const readUpTo = readMarkers()[username] ?? "";
  const found: Omit<AppNotification, "unread">[] = [];

  let failuresSinceSignIn = 0;
  let signIns = 0;
  const seenDevices = new Set<string>();

  // Oldest first, so "first time we've seen this device" is decided correctly.
  for (const e of recentActivity(username, HISTORY).reverse()) {
    if (e.event === "login_failed" || e.event === "two_factor_failed") {
      failuresSinceSignIn++;
    } else if (e.event === "login_success") {
      if (failuresSinceSignIn > 0) {
        found.push({
          id: `${e.ts}:failed`,
          ts: e.ts,
          level: "warn",
          title: `${failuresSinceSignIn} failed sign-in attempt${failuresSinceSignIn === 1 ? "" : "s"} before you signed in`,
          detail: "If that wasn't you, someone may be trying to guess your password.",
        });
      }
      const device = describeDevice(e.userAgent);
      // The very first sign-in has nothing to compare against, so it isn't flagged.
      if (device && signIns > 0 && !seenDevices.has(device)) {
        found.push({
          id: `${e.ts}:device`,
          ts: e.ts,
          level: "info",
          title: `New sign-in from ${device}`,
          detail: `${e.ip ? `IP address ${e.ip}. ` : ""}${IF_NOT_YOU}`,
        });
      }
      if (device) seenDevices.add(device);
      signIns++;
      failuresSinceSignIn = 0;
    } else {
      const simple = SIMPLE[e.event]?.(e);
      if (simple) found.push({ id: `${e.ts}:${e.event}`, ts: e.ts, ...simple });
    }
  }

  const all = found
    .map((n) => ({ ...n, unread: n.ts > readUpTo }))
    .sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
  return { notifications: all.slice(0, limit), unreadCount: all.filter((n) => n.unread).length };
}
