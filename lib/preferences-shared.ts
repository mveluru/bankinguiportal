// Client-safe preference types and defaults (no node imports).
export const ACTIVITY_DAY_OPTIONS = [7, 30, 60, 90] as const;

export interface NotifyPreferences {
  /** "New sign-in from <device>" alerts. */
  newDevice: boolean;
  /** "N failed sign-in attempts before you signed in". */
  failedAttempts: boolean;
  /** Informational updates: an admin unlocking or re-enabling you, a reset link being requested. */
  accountUpdates: boolean;
}

export interface Preferences {
  /** Default window for the account overview's recent activity and the statement's start date. */
  activityDays: number;
  notify: NotifyPreferences;
}

export const DEFAULT_PREFERENCES: Preferences = {
  activityDays: 30,
  notify: { newDevice: true, failedAttempts: true, accountUpdates: true },
};
