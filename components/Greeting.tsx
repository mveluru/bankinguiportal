"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { GREETING_MS, clearGreeting, currentGreeting, loadGreeting, subscribeGreeting } from "@/lib/greeting";

/** The one-time welcome headline after sign-in. Shows on the landing screen only: any navigation, a reload, or 20 seconds removes it. */
export default function Greeting() {
  const text = useSyncExternalStore(subscribeGreeting, currentGreeting, () => null);
  useEffect(() => loadGreeting(), []);
  // Also goes away on its own after 20 seconds.
  useEffect(() => {
    if (!text) return;
    const t = setTimeout(clearGreeting, GREETING_MS);
    return () => clearTimeout(t);
  }, [text]);
  return text ? (
    <p role="status" className="greeting">
      {text}
    </p>
  ) : null;
}

/** True while the one-time welcome banner is on screen (so a heading can say "Welcome" only as long as the banner does). */
export const useGreetingActive = () => !!useSyncExternalStore(subscribeGreeting, currentGreeting, () => null);

/** Mounted once in the layout: the first route change after the landing screen clears the greeting. */
export function GreetingReset() {
  const pathname = usePathname();
  const landed = useRef(pathname);
  useEffect(() => {
    if (pathname !== landed.current) {
      landed.current = pathname;
      clearGreeting();
    }
  }, [pathname]);
  return null;
}
