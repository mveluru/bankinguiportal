"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { RATE_LIMIT_EVENT } from "@/lib/rate-limit";

/** Pops up, on any screen, when the backend says the daily request limit is used up (HTTP 429). Mounted once in the layout. */
export default function RateLimitNotice() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const onLimit = (e: Event) => {
      setMessage(String((e as CustomEvent).detail || "Daily request limit exceeded."));
      if (dialog.current && !dialog.current.open) dialog.current.showModal();
    };
    window.addEventListener(RATE_LIMIT_EVENT, onLimit);
    return () => window.removeEventListener(RATE_LIMIT_EVENT, onLimit);
  }, []);

  return (
    <dialog ref={dialog} className="confirm" aria-labelledby="rate-limit-title" onClose={() => setMessage(null)}>
      <h2 id="rate-limit-title" style={{ marginTop: 0 }}>Daily request limit reached</h2>
      <p role="alert">{message}</p>
      <p className="muted">
        You can use the portal again when the daily limit resets.{" "}
        <Link href="/help#request-limit" onClick={() => dialog.current?.close()}>Read more in Help</Link>.
      </p>
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button type="button" onClick={() => dialog.current?.close()}>OK</button>
      </div>
    </dialog>
  );
}
