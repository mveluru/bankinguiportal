"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Faq } from "@/lib/faq";

/** Searchable FAQ. Native <details> gives keyboard and screen-reader behaviour for free. */
export default function HelpCenter({ faqs, categories }: { faqs: Faq[]; categories: string[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const matches = useMemo(
    () =>
      q
        ? faqs.filter((f) => [f.question, ...f.answer, f.note ?? ""].some((text) => text.toLowerCase().includes(q)))
        : faqs,
    [faqs, q],
  );

  // Deep links such as /help#locked-out open that answer and scroll to it.
  useEffect(() => {
    const openFromHash = () => {
      const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (el instanceof HTMLDetailsElement) {
        el.open = true;
        el.scrollIntoView({ block: "start" });
      }
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  return (
    <>
      <h1>Help &amp; FAQ</h1>
      <p className="muted">Answers to common questions about signing in, your accounts and your settings.</p>

      <div className="help-search">
        <label>
          Search help
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="For example: password, locked, statement"
          />
        </label>
        <p className="muted" role="status" aria-live="polite" style={{ margin: "6px 0 0" }}>
          {q ? `${matches.length} result${matches.length === 1 ? "" : "s"} for “${query.trim()}”` : `${faqs.length} questions`}
        </p>
      </div>

      {matches.length === 0 && (
        <p>
          Nothing matched. Try different words, or see <a href="#contact-support" onClick={() => setQuery("")}>how to contact support</a>.
        </p>
      )}

      {categories.map((category) => {
        const items = matches.filter((f) => f.category === category);
        if (items.length === 0) return null;
        return (
          <section key={category} aria-labelledby={`cat-${category}`}>
            <h2 id={`cat-${category}`}>{category}</h2>
            {items.map((f) => (
              <details key={f.id} id={f.id} className="faq" open={q ? true : undefined}>
                <summary>{f.question}</summary>
                <div className="faq-body">
                  {f.answer.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                  {f.note && <p className="muted">{f.note}</p>}
                  {f.links && (
                    <p className="faq-links">
                      {f.links.map((l) =>
                        l.href.startsWith("mailto:") ? (
                          <a key={l.href} href={l.href} className="tap">
                            {l.label}
                          </a>
                        ) : (
                          <Link key={l.href} href={l.href} className="tap">
                            {l.label}
                          </Link>
                        ),
                      )}
                    </p>
                  )}
                </div>
              </details>
            ))}
          </section>
        );
      })}
    </>
  );
}
