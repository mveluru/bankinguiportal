"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ErrorMessage, Loading } from "@/components/StateBlock";
import { credentialsApi } from "@/lib/api";
import type { PortalKind, SecurityQuestionView } from "@/lib/types";

const COUNT = 3;

/** Choose and answer three security questions (needed to reset a forgotten password). Needs the current password. */
export default function SecurityQuestions({ kind }: { kind: PortalKind }) {
  const api = credentialsApi(kind);
  const [catalog, setCatalog] = useState<SecurityQuestionView[] | null>(null);
  const [chosen, setChosen] = useState<string[]>(Array(COUNT).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    credentialsApi(kind)
      .questionCatalog()
      .then(setCatalog)
      .catch((e: Error) => setError(e.message));
  }, [kind]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    if (new Set(chosen).size !== COUNT) {
      setError("Choose three different questions.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSaved(false);
    try {
      await api.setSecurityQuestions(
        String(f.get("currentPassword")),
        chosen.map((question, i) => ({ question, answer: String(f.get(`answer${i}`)).trim() })),
      );
      form.reset();
      setChosen(Array(COUNT).fill(""));
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Link href={kind === "staff" ? "/staff/settings" : "/settings"} className="tap">← Settings</Link>
      <h1>Security questions</h1>
      <p className="muted">You answer these to reset a forgotten password. Saving replaces any questions you chose before.</p>
      {saved && <p role="status" className="deposit">Security questions saved.</p>}
      {!catalog ? (
        error ? <ErrorMessage message={error} /> : <Loading />
      ) : (
        <form className="stack" onSubmit={onSubmit}>
          {chosen.map((value, i) => (
            <fieldset key={i} className="stack">
              <label>
                Question {i + 1}
                <select required value={value} onChange={(e) => setChosen(chosen.map((c, j) => (j === i ? e.target.value : c)))}>
                  <option value="" disabled>Choose a question</option>
                  {catalog.map((q) => (
                    <option key={q.question} value={q.question} disabled={chosen.includes(q.question) && value !== q.question}>
                      {q.text}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Answer
                <input name={`answer${i}`} required autoComplete="off" />
              </label>
            </fieldset>
          ))}
          <label>
            Current password
            <input name="currentPassword" type="password" required autoComplete="current-password" />
          </label>
          {error && <ErrorMessage message={error} />}
          <button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save security questions"}
          </button>
        </form>
      )}
    </>
  );
}
