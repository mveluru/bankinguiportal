import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

// Failed-password lockout per username, in .data/lockouts.json (gitignored). Route handlers only.
//  - Tracked by the *attempted* username whether or not it exists, so a locked response doesn't reveal which
//    usernames are real. Case-insensitive, length-capped.
//  - Failures count within a sliding window; hitting the limit locks the name for LOCKOUT_MINUTES, during which
//    even the correct password is refused (otherwise the attacker just keeps guessing).
//  - A successful sign-in or password reset clears the counter.
// Trade-off: anyone can lock a known username by failing on purpose. That's the price of not trusting client IPs
// here; the reset link (which clears the lock) is the escape hatch.
interface Entry {
  failures: number;
  lastFailure: number; // epoch ms
  lockedUntil: number; // epoch ms, 0 when not locked
}

const STORE_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(STORE_DIR, "lockouts.json");
const MAX_ENTRIES = 1000;

export const maxAttempts = () => Number(process.env.LOCKOUT_MAX_ATTEMPTS) || 5;
const lockMs = () => (Number(process.env.LOCKOUT_MINUTES) || 15) * 60_000;
/** Failures older than this stop counting. */
const windowMs = () => lockMs();

const keyOf = (username: string) => username.trim().toLowerCase().slice(0, 64);

function read(): Record<string, Entry> {
  let all: Record<string, Entry> = {};
  try {
    all = JSON.parse(readFileSync(STORE_FILE, "utf8"));
  } catch {
    // no store yet
  }
  // Drop entries that are neither locked nor recent, and cap growth from junk usernames.
  const now = Date.now();
  const live = Object.entries(all).filter(([, e]) => e.lockedUntil > now || now - e.lastFailure < windowMs());
  live.sort(([, a], [, b]) => b.lastFailure - a.lastFailure);
  return Object.fromEntries(live.slice(0, MAX_ENTRIES));
}

function write(all: Record<string, Entry>) {
  mkdirSync(STORE_DIR, { recursive: true });
  const tmp = `${STORE_FILE}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(all, null, 2), { mode: 0o600 });
  renameSync(tmp, STORE_FILE);
}

export interface LockState {
  locked: boolean;
  retryAfterSeconds: number;
}

const stateOf = (e: Entry | undefined): LockState => {
  const remaining = e ? e.lockedUntil - Date.now() : 0;
  return remaining > 0 ? { locked: true, retryAfterSeconds: Math.ceil(remaining / 1000) } : { locked: false, retryAfterSeconds: 0 };
};

export const checkLock = (username: string): LockState => stateOf(read()[keyOf(username)]);

/** Records a failed password attempt and returns whether that attempt locked the name. */
export function registerFailure(username: string): LockState {
  const all = read();
  const key = keyOf(username);
  const now = Date.now();
  const prev = all[key];
  // A lock that has expired starts a fresh count.
  const carried = prev && prev.lockedUntil <= now && now - prev.lastFailure < windowMs() ? prev.failures : 0;
  const failures = carried + 1;
  const locked = failures >= maxAttempts();
  all[key] = { failures: locked ? 0 : failures, lastFailure: now, lockedUntil: locked ? now + lockMs() : 0 };
  write(all);
  return stateOf(all[key]);
}

export function clearFailures(username: string) {
  const all = read();
  if (delete all[keyOf(username)]) write(all);
}

/** 429 response for a locked name; the same text is used for real and unknown usernames. */
export function lockedResponse({ retryAfterSeconds }: LockState) {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return NextResponse.json(
    { message: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}
