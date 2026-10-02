"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import StatementViewer from "@/components/accounts/StatementViewer";

export default function StatementPage() {
  const { accountNumber } = useParams<{ accountNumber: string }>();
  return (
    <>
      <Link href={`/accounts/${accountNumber}`} className="tap no-print">← Back to account</Link>
      <h1>Statement</h1>
      <StatementViewer accountNumber={accountNumber} />
    </>
  );
}
