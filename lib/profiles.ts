import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

// Editable profile fields per demo user, saved in .data/profiles.json (gitignored). Route handlers only.
export interface Profile {
  displayName: string;
  email: string;
}

const STORE_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(STORE_DIR, "profiles.json");

export const MAX_NAME_LENGTH = 50;
export const MAX_EMAIL_LENGTH = 100;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readAll(): Record<string, Profile> {
  try {
    return JSON.parse(readFileSync(STORE_FILE, "utf8"));
  } catch {
    return {};
  }
}

/** Empty strings when the user hasn't set anything yet. */
export function getProfile(username: string): Profile {
  const stored: Partial<Profile> = readAll()[username] ?? {};
  return { displayName: stored.displayName ?? "", email: stored.email ?? "" };
}

/** Returns an error message, or null after saving. */
export function saveProfile(username: string, input: { displayName: string; email: string }): string | null {
  const displayName = input.displayName.trim();
  const email = input.email.trim();
  if (displayName.length > MAX_NAME_LENGTH) return `Display name must be at most ${MAX_NAME_LENGTH} characters.`;
  if (email.length > MAX_EMAIL_LENGTH || (email && !EMAIL.test(email))) return "Enter a valid email address.";

  mkdirSync(STORE_DIR, { recursive: true });
  const tmp = `${STORE_FILE}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify({ ...readAll(), [username]: { displayName, email } }, null, 2), { mode: 0o600 });
  renameSync(tmp, STORE_FILE);
  return null;
}
