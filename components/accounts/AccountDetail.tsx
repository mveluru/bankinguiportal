"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { can, useAuth } from "@/components/AuthProvider";
import { accountsApi } from "@/lib/api";
import { accountHref, accountLabel, formatMoney, formatSuspendedUntil, titleCase } from "@/lib/format";
import type { AccountOverviewResponse, PortalKind } from "@/lib/types";
import { ErrorMessage, Loading } from "@/components/StateBlock";

/**
 * One account: balance, status and recent activity. Customers see their own accounts and can deposit, withdraw, close and
 * get statements. Staff see any account and get the actions their role allows; suspending and reactivating are staff-only.
 */
export default function AccountDetail({ kind }: { kind: PortalKind }) {
  const { accountNumber } = useParams<{ accountNumber: string }>();
  const { user } = useAuth();
  const staff = kind === "staff";
  const allowed = (privilege: Parameters<typeof can>[1]) => !staff || can(user, privilege);
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AccountOverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    accountsApi(kind)
      .getOverview(accountNumber, days)
      .then((d) => !cancelled && (setData(d), setError(null)))
      .catch((e: Error) => !cancelled && (setData(null), setError(e.message)));
    return () => {
      cancelled = true;
    };
  }, [accountNumber, days, kind]);

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
        {data.maskedPhoneNumber && ` · phone ${data.maskedPhoneNumber}`}
      </p>
      {data.suspended && (
        <p className="error">
          This account is suspended {formatSuspendedUntil(data.suspendedUntil)}. Deposits and withdrawals are blocked
          until {staff ? "it is reactivated." : "the bank reactivates it. The account is read-only."}
        </p>
      )}
      <div className="balance">{formatMoney(data.balance)}</div>
      {!staff && (
        <div className="row" style={{ marginTop: 12 }}>
          <Link href={accountHref(kind, data.accountNumber, "/statement")} className="btn">Statement</Link>
        </div>
      )}
      {data.accountStatus === "CLOSED" && (
        <p className="error">This account is closed and read-only. It cannot be reopened.</p>
      )}
      {staff && data.accountStatus !== "CLOSED" && (
        <div className="row" style={{ marginTop: 12 }}>
          {data.suspended ? (
            <>
              {can(user, "UPDATE_SUSPENSION") && (
                <Link href={accountHref(kind, data.accountNumber, "/suspend")} className="btn">Manage suspension</Link>
              )}
              {can(user, "REACTIVATE_ACCOUNT") && (
                <Link href={accountHref(kind, data.accountNumber, "/reactivate")} className="btn">Reactivate account</Link>
              )}
            </>
          ) : (
            can(user, "SUSPEND_ACCOUNT") && (
              <Link href={accountHref(kind, data.accountNumber, "/suspend")} className="btn">Suspend account</Link>
            )
          )}
        </div>
      )}
      {data.accountStatus === "ACTIVE" && ["CHECKING", "SAVINGS"].includes(data.accountType) && (
        <div className="row" style={{ marginTop: 12 }}>
          {allowed("DEPOSIT") && <Link href={accountHref(kind, data.accountNumber, "/deposit")} className="btn">Deposit</Link>}
          {allowed("WITHDRAW") && <Link href={accountHref(kind, data.accountNumber, "/withdraw")} className="btn">Withdraw</Link>}
          {allowed("CLOSE_ACCOUNT") && (
            <Link href={accountHref(kind, data.accountNumber, "/close")} className="btn danger">Close account</Link>
          )}
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
        <div className="table-wrap" style={{ marginTop: 12 }}>
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
            {data.recentActivity.map((t, i) => (
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
  );
}
