import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, statSync } from "node:fs";
import path from "node:path";
import type { AuditEvent, AuditRecord } from "@/lib/audit-events";

// Append-only audit log of sign-in and account-security events: one JSON object per line in .data/audit.log
// (gitignored, mode 600). Route handlers only. Rotates to audit.log.1 past AUDIT_MAX_BYTES (default 1 MB), so
// disk use is bounded at about twice that. Never record passwords, codes, tokens or recovery codes here.
const DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DIR, "audit.log");
const OLD_FILE = `${FILE}.1`;
const maxBytes = () => Number(process.env.AUDIT_MAX_BYTES) || 1_000_000;

/** Strips control characters (defence in depth on top of JSON escaping) and caps the length. */
const clean = (value: string | null | undefined, max: number) =>
  value ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) || undefined : undefined;

/**
 * Best-effort client details. X-Forwarded-For / X-Real-IP are only trustworthy behind a proxy you control, and
 * with `next dev` there is usually none, so treat the IP as informational.
 */
function clientInfo(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0] ?? request.headers.get("x-real-ip");
  return { ip: clean(forwarded, 45), userAgent: clean(request.headers.get("user-agent"), 200) };
}

/** Records an event. Never throws: a logging problem must not break sign-in (it is reported on the server console). */
export function audit(request: Request, event: AuditEvent, username: string, detail?: string) {
  try {
    const record: AuditRecord = {
      ts: new Date().toISOString(),
      event,
      username: clean(username, 64) ?? "",
      ...clientInfo(request),
      ...(detail ? { detail: clean(detail, 120) } : {}),
    };
    mkdirSync(DIR, { recursive: true });
    if (existsSync(FILE) && statSync(FILE).size >= maxBytes()) renameSync(FILE, OLD_FILE);
    appendFileSync(FILE, `${JSON.stringify(record)}\n`, { mode: 0o600 });
  } catch (err) {
    console.error("[audit] could not write audit record:", err);
  }
}

function readLines(file: string): AuditRecord[] {
  try {
    return readFileSync(file, "utf8")
      .split("\n")
      .filter(Boolean)
      .flatMap((line) => {
        try {
          return [JSON.parse(line) as AuditRecord];
        } catch {
          return []; // a torn or hand-edited line shouldn't hide the rest
        }
      });
  } catch {
    return [];
  }
}

export interface ActivitySummary {
  lastSignIn?: string; // ISO
  lastFailure?: string; // ISO
  failed24h: number;
}

/** Per-username (lowercase) sign-in summary across the current and rotated log, for the admin user list. */
export function activitySummaries(): Record<string, ActivitySummary> {
  const since = Date.now() - 24 * 3600_000;
  const out: Record<string, ActivitySummary> = {};
  for (const r of [...readLines(OLD_FILE), ...readLines(FILE)]) {
    if (!r.username || typeof r.ts !== "string") continue;
    const s = (out[r.username.toLowerCase()] ??= { failed24h: 0 });
    if (r.event === "login_success" && (!s.lastSignIn || r.ts > s.lastSignIn)) s.lastSignIn = r.ts;
    if (r.event === "login_failed") {
      if (!s.lastFailure || r.ts > s.lastFailure) s.lastFailure = r.ts;
      if (Date.parse(r.ts) >= since) s.failed24h++;
    }
  }
  return out;
}

/** The user's most recent events, newest first. Usernames compare case-insensitively (as lockout does). */
export function recentActivity(username: string, limit = 50): AuditRecord[] {
  const wanted = username.trim().toLowerCase();
  const mine = (r: AuditRecord) => r.username.toLowerCase() === wanted;
  const current = readLines(FILE).filter(mine);
  const all = current.length >= limit ? current : [...readLines(OLD_FILE).filter(mine), ...current];
  return all.slice(-limit).reverse();
}
