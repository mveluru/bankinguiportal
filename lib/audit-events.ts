// Client-safe description of audit events (no node imports), shared by the log writer and the activity page.
export type AuditEvent =
  | "login_success"
  | "login_failed"
  | "login_blocked"
  | "lockout"
  | "two_factor_required"
  | "two_factor_failed"
  | "two_factor_locked"
  | "logout"
  | "session_expired"
  | "password_changed"
  | "password_change_failed"
  | "password_reset_requested"
  | "password_reset"
  | "two_factor_enabled"
  | "two_factor_disabled";

/** ok = success, warn = something failed or was refused, info = neutral. */
export const EVENT_INFO: Record<AuditEvent, { label: string; level: "ok" | "warn" | "info" }> = {
  login_success: { label: "Signed in", level: "ok" },
  login_failed: { label: "Failed sign-in (wrong password)", level: "warn" },
  login_blocked: { label: "Sign-in refused (account locked)", level: "warn" },
  lockout: { label: "Account locked after repeated failures", level: "warn" },
  two_factor_required: { label: "Password accepted, code requested", level: "info" },
  two_factor_failed: { label: "Failed two-step code", level: "warn" },
  two_factor_locked: { label: "Two-step verification locked", level: "warn" },
  logout: { label: "Signed out", level: "info" },
  session_expired: { label: "Session timed out", level: "info" },
  password_changed: { label: "Password changed", level: "ok" },
  password_change_failed: { label: "Failed password change (wrong current password)", level: "warn" },
  password_reset_requested: { label: "Password reset link requested", level: "info" },
  password_reset: { label: "Password reset", level: "ok" },
  two_factor_enabled: { label: "Two-factor authentication turned on", level: "ok" },
  two_factor_disabled: { label: "Two-factor authentication turned off", level: "warn" },
};

export interface AuditRecord {
  ts: string; // ISO 8601
  event: AuditEvent;
  username: string;
  ip?: string;
  userAgent?: string;
  detail?: string;
}

/** Events that count as a failed or suspicious attempt for the "since your last sign-in" notice. */
export const FAILURE_EVENTS: AuditEvent[] = ["login_failed", "login_blocked", "two_factor_failed", "two_factor_locked"];
