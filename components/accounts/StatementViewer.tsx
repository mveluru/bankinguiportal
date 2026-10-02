"use client";

import { useState } from "react";
import { getStatement } from "@/lib/api";
import { formatMoney, titleCase } from "@/lib/format";
import type { BankStatement } from "@/lib/types";
import { ErrorMessage } from "@/components/StateBlock";

const iso = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

/** The statement as CSV (one row per transaction), for a spreadsheet. */
function toCsv(st: BankStatement) {
  const rows = [["Date", "Type", "Deposit type", "Amount", "Balance after"]];
  for (const t of st.transactions) {
    rows.push([t.transactionDate, titleCase(t.transactionType), t.depositType ? titleCase(t.depositType) : "", String(t.transactionType === "WITHDRAWAL" ? -t.amount : t.amount), String(t.balanceAfter)]);
  }
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}

/**
 * Pick a date range and generate a statement for one account, then print it or download it as CSV. Side effect: the banking
 * service also emails/texts a copy, so it only runs when the user presses Generate.
 */
export default function StatementViewer({ accountNumber }: { accountNumber: string }) {
  const today = new Date();
  // Start date defaults to 30 days back until they pick one.
  const [chosenBegin, setBegin] = useState<string | null>(null);
  const begin = chosenBegin ?? iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30));
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

  function download() {
    if (!statement) return;
    const url = URL.createObjectURL(new Blob([toCsv(statement)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `statement-${statement.accountNumber}-${statement.beginDate}-${statement.endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <p className="muted">{accountNumber} · the bank also emails/texts a copy when you generate a statement.</p>
      <form className="row no-print" onSubmit={onSubmit}>
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
            Statement {statement.accountNumber}: {statement.beginDate} – {statement.endDate}
          </h2>
          <div className="row no-print">
            <button type="button" onClick={() => window.print()}>Print</button>
            <button type="button" onClick={download}>Download CSV</button>
          </div>
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
