"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import Greeting from "@/components/Greeting";
import LocationCard from "@/components/LocationCard";
import { Loading } from "@/components/StateBlock";
import { accountHref, titleCase } from "@/lib/format";

/** Staff dashboard: who you are, what your role allows, your branch, and a lookup to any account. */
export default function StaffHomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [lookup, setLookup] = useState("");

  if (!user) return <Loading />;

  return (
    <>
      <Greeting />
      <h1 className="center">Brite Banking Dashboard</h1>
      <p className="muted">
        {user.employeeNumber} · {user.role && titleCase(user.role)}
      </p>

      {user.privileges?.includes("VIEW_ACCOUNT") && (
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            if (lookup.trim()) router.push(accountHref("staff", lookup.trim()));
          }}
        >
          <label>
            Go to account number
            <input value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="CH-0000088291" />
          </label>
          <button type="submit">View</button>
        </form>
      )}

      <h2>What your role allows</h2>
      <p>
        {user.privileges?.map((p) => (
          <span key={p} className="badge" style={{ marginRight: 6 }}>{titleCase(p)}</span>
        ))}
      </p>

      <h2>Your branch</h2>
      {user.branch ? (
        <div className="grid">
          <LocationCard loc={user.branch} />
        </div>
      ) : (
        <p className="muted">
          You are not assigned to one branch{user.privileges?.includes("DEPOSIT") ? ", so name the branch or ATM when you make a deposit or withdrawal" : ""}.
        </p>
      )}
    </>
  );
}
