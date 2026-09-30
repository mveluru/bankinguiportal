import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ACTIVITY_DAY_OPTIONS, DEFAULT_PREFERENCES, type Preferences } from "@/lib/preferences-shared";

// Per-user preferences in .data/preferences.json (gitignored, mode 600). Route handlers only.
// Security-critical notifications (lockouts, password and 2FA changes, ...) can't be switched off here on purpose.
const STORE_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(STORE_DIR, "preferences.json");

function readAll(): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(STORE_FILE, "utf8"));
  } catch {
    return {};
  }
}

const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);

/** Stored values merged over the defaults; anything malformed falls back to the default. */
export function getPreferences(username: string): Preferences {
  const stored = (readAll()[username] ?? {}) as Partial<Preferences> & { notify?: Record<string, unknown> };
  const n: Record<string, unknown> = stored.notify ?? {};
  const d = DEFAULT_PREFERENCES;
  return {
    activityDays: (ACTIVITY_DAY_OPTIONS as readonly number[]).includes(stored.activityDays as number)
      ? (stored.activityDays as number)
      : d.activityDays,
    notify: {
      newDevice: bool(n.newDevice, d.notify.newDevice),
      failedAttempts: bool(n.failedAttempts, d.notify.failedAttempts),
      accountUpdates: bool(n.accountUpdates, d.notify.accountUpdates),
    },
  };
}

/** Validates strictly and saves. Returns an error message, or null on success. */
export function savePreferences(username: string, input: unknown): string | null {
  const i = input as { activityDays?: unknown; notify?: Record<string, unknown> } | null;
  if (!i || typeof i !== "object") return "Invalid preferences.";
  if (!(ACTIVITY_DAY_OPTIONS as readonly number[]).includes(i.activityDays as number)) {
    return `Activity window must be one of ${ACTIVITY_DAY_OPTIONS.join(", ")} days.`;
  }
  const n = i.notify;
  if (!n || typeof n !== "object" || (["newDevice", "failedAttempts", "accountUpdates"] as const).some((k) => typeof n[k] !== "boolean")) {
    return "Notification preferences must be true or false.";
  }
  const prefs: Preferences = {
    activityDays: i.activityDays as number,
    notify: { newDevice: n.newDevice as boolean, failedAttempts: n.failedAttempts as boolean, accountUpdates: n.accountUpdates as boolean },
  };
  mkdirSync(STORE_DIR, { recursive: true });
  const tmp = `${STORE_FILE}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify({ ...readAll(), [username]: prefs }, null, 2), { mode: 0o600 });
  renameSync(tmp, STORE_FILE);
  return null;
}
