// The backend gateway caps every customer and employee at a number of requests per day (1,000 by default) and answers 429 with
// "Daily request limit exceeded for customer 1: max 1000 requests per day". Rules (also in the portal-conventions skill):
//  - It is announced ONCE, as a pop-up (components/RateLimitNotice.tsx), when the limit is first exceeded. Every later request
//    fails the same way, so the pop-up stays quiet until a request succeeds again (the limit has reset) and it is exceeded anew.
//  - It is never shown as a red inline message: components/StateBlock.tsx swaps it for a short grey "not available right now" note,
//    so a screen that could not load is never just blank. The pop-up and the Help entry explain the cause.
// Client-safe.
export const RATE_LIMIT_EVENT = "daily-request-limit";
const SHOWN_KEY = "dailyLimitShown"; // sessionStorage: survives reloads in this tab, gone when the tab closes

/** True for the backend's daily-limit message, however it reached us. */
export const isRateLimitMessage = (message: string) => /daily request limit/i.test(message);

const shown = () => {
  try {
    return sessionStorage.getItem(SHOWN_KEY) === "1";
  } catch {
    return false;
  }
};

/** Asks the layout's pop-up to open, unless it was already shown for this stretch of exceeded limit. */
export const announceRateLimit = (message: string) => {
  if (typeof window === "undefined" || shown()) return;
  try {
    sessionStorage.setItem(SHOWN_KEY, "1");
  } catch {}
  window.dispatchEvent(new CustomEvent(RATE_LIMIT_EVENT, { detail: message }));
};

/** A request succeeded, so the limit is not exceeded any more: the next 429 may pop up again. */
export const clearRateLimitNotice = () => {
  if (typeof window === "undefined" || !shown()) return;
  try {
    sessionStorage.removeItem(SHOWN_KEY);
  } catch {}
};
