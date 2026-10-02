"use client";

import { useState } from "react";
import { can, useAuth } from "@/components/AuthProvider";
import CustomerRateLimitPanel from "@/components/CustomerRateLimitPanel";
import { CreateLoginForm, SetPasswordForm, SetStatusForm } from "@/components/CredentialAdmin";
import { Loading } from "@/components/StateBlock";
import { createCustomerLogin, setCustomerLoginStatus, setCustomerPassword } from "@/lib/api";

/**
 * Customer logins (MANAGE_CUSTOMER_LOGINS, managers and up): create a customer's login, set its status, set its password.
 * The backend has no customer search, so you work from the customer id (shown when the account was opened).
 */
export default function CustomerLoginsPage() {
  const { user } = useAuth();
  const [id, setId] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);

  if (!user) return <Loading />;
  if (!can(user, "MANAGE_CUSTOMER_LOGINS")) return <p className="error">Managing customer logins needs the Manager role or above.</p>;

  return (
    <>
      <h1>Customer logins</h1>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          setCustomerId(id.trim() || null);
        }}
      >
        <label>
          Customer id
          <input value={id} onChange={(e) => setId(e.target.value)} inputMode="numeric" pattern="\d+" required placeholder="11" />
        </label>
        <button type="submit">Select</button>
      </form>
      {customerId && (
        <div className="stack wide" key={customerId}>
          <h2 style={{ marginBottom: 0 }}>Customer {customerId}</h2>
          <CustomerRateLimitPanel customerId={customerId} />
          <CreateLoginForm apply={(username, password) => createCustomerLogin(customerId, username, password)} />
          <SetStatusForm apply={(status, reason) => setCustomerLoginStatus(customerId, status, reason)} />
          <SetPasswordForm apply={(password) => setCustomerPassword(customerId, password)} />
        </div>
      )}
    </>
  );
}
