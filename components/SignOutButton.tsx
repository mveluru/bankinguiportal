"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

/** Sign out, with a confirm dialog. Lives in the top bar, next to the theme switch. */
export default function SignOutButton() {
  const { user, logout } = useAuth();
  const dialog = useRef<HTMLDialogElement>(null);
  const [signingOut, setSigningOut] = useState(false);

  if (!user) return null;

  async function confirmSignOut() {
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
      dialog.current?.close();
    }
  }

  return (
    <>
      {/* Same look as the Dark/Light button next to it (button.icon), with blue text. */}
      <button type="button" className="icon signout" onClick={() => dialog.current?.showModal()}>
        Sign out
      </button>
      <dialog ref={dialog} className="confirm" aria-labelledby="signout-title">
        <h2 id="signout-title" style={{ marginTop: 0 }}>Sign out?</h2>
        <p className="muted">You will need to sign in again to {user.kind === "staff" ? "continue" : "view your accounts"}.</p>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="secondary" onClick={() => dialog.current?.close()} disabled={signingOut}>
            Cancel
          </button>
          <button type="button" onClick={confirmSignOut} disabled={signingOut}>
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </dialog>
    </>
  );
}
