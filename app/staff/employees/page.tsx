"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { can, useAuth } from "@/components/AuthProvider";
import { ErrorMessage, Loading } from "@/components/StateBlock";
import { listEmployees } from "@/lib/api";
import { titleCase } from "@/lib/format";
import type { EmployeeRole, Page, PortalEmployee } from "@/lib/types";

const ROLES: EmployeeRole[] = ["TELLER", "MANAGER", "AREA_MANAGER"];

/** User management: employee cards (MANAGE_EMPLOYEES), filtered by role and paged. */
export default function EmployeesPage() {
  const { user } = useAuth();
  const [role, setRole] = useState<EmployeeRole | "">("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Page<PortalEmployee> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const allowed = can(user, "MANAGE_EMPLOYEES");

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    listEmployees({ role, page })
      .then((d) => !cancelled && (setData(d), setError(null)))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [allowed, role, page]);

  if (!user) return <Loading />;
  if (!allowed) return <p className="error">Managing employees needs the Area Manager role.</p>;

  return (
    <>
      <h1>Employees</h1>
      <label style={{ maxWidth: 220 }}>
        Role
        <select value={role} onChange={(e) => (setRole(e.target.value as EmployeeRole | ""), setPage(0))}>
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{titleCase(r)}</option>
          ))}
        </select>
      </label>
      {error && <ErrorMessage message={error} />}
      {!data && !error && <Loading />}
      {data && (
        <>
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="compact">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Region</th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((e) => (
                  <tr key={e.employeeNumber}>
                    <td className="nowrap">
                      <Link href={`/staff/employees/${encodeURIComponent(e.employeeNumber)}`}>{e.employeeNumber}</Link>
                    </td>
                    <td>{e.firstName} {e.lastName}</td>
                    <td>{titleCase(e.role)}</td>
                    <td>{titleCase(e.status)}</td>
                    <td>{e.region ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.content.length === 0 && <p className="muted">No employees match.</p>}
          <div className="row" style={{ marginTop: 12, alignItems: "center" }}>
            <button type="button" className="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
            <span className="muted">Page {data.number + 1} of {Math.max(1, data.totalPages)} · {data.totalElements} employees</span>
            <button type="button" className="secondary" disabled={page + 1 >= data.totalPages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </>
      )}
    </>
  );
}
