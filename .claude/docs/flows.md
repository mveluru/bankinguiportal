# Key flows

**Sign-in refused.** The backend refuses a customer with no ACTIVE account (SUSPENDED, CLOSED, INACTIVE, DORMANT) with a 403 and a message naming the status; `/api/auth/login` passes it on and the sign-in form shows it, with no cookies set.

**Sign-in.** `/login` (or `/staff/login`) → `POST /api/auth/login` → backend login → JWT into the httpOnly `bank_token`
cookie, profile into `bank_profile` → full page load to `/` (or `/staff`). Wrong password 401, locked 423, login not
active 403: the backend's message is shown as is.

**Every page request.** `proxy.ts` reads the token cookie's type and expiry (no signature check). Customers are kept on
customer pages and employees on `/staff/*`; everyone else goes to the matching sign-in page with `?next=`.

**Every backend call.** Component → `lib/api.ts` → `/api/portal/*` or `/api/staff/*` → `lib/bff-proxy.ts` → backend with
`Authorization: Bearer`. The backend re-checks the token and the login status on each call, so suspending a login or
changing a password takes effect at once; the next call returns 401/403 and the page shows the message.

**Session end.** The token lives 30 minutes (backend setting, no refresh). `SessionTimeout` warns before the token's `exp` and signs
out at it; `IdleLogout` signs out after inactivity. Both end in `hardNavigate` to the sign-in page with `?expired=1`.

**Changing a password.** `PUT .../password` revokes every earlier token, so the proxy clears the cookies on success and the page
tells the user to sign in again.

**Forgot password.** `POST .../password-reset/questions` returns the user's three questions (a decoy set for unknown users), then
`POST .../password-reset` with the answers and a new 8-digit password. It never lifts a lock or suspension.

**Staff actions.** The UI hides what the role's privileges (from the sign-in response) lack, and the backend refuses it again (403).
Suspend and reactivate are separate pages for managers and above; a teller who opens them is redirected to `/staff`. Area managers have no branch, so deposits and withdrawals ask for a branch/ATM id (`?locationId=`).
