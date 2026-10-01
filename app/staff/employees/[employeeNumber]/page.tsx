"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { can, useAuth } from "@/components/AuthProvider";
import { SetPasswordForm, SetStatusForm } from "@/components/CredentialAdmin";
import { ErrorMessage, Loading } from "@/components/StateBlock";
import { getEmployee, setEmployeeLoginStatus, setEmployeePassword } from "@/lib/api";
import { titleCase } from "@/lib/format";
import type { PortalEmployee } from "@/lib/types";

/** One employee card, plus (MANAGE_EMPLOYEES) their login status and password. */
export default function EmployeePage() {
  const { employeeNumber } = useParams<{ employeeNumber: string }>();
  const { user } = useAuth();
  const [employee, setEmployee] = useState<PortalEmployee | null>(null);
  const [error, setError] = useState<string | null>(null);
  const admin = can(user, "MANAGE_EMPLOYEES");

  useEffect(() => {
    let cancelled = false;
    getEmployee(employeeNumber)
      .then((e) => !cancelled && setEmployee(e))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [employeeNumber]);

  if (error) return <ErrorMessage message={error} />;
  if (!employee) return <Loading />;

  return (
    <>
      {admin && <Link href="/staff/employees" className="tap">← Employees</Link>}
      <h1>{employee.firstName} {employee.lastName}</h1>
      <p className="muted">
        {employee.employeeNumber} · {titleCase(employee.role)}
        {employee.jobTitle && ` · ${employee.jobTitle}`} · {titleCase(employee.status)}
        {employee.region && ` · ${employee.region}`}
        {employee.hireDate && ` · hired ${employee.hireDate}`}
      </p>
      <p>
        {employee.privileges.map((p) => (
          <span key={p} className="badge" style={{ marginRight: 6 }}>{titleCase(p)}</span>
        ))}
      </p>
      {admin && (
        <div className="stack wide">
          <SetStatusForm apply={(status, reason) => setEmployeeLoginStatus(employee.employeeNumber, status, reason)} />
          <SetPasswordForm apply={(password) => setEmployeePassword(employee.employeeNumber, password)} />
        </div>
      )}
    </>
  );
}
