"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

const WARNING_MS = (Number(process.env.NEXT_PUBLIC_SESSION_WARNING_SECONDS) || 120) * 1000;

const clock = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

/**
 * Warns shortly before the backend token expires, with a countdown, and signs the user out when the time runs out.
 * The backend has no refresh call, so the only way to carry on past the expiry is to sign in again. Compares against the
 * absolute expiry time (not a counter), so it stays correct after the tab was asleep or throttled in the background.
 */
export default function SessionTimeout() {
  const { user, expireSession, logout } = useAuth();
  const dialog = useRef<HTMLDialogElement>(null);
  const [now, setNow] = useState(() => Date.now());
  const expiring = useRef(false);

  const expires = user?.sessionExpires;

  useEffect(() => {
    if (!expires) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expires]);

  const remaining = expires ? expires - now : Infinity;
  const warn = remaining <= WARNING_MS;
  const expired = remaining <= 0;

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (warn && !expired && !d.open) d.showModal();
    if ((!warn || expired) && d.open) d.close();
  }, [warn, expired]);

  useEffect(() => {
    if (expired && !expiring.current) {
      expiring.current = true;
      expireSession().finally(() => (expiring.current = false));
    }
  }, [expired, expireSession]);

  return (
    <dialog
      ref={dialog}
      className="confirm"
      aria-labelledby="timeout-title"
      onCancel={(e) => e.preventDefault() /* Escape shouldn't silently dismiss the warning */}
    >
      <h2 id="timeout-title" style={{ marginTop: 0 }}>Your session is about to end</h2>
      <p>
        You will be signed out in <strong role="timer">{clock(remaining)}</strong>. Finish what you are doing, then sign in
        again to continue.
      </p>
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button type="button" onClick={() => logout()}>
          Sign out now
        </button>
      </div>
    </dialog>
  );
}
