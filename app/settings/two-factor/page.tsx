"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ErrorMessage, Loading } from "@/components/StateBlock";

interface Status {
  enabled: boolean;
  recoveryCodesRemaining: number;
}
interface Setup {
  secret: string;
  qr: string;
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json" },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message ?? "Request failed.");
  return body;
}

const post = <T,>(url: string, data?: object) => call<T>(url, { method: "POST", body: JSON.stringify(data ?? {}) });

export default function TwoFactorPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      call<Status>("/api/auth/2fa/status")
        .then(setStatus)
        .catch((e: Error) => setError(e.message)),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const start = () => run(async () => setSetup(await post<Setup>("/api/auth/2fa/setup")));

  const confirm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code")).trim();
    return run(async () => {
      const { recoveryCodes } = await post<{ recoveryCodes: string[] }>("/api/auth/2fa/enable", { code });
      setSetup(null);
      setRecoveryCodes(recoveryCodes);
      await load();
    });
  };

  const disable = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    return run(async () => {
      await post("/api/auth/2fa/disable", { password: f.get("password"), code: f.get("code") });
      await load();
    });
  };

  if (!status) return error ? <ErrorMessage message={error} /> : <Loading />;

  return (
    <>
      <Link href="/settings/profile" className="tap">← Profile</Link>
      <h1>Two-factor authentication</h1>

      {recoveryCodes && (
        <div className="card" style={{ maxWidth: 480, marginBottom: 16 }}>
          <strong>Two-factor authentication is on.</strong>
          <p>
            Save these recovery codes somewhere safe. Each works once if you lose your authenticator app, and{" "}
            <strong>they won&apos;t be shown again</strong>.
          </p>
          <pre style={{ fontSize: "1.05rem" }}>{recoveryCodes.join("\n")}</pre>
          <div className="row">
            <button type="button" onClick={() => navigator.clipboard?.writeText(recoveryCodes.join("\n"))}>
              Copy codes
            </button>
            <button type="button" className="secondary" onClick={() => setRecoveryCodes(null)}>
              I&apos;ve saved them
            </button>
          </div>
        </div>
      )}

      {error && <ErrorMessage message={error} />}

      {!status.enabled && !setup && (
        <>
          <p>
            Add a second step to sign-in: after your password you will enter a 6-digit code from an authenticator app
            such as Google Authenticator, Authy or 1Password.
          </p>
          <button type="button" onClick={start} disabled={busy}>
            Set up two-factor authentication
          </button>
        </>
      )}

      {!status.enabled && setup && (
        <>
          <ol>
            <li>Scan this QR code with your authenticator app.</li>
            <li>Enter the 6-digit code it shows to finish.</li>
          </ol>
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL, nothing to optimise */}
          <img src={setup.qr} alt="QR code for your authenticator app" width={220} height={220} style={{ background: "#fff" }} />
          <p className="muted">
            Can&apos;t scan? Enter this key manually: <code>{setup.secret}</code>
          </p>
          <form className="stack" onSubmit={confirm}>
            <label>
              6-digit code
              <input name="code" required autoFocus inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="one-time-code" />
            </label>
            <div className="row">
              <button type="submit" disabled={busy}>
                Turn on
              </button>
              <button type="button" className="secondary" onClick={() => setSetup(null)} disabled={busy}>
                Cancel
              </button>
            </div>
          </form>
        </>
      )}

      {status.enabled && (
        <>
          <p role="status" className="deposit">
            Two-factor authentication is <strong>on</strong>. {status.recoveryCodesRemaining} recovery code
            {status.recoveryCodesRemaining === 1 ? "" : "s"} left.
          </p>
          <h2>Turn off</h2>
          <p className="muted">Requires your password and a current code (or a recovery code).</p>
          <form className="stack" onSubmit={disable}>
            <label>
              Password
              <input name="password" type="password" required autoComplete="current-password" />
            </label>
            <label>
              Authenticator or recovery code
              <input name="code" required autoComplete="one-time-code" />
            </label>
            <button type="submit" className="danger" disabled={busy}>
              Turn off two-factor authentication
            </button>
          </form>
        </>
      )}
    </>
  );
}
