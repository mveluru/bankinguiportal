"use client";

import Link from "next/link";
import { useState } from "react";
import { ErrorMessage } from "@/components/StateBlock";
import { credentialsApi } from "@/lib/api";
import { PASSWORD_HINT, PASSWORD_PATTERN } from "@/lib/passwords";
import type { PortalKind, SecurityQuestionView } from "@/lib/types";

/**
 * Forgotten password, in the backend's two steps: ask which three security questions the user chose, then send the
 * answers with the new password. The backend locks the reset after too many wrong answers.
 */
export default function ForgotPassword({ kind }: { kind: PortalKind }) {
  const api = credentialsApi(kind);
  const signIn = kind === "staff" ? "/staff/login" : "/login";
  const [username, setUsername] = useState("");
  const [questions, setQuestions] = useState<SecurityQuestionView[] | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function run(action: () => Promise<void>) {
    setSubmitting(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const askQuestions = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("username")).trim();
    return run(async () => {
      setQuestions(await api.resetQuestions(name));
      setUsername(name);
    });
  };

  const reset = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    return run(async () => {
      const answers = (questions ?? []).map((q) => ({ question: q.question, answer: String(f.get(q.question)).trim() }));
      await api.resetPassword(username, answers, String(f.get("newPassword")));
      setDone(true);
    });
  };

  return (
    <>
      <h1>Forgot password</h1>
      {done ? (
        <p role="status">
          Password reset. <Link href={signIn}>Sign in</Link> with the new password.
        </p>
      ) : !questions ? (
        <form className="stack" onSubmit={askQuestions}>
          <p className="muted">Enter your username to get the security questions you chose.</p>
          <label>
            Username
            <input name="username" required autoComplete="username" autoFocus />
          </label>
          {error && <ErrorMessage message={error} />}
          <button type="submit" disabled={submitting}>
            {submitting ? "Checking…" : "Continue"}
          </button>
        </form>
      ) : (
        <form className="stack" onSubmit={reset}>
          {questions.map((q) => (
            <label key={q.question}>
              {q.text}
              <input name={q.question} required autoComplete="off" />
            </label>
          ))}
          <label>
            New password ({PASSWORD_HINT})
            <input name="newPassword" type="password" required pattern={PASSWORD_PATTERN} inputMode="numeric" autoComplete="new-password" />
          </label>
          {error && <ErrorMessage message={error} />}
          <button type="submit" disabled={submitting}>
            {submitting ? "Resetting…" : "Reset password"}
          </button>
        </form>
      )}
      <p>
        <Link href={signIn} className="tap">← Back to sign in</Link>
      </p>
    </>
  );
}
