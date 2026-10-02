# Pages (`app/`)

Pages are server components unless a file starts with `"use client"`. Client pages handle forms and fetch data in
the browser (through `lib/api.ts`); public content pages (`/terms`, `/privacy`, `/help`) render on the server.

Most account and credential screens are shared components taking a `kind` (`customer` or `staff`); the `page.tsx` files are
one-line wrappers, so a change to the component applies to both portals.

| Route | Purpose |
|---|---|
| `layout.tsx` | Root layout: `AuthProvider`, `NavBar`, `SessionTimeout`, `IdleLogout`, `CookieNotice`, footer, pre-paint theme script. |
| `globals.css` | All styling (plain CSS, CSS variables for light/dark). |
| `page.tsx` | Customer home: their accounts plus branches/ATMs with a state filter. |
| `login/`, `forgot-password/` | Customer sign-in; forgot password (username, three security answers, new 8-digit password). |
| `statements/` | Customer statements: pick an account, then a date range; print or download CSV. |
| `accounts/[accountNumber]/` | Customer account overview, `deposit`, `withdraw`, `statement`, `close`. Suspended and closed accounts are read-only. |
| `settings/` | Hub (theme), `password`, `security-questions`. |
| `staff/login/`, `staff/forgot-password/` | Employee sign-in and password reset. |
| `staff/page.tsx` | Staff dashboard: role, privileges, branch, account lookup. |
| `staff/accounts/[accountNumber]/` | Any account for staff: overview, `deposit`, `withdraw`, `suspend` (suspend, or change end/notes), `reactivate`, `close`. `suspend` and `reactivate` are for managers and area managers; tellers are redirected to `/staff`. `staff/accounts/open/` opens an account for a customer. |
| `staff/customers/` | Customer logins by customer id: create, set status, set password (MANAGE_CUSTOMER_LOGINS). |
| `staff/employees/`, `staff/employees/[employeeNumber]/` | User management: paged employee list by role; one card with login status and password (MANAGE_EMPLOYEES). |
| `staff/settings/` | Staff settings hub, `password`, `security-questions`. |
| `help/`, `terms/`, `privacy/` | Public content pages. |
