/**
 * Full page load, for auth transitions (sign in, sign out, session expiry).
 *
 * A soft `router.replace` can reuse a route the client already prefetched *before* the auth state
 * changed. In production Next prefetches `<Link>` targets, so `/` prefetched while signed out is a cached
 * redirect to /login, and navigating there after sign-in would bounce straight back. Prefetching is
 * production-only, so this never shows up under `next dev`. A hard navigation starts from a clean cache.
 */
export function hardNavigate(path: string) {
  window.location.assign(path);
}
