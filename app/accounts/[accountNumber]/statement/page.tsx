"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { getStatement } from "@/lib/api";
import { formatMoney, titleCase } from "@/lib/format";
import type { BankStatement } from "@/lib/types";
import { ErrorMessage } from "@/components/StateBlock";

const iso = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export default function StatementPage() {
  const { accountNumber } = useParams<{ accountNumber: string }>();
  const today = new Date();
  const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
  const [begin, setBegin] = useState(iso(monthAgo));
  const [end, setEnd] = useState(iso(today));
  const [statement, setStatement] = useState<BankStatement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      setStatement(await getStatement(accountNumber, begin, end));
    } catch (err) {
      setStatement(null);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const totals = statement?.transactions.reduce(
    (t, x) => (x.transactionType === "DEPOSIT" ? { ...t, in: t.in + x.amount } : { ...t, out: t.out + x.amount }),
    { in: 0, out: 0 },
  );

  return (
    <>
      <Link href={`/accounts/${accountNumber}`} className="tap">← Back to account</Link>
      <h1>Statement</h1>
      <p className="muted">{accountNumber} · the bank also emails/texts a copy when you generate a statement.</p>
      <form className="row" onSubmit={onSubmit}>
        <label>
          From
          <input type="date" value={begin} max={end} required onChange={(e) => setBegin(e.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={end} min={begin} max={iso(today)} required onChange={(e) => setEnd(e.target.value)} />
        </label>
        <button type="submit" disabled={loading}>{loading ? "Generating…" : "Generate statement"}</button>
      </form>
      {error && <ErrorMessage message={error} />}

      {statement && totals && (
        <>
          <h2>
            {statement.beginDate} – {statement.endDate}
          </h2>
          <p>
            Deposits <strong className="deposit">{formatMoney(totals.in)}</strong> · Withdrawals{" "}
            <strong className="withdrawal">{formatMoney(totals.out)}</strong> · {statement.transactions.length}{" "}
            transactions
          </p>
          {statement.transactions.length === 0 ? (
            <p className="muted">No transactions in this period.</p>
          ) : (
            <div className="table-wrap">
            <table className="compact">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th className="num">Amount</th>
                  <th className="num">Balance</th>
                </tr>
              </thead>
              <tbody>
                {statement.transactions.map((t, i) => (
                  <tr key={i}>
                    <td className="nowrap">{t.transactionDate}</td>
                    <td>
                      {titleCase(t.transactionType)}
                      {t.depositType && <span className="muted"> ({titleCase(t.depositType)})</span>}
                    </td>
                    <td className={`num ${t.transactionType.toLowerCase()}`}>
                      {t.transactionType === "WITHDRAWAL" ? "−" : "+"}
                      {formatMoney(t.amount)}
                    </td>
                    <td className="num">{formatMoney(t.balanceAfter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
