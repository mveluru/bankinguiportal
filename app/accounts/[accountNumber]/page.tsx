"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getOverview } from "@/lib/api";
import { accountLabel, formatMoney, titleCase } from "@/lib/format";
import type { AccountOverviewResponse } from "@/lib/types";
import { ErrorMessage, Loading } from "@/components/StateBlock";

export default function AccountPage() {
  const { accountNumber } = useParams<{ accountNumber: string }>();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AccountOverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getOverview(accountNumber, days)
      .then((d) => !cancelled && (setData(d), setError(null)))
      .catch((e: Error) => !cancelled && (setData(null), setError(e.message)));
    return () => {
      cancelled = true;
    };
  }, [accountNumber, days]);

  if (error) return <ErrorMessage message={error} />;
  if (!data) return <Loading />;

  return (
    <>
      <h1>
        {accountLabel(data.accountType)} <span className="badge">{titleCase(data.accountStatus)}</span>
      </h1>
      <p className="muted">
        {data.accountNumber} · {data.firstName} {data.lastName} · opened {data.createdDate}
        {data.closedDate && ` · closed ${data.closedDate}`}
      </p>
      <div className="balance">{formatMoney(data.balance)}</div>
      <div className="row" style={{ marginTop: 12 }}>
        <Link href={`/accounts/${data.accountNumber}/statement`} className="btn">Statement</Link>
      </div>
      {data.accountStatus === "ACTIVE" && ["CHECKING", "SAVINGS"].includes(data.accountType) && (
        <div className="row" style={{ marginTop: 12 }}>
          <Link href={`/accounts/${data.accountNumber}/deposit`} className="btn">Deposit</Link>
          <Link href={`/accounts/${data.accountNumber}/withdraw`} className="btn">Withdraw</Link>
        </div>
      )}

      <h2>Recent activity</h2>
      <label style={{ maxWidth: 200 }}>
        Window
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {[7, 30, 60, 90].map((d) => (
            <option key={d} value={d}>
              Last {d} days
            </option>
          ))}
        </select>
      </label>
      {data.recentActivity.length === 0 ? (
        <p className="muted">No activity in the last {data.activityDays} days.</p>
      ) : (
        <table style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th className="num">Amount</th>
              <th className="num">Balance</th>
            </tr>
          </thead>
          <tbody>
            {data.recentActivity.map((t, i) => (
              <tr key={i}>
                <td>{t.transactionDate}</td>
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
      )}
    </>
  );
}
