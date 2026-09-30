import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

// Admin-controlled account state per username, in .data/accounts.json (gitignored, mode 600). Node runtime only
// (route handlers and proxy.ts). Sessions are stateless signed cookies, so this is what lets an admin cut one off:
//  - disabled:      no sign-in, and every existing session stops validating immediately
//  - revokedBefore: sessions issued at or before this instant (epoch ms) stop validating; survives re-enabling
interface AccountState {
  disabled?: boolean;
  revokedBefore?: number;
}

const STORE_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(STORE_DIR, "accounts.json");

function readAll(): Record<string, AccountState> {
  try {
    return JSON.parse(readFileSync(STORE_FILE, "utf8"));
  } catch {
    return {};
  }
}

function save(username: string, state: AccountState) {
  mkdirSync(STORE_DIR, { recursive: true });
  const tmp = `${STORE_FILE}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify({ ...readAll(), [username]: state }, null, 2), { mode: 0o600 });
  renameSync(tmp, STORE_FILE);
}

export const isDisabled = (username: string) => readAll()[username]?.disabled === true;

/** Disables the account and revokes every session issued so far. */
export function disableAccount(username: string) {
  save(username, { ...readAll()[username], disabled: true, revokedBefore: Date.now() });
}

/** Re-enables sign-in. Sessions from before the disable stay revoked. */
export function enableAccount(username: string) {
  save(username, { ...readAll()[username], disabled: false });
}

/** True if a session issued at `issuedAtMs` (missing on tokens from before revocation existed) must be rejected. */
export function isSessionRevoked(username: string, issuedAtMs: number | undefined): boolean {
  const state = readAll()[username];
  if (!state) return false;
  if (state.disabled) return true;
  return state.revokedBefore !== undefined && (issuedAtMs ?? 0) <= state.revokedBefore;
}
