import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

// Password-reset tokens: random, single-use, short-lived, stored only as a SHA-256 hash in .data/resets.json.
// Route handlers only (node:fs / node:crypto).
interface ResetRecord {
  username: string;
  expires: number; // epoch ms
}

const STORE_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(STORE_DIR, "resets.json");
export const RESET_TTL_MINUTES = 30;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Drops expired records on every read. */
function read(): Record<string, ResetRecord> {
  let all: Record<string, ResetRecord> = {};
  try {
    all = JSON.parse(readFileSync(STORE_FILE, "utf8"));
  } catch {
    // no store yet
  }
  const now = Date.now();
  return Object.fromEntries(Object.entries(all).filter(([, r]) => r.expires > now));
}

function write(records: Record<string, ResetRecord>) {
  mkdirSync(STORE_DIR, { recursive: true });
  const tmp = `${STORE_FILE}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(records, null, 2), { mode: 0o600 });
  renameSync(tmp, STORE_FILE);
}

/** Issues a token for the user, replacing any earlier outstanding one. Returns the raw token (never stored). */
export function createResetToken(username: string): string {
  const token = randomBytes(32).toString("hex");
  const records = Object.fromEntries(Object.entries(read()).filter(([, r]) => r.username !== username));
  records[hashToken(token)] = { username, expires: Date.now() + RESET_TTL_MINUTES * 60_000 };
  write(records);
  return token;
}

/** True if the token is valid; does not consume it. */
export const isResetTokenValid = (token: string) => hashToken(token) in read();

/** Validates and burns the token, returning the username it was issued for. */
export function consumeResetToken(token: string): string | null {
  const records = read();
  const key = hashToken(token);
  const record = records[key];
  if (!record) return null;
  delete records[key];
  write(records);
  return record.username;
}
