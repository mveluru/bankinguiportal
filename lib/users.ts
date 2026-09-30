import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

// Demo user store. Base users come from DEMO_USERS; a changed password is saved as a scrypt hash in
// .data/users.json (gitignored) and takes precedence. Route handlers only (uses node:crypto / node:fs).
export interface DemoUser {
  username: string;
  password: string;
  customerId: string;
}

interface PasswordOverride {
  salt: string;
  hash: string;
}

const STORE_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(STORE_DIR, "users.json");

export const MIN_PASSWORD_LENGTH = 8;

/** Parses DEMO_USERS ("username:password:customerId,..."). */
export function demoUsers(): DemoUser[] {
  const raw = process.env.DEMO_USERS ?? "demo:demo1234:CUST-DEMO";
  return raw
    .split(",")
    .map((entry) => entry.trim().split(":"))
    .filter((p) => p.length === 3 && p.every(Boolean))
    .map(([username, password, customerId]) => ({ username, password, customerId }));
}

function readOverrides(): Record<string, PasswordOverride> {
  try {
    return JSON.parse(readFileSync(STORE_FILE, "utf8"));
  } catch {
    return {};
  }
}

function writeOverrides(overrides: Record<string, PasswordOverride>) {
  mkdirSync(STORE_DIR, { recursive: true });
  const tmp = `${STORE_FILE}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(overrides, null, 2), { mode: 0o600 });
  renameSync(tmp, STORE_FILE);
}

const hashPassword = (password: string, salt: string) => scryptSync(password, salt, 64).toString("hex");

const safeEqual = (a: string, b: string) => {
  // Hash first so both buffers are the same length and comparison time doesn't leak length.
  const da = createHash("sha256").update(a).digest();
  const db = createHash("sha256").update(b).digest();
  return timingSafeEqual(da, db);
};

function passwordMatches(user: DemoUser, password: string): boolean {
  const override = readOverrides()[user.username];
  return override
    ? safeEqual(hashPassword(password, override.salt), override.hash)
    : safeEqual(password, user.password);
}

export function authenticate(username: string, password: string): DemoUser | null {
  const user = demoUsers().find((u) => u.username === username);
  // Always run a comparison so timing doesn't reveal whether the username exists.
  const ok = user ? passwordMatches(user, password) : safeEqual(password, "\0");
  return user && ok ? user : null;
}

export type ChangePasswordResult = "ok" | "wrong-current" | "too-short" | "same-as-current" | "unknown-user";

export function changePassword(username: string, current: string, next: string): ChangePasswordResult {
  const user = demoUsers().find((u) => u.username === username);
  if (!user) return "unknown-user";
  if (!passwordMatches(user, current)) return "wrong-current";
  if (next.length < MIN_PASSWORD_LENGTH) return "too-short";
  if (next === current) return "same-as-current";

  setPassword(username, next);
  return "ok";
}

/** Unconditionally sets a user's password (callers must have authorised it: current password or reset token). */
export function setPassword(username: string, password: string) {
  const salt = randomBytes(16).toString("hex");
  writeOverrides({ ...readOverrides(), [username]: { salt, hash: hashPassword(password, salt) } });
}

export const userExists = (username: string) => demoUsers().some((u) => u.username === username);
