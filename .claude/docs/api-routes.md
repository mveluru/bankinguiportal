# API routes (`app/api/`)

Thin: no business rules, because the backend decides everything. Three kinds:

- `auth/login` (POST): body `{ kind: "customer" | "staff", username, password }`. Calls `/bff/v1/portal/login` or
  `/bff/v1/staff/login`, puts the JWT in the httpOnly `bank_token` cookie and the display profile in `bank_profile`, and
  returns only the profile plus `sessionExpires`. The backend's 401 / 403 / 423 messages pass through unchanged.
- `auth/logout` (POST) clears both cookies (tokens are stateless, so there is nothing to revoke). `auth/me` (GET) returns the
  profile, or 401 if the token is missing or expired.
- `portal/[...path]` and `staff/[...path]` (GET/POST/PUT/PATCH): `lib/bff-proxy.ts` forwards to
  `/bff/v1/portal/*` or `/bff/v1/staff/*` with the Bearer token and `X-Customer-Id`. Rules it enforces: refuses `.` / `..`
  segments, refuses `login` (so a token never reaches a response body), refuses cross-site `Origin`s, passes status and
  body through untouched, clears the cookies on a 401 and after a successful `PUT .../password` (which revokes every
  earlier token, the caller's included).

The real access control is the backend's (`401` no/invalid token, `403` wrong token type or missing privilege, ownership
checks for customers). Handlers here must not try to decide permissions.
