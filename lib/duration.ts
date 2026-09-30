/** Small formatting helpers for turning configured seconds/minutes into words. Client-safe. */
export const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;

/** 28800 -> "8 hours", 2592000 -> "30 days", 90 -> "2 minutes". */
export const duration = (seconds: number) =>
  seconds % 86400 === 0 ? plural(seconds / 86400, "day")
    : seconds % 3600 === 0 ? plural(seconds / 3600, "hour")
    : plural(Math.max(1, Math.round(seconds / 60)), "minute");

/** Positive number from an env string, else the fallback. */
export const num = (v: string | undefined, fallback: number) => Number(v) || fallback;
