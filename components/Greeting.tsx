"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { clearGreeting, currentGreeting, loadGreeting, subscribeGreeting } from "@/lib/greeting";

/** The one-time welcome headline after sign-in. Shows on the landing screen only: any navigation or reload removes it. */
export default function Greeting() {
  const text = useSyncExternalStore(subscribeGreeting, currentGreeting, () => null);
  useEffect(() => loadGreeting(), []);
  return text ? (
    <p role="status" className="greeting">
      {text}
    </p>
  ) : null;
}

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
