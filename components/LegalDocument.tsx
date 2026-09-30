import Link from "next/link";
import type { LegalDoc } from "@/lib/legal";

/** Renders a legal document: title, date, an on-page contents list, and numbered sections. Server component. */
export default function LegalDocument({ doc, otherDoc }: { doc: LegalDoc; otherDoc: { href: string; label: string } }) {
  return (
    <article className="legal">
      <h1>{doc.title}</h1>
      <p className="muted">
        Last updated {doc.updated} · <Link href={otherDoc.href}>{otherDoc.label}</Link>
      </p>

      {doc.templateNotice && (
        <p className="template-notice" role="note">
          <strong>Template notice.</strong> This document describes how this portal works and uses standard wording. It
          isn&apos;t legal advice: have it reviewed by a lawyer before relying on it.
        </p>
      )}

      <p>{doc.intro}</p>

      <nav aria-label="On this page" className="toc">
        {doc.sections.map((s, i) => (
          <a key={s.id} href={`#${s.id}`} className="tap">
            {i + 1}. {s.title}
          </a>
        ))}
      </nav>

      {doc.sections.map((s, i) => (
        <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`}>
          <h2 id={`${s.id}-h`}>
            {i + 1}. {s.title}
          </h2>
          {s.blocks.map((b, j) => {
            if ("p" in b) return <p key={j}>{b.p}</p>;
            if ("ul" in b) {
              return (
                <ul key={j}>
                  {b.ul.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              );
            }
            return (
              <div key={j} className="table-wrap">
                <table className="stack-sm legal-table">
                  <thead>
                    <tr>
                      {b.table.head.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.table.rows.map((row) => (
                      <tr key={row[0]}>
                        {row.map((cell, k) => (
                          <td key={k} data-label={b.table.head[k]}>
                            {k === 0 ? <strong>{cell}</strong> : cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
          {s.links && (
            <p className="faq-links">
              {s.links.map((l) => (
                <Link key={l.href} href={l.href} className="tap">
                  {l.label}
                </Link>
              ))}
            </p>
          )}
        </section>
      ))}
    </article>
  );
}
