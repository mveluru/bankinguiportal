"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

// A notice, not a consent prompt, on purpose: the portal sets only strictly necessary cookies (the two httpOnly sign-in cookies,
// the token and the profile) plus the theme you choose yourself. None of those need consent, and offering
// "Accept / Reject" for cookies that don't exist would be misleading, since rejecting would change nothing.
// If optional cookies (analytics, marketing, ...) are ever added, replace this with real per-category choices and
// don't set them until the visitor opts in. Bump NOTICE_VERSION whenever the wording or cookie use changes
// materially, so everyone sees it again.
const STORAGE_KEY = "cookie_notice_ack";
const NOTICE_VERSION = "2";
const CHANGE_EVENT = "cookie-notice-changed";

let acknowledgedThisSession = false; // fallback when storage is blocked, so the banner still goes away

function acknowledged(): boolean {
  if (acknowledgedThisSession) return true;
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")?.v === NOTICE_VERSION;
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange); // other tabs
  window.addEventListener(CHANGE_EVENT, onChange); // this tab
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function acknowledge() {
  acknowledgedThisSession = true;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: NOTICE_VERSION, at: new Date().toISOString() }));
  } catch {
    // Storage blocked: the in-memory flag above still hides it for this visit.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export default function CookieNotice() {
  // The server (and first client render) says "already acknowledged", so nothing is rendered until the browser has
  // been asked. Returning visitors never see a flash; first-time visitors see the banner right after hydration.
  const seen = useSyncExternalStore(subscribe, acknowledged, () => true);
  if (seen) return null;

  return (
    <div className="cookie-notice" role="region" aria-label="Cookie notice">
      <div className="cookie-notice-inner">
        <p>
          We use only essential cookies, to keep you signed in and your account secure. We don&apos;t use advertising or
          analytics cookies.{" "}
          <Link href="/privacy#cookies">Learn more</Link>
        </p>
        <button type="button" onClick={acknowledge}>
          Got it
        </button>
      </div>
    </div>
  );
}
