"use client";

import { useSyncExternalStore } from "react";

type Choice = "system" | "light" | "dark";

// Same storage the header toggle and the pre-paint script in layout.tsx use: a saved "light"/"dark" wins,
// and "system" means nothing saved, so the OS setting applies.
const current = (): Choice => {
  const t = document.documentElement.dataset.theme;
  return t === "light" || t === "dark" ? t : "system";
};

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function choose(choice: Choice) {
  if (choice === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = choice;
  try {
    if (choice === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", choice);
  } catch {
    // Storage can be blocked; the choice then lasts for this page view only.
  }
}

const OPTIONS: { value: Choice; label: string; hint: string }[] = [
  { value: "system", label: "System", hint: "Match your device" },
  { value: "light", label: "Light", hint: "Always light" },
  { value: "dark", label: "Dark", hint: "Always dark" },
];

export default function ThemePicker() {
  const selected = useSyncExternalStore<Choice | null>(subscribe, current, () => null);
  return (
    <fieldset className="choice-group">
      <legend>Theme</legend>
      {OPTIONS.map((o) => (
        <label key={o.value} className={`choice ${selected === o.value ? "selected" : ""}`}>
          <input type="radio" name="theme" value={o.value} checked={selected === o.value} onChange={() => choose(o.value)} />
          <span>
            <strong>{o.label}</strong>
            <span className="muted"> {o.hint}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
