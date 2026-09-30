import { createHmac, randomBytes } from "node:crypto";

// TOTP per RFC 6238 (HMAC-SHA1, 30s step, 6 digits), compatible with Google Authenticator, Authy, 1Password, etc.
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const STEP_SECONDS = 30;
const DIGITS = 6;

export function base32Encode(bytes: Buffer): string {
  let bits = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i < bits.length; i += 5) out += ALPHABET[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
  return out;
}

export function base32Decode(text: string): Buffer {
  let bits = "";
  for (const ch of text.replace(/=+$/, "").toUpperCase()) bits += ALPHABET.indexOf(ch).toString(2).padStart(5, "0");
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

/** 160-bit random secret, base32 (what authenticator apps expect). */
export const generateSecret = () => base32Encode(randomBytes(20));

export const currentStep = (now = Date.now()) => Math.floor(now / 1000 / STEP_SECONDS);

export function codeForStep(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const h = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = h[h.length - 1] & 0x0f;
  const bin = h.readUInt32BE(offset) & 0x7fffffff;
  return String(bin % 10 ** DIGITS).padStart(DIGITS, "0");
}

/**
 * Checks a code against the current step and one step either side (clock drift). Returns the matching
 * step, or null. Callers store the step and reject anything <= the last accepted one (replay protection).
 */
export function matchStep(secret: string, code: string, now = Date.now()): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const here = currentStep(now);
  for (const step of [here, here - 1, here + 1]) {
    if (codeForStep(secret, step) === code) return step;
  }
  return null;
}

export const otpauthUri = (secret: string, username: string, issuer = "Brite Banking") =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(username)}` +
  `?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
