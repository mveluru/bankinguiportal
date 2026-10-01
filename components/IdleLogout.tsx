"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";

const IDLE_MS = (Number(process.env.NEXT_PUBLIC_IDLE_TIMEOUT_SECONDS) || 120) * 1000;
const KEY = "lastActivity";
const EVENTS = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"] as const;

const read = () => {
  try {
    return Number(localStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
};

/**
 * Signs the user out after IDLE_MS without any activity on any open tab and shows the sign-in page.
 * The last-activity time lives in localStorage so several tabs share one idle clock, and it is compared
 * against the wall clock (not a counter), so a sleeping or throttled tab still signs out on time.
 */
export default function IdleLogout() {
  const { user, expireSession } = useAuth();
  const expiring = useRef(false);
  const signedIn = !!user;

  useEffect(() => {
    if (!signedIn) return;
    let last = Date.now();
    const touch = () => {
      last = Date.now();
      try {
        localStorage.setItem(KEY, String(last));
      } catch {}
    };
    touch();
    const check = () => {
      if (expiring.current || Date.now() - Math.max(last, read()) < IDLE_MS) return;
      expiring.current = true;
      expireSession().finally(() => (expiring.current = false));
    };
    EVENTS.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    document.addEventListener("visibilitychange", check);
    const id = setInterval(check, 5000);
    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, touch));
      document.removeEventListener("visibilitychange", check);
      clearInterval(id);
    };
  }, [signedIn, expireSession]);

  return null;
}
