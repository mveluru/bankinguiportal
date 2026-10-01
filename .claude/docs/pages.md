# Pages (`app/`)

Pages are server components unless a file starts with `"use client"`. Client pages handle forms and fetch data in
the browser; public content pages (`/terms`, `/privacy`, `/help`) render on the server.

| Route | Purpose |
|---|---|
| `layout.tsx` | Root layout: wraps everything in `AuthProvider`, renders `NavBar`, `SessionTimeout`, `IdleLogout`, `CookieNotice`, the footer, and a pre-paint script that applies the saved theme (avoids a flash). |
| `globals.css` | All styling (plain CSS, CSS variables for light/dark). Shared classes such as `card`, `badge`, `muted`, `error`. |
| `page.tsx` | Home: accounts plus branches/ATMs with a state filter. |
| `login/`, `login/verify/` | Password step, then the 2FA code step. |
| `forgot-password/`, `reset-password/` | Password reset (link is printed to the dev console; no email service). |
| `accounts/[accountNumber]/` | Overview, plus `deposit`, `withdraw`, `statement`, `close`, `suspend` (suspend; edit end/notes and reactivate are admin-only, UI-level). Closed and suspended accounts are read-only for regular users. `accounts/open/` opens a new account. |
| `settings/` | Hub (theme, activity window, notification categories) with `profile`, `password`, `two-factor`, `activity`. |
| `notifications/` | In-app notifications. |
| `admin/users/` | Admin user management (admins only). |
| `help/`, `terms/`, `privacy/` | Public content pages. |
