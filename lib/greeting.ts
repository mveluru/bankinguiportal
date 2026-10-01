// One-shot welcome headline shown on the landing screen right after sign-in. It is kept in sessionStorage only to
// survive the full page load that follows sign-in, and is removed the moment it is read, so a reload never shows it
// again. After that it lives in this module (not in a component, because Next keeps hidden pages' state alive) until
// the first navigation, which clears it. Never written to a cookie or the server. Client-safe.
const KEY = "welcomeGreeting";

let current: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function saveGreeting(text: string) {
  try {
    sessionStorage.setItem(KEY, text);
  } catch {}
}

/** Moves a pending greeting out of sessionStorage into the store (once). */
export function loadGreeting() {
  try {
    const text = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (text) {
      current = text;
      emit();
    }
  } catch {}
}

/** Drops the greeting, wherever it is. Call on navigation, sign-out and when sending the user past the landing screen. */
export function clearGreeting() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
  if (current !== null) {
    current = null;
    emit();
  }
}

export const subscribeGreeting = (l: () => void) => (listeners.add(l), () => void listeners.delete(l));
export const currentGreeting = () => current;
