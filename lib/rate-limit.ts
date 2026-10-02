// The backend gateway caps every customer and employee at a number of requests per day (1,000 by default) and answers 429 with
// "Daily request limit exceeded for customer 1: max 1000 requests per day". The API client announces it here so one pop-up
// (components/RateLimitNotice.tsx) can tell the user on whatever screen they are on. Client-safe.
export const RATE_LIMIT_EVENT = "daily-request-limit";

export const announceRateLimit = (message: string) => {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(RATE_LIMIT_EVENT, { detail: message }));
};
