import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { authSecret } from "@/lib/session";
import { generateSecret, matchStep } from "@/lib/totp";

// Two-factor state per user in .data/twofactor.json (gitignored, mode 600). Route handlers only.
// TOTP secrets are encrypted at rest (AES-256-GCM, key derived from AUTH_SECRET); recovery codes are hashed.
interface UserTwoFactor {
  enabled: boolean;
  secretEnc?: string;
  pendingSecretEnc?: string; // set during setup, promoted to secretEnc once a code is confirmed
  recovery: string[]; // SHA-256 hashes of unused recovery codes
  lastStep: number; // last accepted TOTP step: codes at or before it are rejected (replay protection)
  failures: number;
  lockedUntil: number; // epoch ms
}

const STORE_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(STORE_DIR, "twofactor.json");
export const MAX_FAILURES = 5;
export const LOCKOUT_MS = 5 * 60_000;
const RECOVERY_CODE_COUNT = 10;

const readAll = (): Record<string, UserTwoFactor> => {
  try {
    return JSON.parse(readFileSync(STORE_FILE, "utf8"));
  } catch {
    return {};
  }
};

function writeAll(all: Record<string, UserTwoFactor>) {
  mkdirSync(STORE_DIR, { recursive: true });
  const tmp = `${STORE_FILE}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(all, null, 2), { mode: 0o600 });
  renameSync(tmp, STORE_FILE);
}

const empty = (): UserTwoFactor => ({ enabled: false, recovery: [], lastStep: 0, failures: 0, lockedUntil: 0 });
const load = (username: string) => ({ ...empty(), ...readAll()[username] });
const save = (username: string, state: UserTwoFactor) => writeAll({ ...readAll(), [username]: state });

const aesKey = () => createHash("sha256").update(`2fa:${authSecret()}`).digest();

function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", aesKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ct].map((b) => b.toString("base64")).join(".");
}

function decrypt(blob: string): string {
  const [iv, tag, ct] = blob.split(".").map((p) => Buffer.from(p, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", aesKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

const hashRecovery = (code: string) =>
  createHash("sha256").update(code.toLowerCase().replace(/[^0-9a-f]/g, "")).digest("hex");

const newRecoveryCode = () => {
  const hex = randomBytes(6).toString("hex");
  return `${hex.slice(0, 6)}-${hex.slice(6)}`;
};

export const isTwoFactorEnabled = (username: string) => load(username).enabled;

export function twoFactorStatus(username: string) {
  const s = load(username);
  return { enabled: s.enabled, recoveryCodesRemaining: s.enabled ? s.recovery.length : 0 };
}

/** Starts (or restarts) setup: stores a pending secret and returns it for the QR code. */
export function beginSetup(username: string): string | null {
  const s = load(username);
  if (s.enabled) return null;
  const secret = generateSecret();
  save(username, { ...s, pendingSecretEnc: encrypt(secret) });
  return secret;
}

/** Confirms setup with a code from the app. Returns the one-time recovery codes, or null if the code is wrong. */
export function confirmEnable(username: string, code: string): string[] | null {
  const s = load(username);
  if (s.enabled || !s.pendingSecretEnc) return null;
  const step = matchStep(decrypt(s.pendingSecretEnc), code);
  if (step === null) return null;
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, newRecoveryCode);
  save(username, {
    enabled: true,
    secretEnc: s.pendingSecretEnc,
    recovery: codes.map(hashRecovery),
    lastStep: step,
    failures: 0,
    lockedUntil: 0,
  });
  return codes;
}

export type VerifyResult = "ok" | "invalid" | "locked";

/** Verifies a sign-in / disable code: a TOTP code (once per step) or an unused recovery code. */
export function verifyTwoFactor(username: string, input: string): VerifyResult {
  const s = load(username);
  if (!s.enabled || !s.secretEnc) return "invalid";
  if (s.lockedUntil > Date.now()) return "locked";

  const code = input.trim();
  let next: UserTwoFactor | null = null;
  const step = matchStep(decrypt(s.secretEnc), code);
  if (step !== null && step > s.lastStep) {
    next = { ...s, lastStep: step };
  } else if (step === null) {
    const hash = hashRecovery(code);
    if (s.recovery.includes(hash)) next = { ...s, recovery: s.recovery.filter((h) => h !== hash) };
  }

  if (next) {
    save(username, { ...next, failures: 0, lockedUntil: 0 });
    return "ok";
  }
  const failures = s.failures + 1;
  const locked = failures >= MAX_FAILURES;
  save(username, { ...s, failures: locked ? 0 : failures, lockedUntil: locked ? Date.now() + LOCKOUT_MS : 0 });
  return locked ? "locked" : "invalid";
}

export function disableTwoFactor(username: string) {
  const { [username]: _removed, ...rest } = readAll();
  void _removed;
  writeAll(rest);
}
