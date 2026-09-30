"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const dark = () => window.matchMedia("(prefers-color-scheme: dark)");

/** The theme in effect: an explicit data-theme override, else the OS preference. */
const current = (): Theme => {
  const forced = document.documentElement.dataset.theme;
  return forced === "light" || forced === "dark" ? forced : dark().matches ? "dark" : "light";
};

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  dark().addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    dark().removeEventListener("change", onChange);
  };
}

export default function ThemeToggle() {
  // null on the server / first render, so nothing mismatches during hydration.
  const theme = useSyncExternalStore<Theme | null>(subscribe, current, () => null);
  if (!theme) return null;

  const next: Theme = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className="icon"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      onClick={() => {
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem("theme", next);
        } catch {
          // Storage can be blocked; the choice then lasts for this page view only.
        }
      }}
    >
      {theme === "dark" ? "☀ Light" : "☾ Dark"}
    </button>
  );
}
