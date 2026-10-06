# Brite Banking UI Portal: Requirements

## Overview

Brite Banking UI Portal is a Next.js-based web application serving as a customer-facing and employee-facing interface to the banking backend service. It provides secure access to banking operations with strict permission controls, responsive design, and comprehensive audit trails handled by the backend.

## Functional Requirements

### Authentication & Authorization

**Sign-in**
- Users sign in with username and 8-digit numeric password
- Two separate sign-in pages: `/login` (customers) and `/staff/login` (employees)
- Backend validates credentials and issues JWT tokens (30-minute lifetime)
- Session stored in httpOnly cookie (`bank_token`)
- Sign-in is refused for customers with no ACTIVE account (status: SUSPENDED, CLOSED, INACTIVE, DORMANT)
- Forgot password flow uses pre-saved security questions (3 questions required)

**Session Management**
- Session warning appears 120 seconds before JWT expiry (configurable: `NEXT_PUBLIC_SESSION_WARNING_SECONDS`)
- Auto sign-out after 120 seconds of inactivity on any tab (configurable: `NEXT_PUBLIC_IDLE_TIMEOUT_SECONDS`)
- Changing password signs out all sessions immediately
- Sign-out clears httpOnly cookies and redirects to sign-in page

**Role-based Access Control (RBAC)**
- Customer role: access own accounts and settings
- Staff roles: Teller, Manager, Area Manager (with escalating privileges)
- Privileges determined by backend; UI hides unavailable actions but backend enforces
- Customer cannot access `/staff` pages; employee cannot access customer-only pages

### Customer Portal

**Dashboard** (`/`)
- Welcome banner on first login (name, account, customer-since year)
- "Go to account number" box (pre-filled with own account, read-only)
- Accounts list (all owned by customer)
- Branches and ATMs with state filter (online/offline/maintenance)

**Account Overview** (`/accounts/[accountNumber]`)
- Account balance and details
- Last N days of activity (configurable, default 30 days)
- Holder address (from backend, read-only)

**Deposit / Withdraw** (`/accounts/[accountNumber]/deposit`, `/withdraw`)
- Form fields: amount, description, customer address (pre-filled, editable)
- No verification checkbox required for customers
- Calls backend to execute transaction

**Statements** (`/accounts/[accountNumber]/statement`, `/statements`)
- Date range picker
- Download as CSV or print
- Backend emails/SMSes copy to customer

**Close Account** (`/accounts/[accountNumber]/close`)
- Typed confirmation (must type account number)
- Yes/No dialog (irreversible)
- Only customers can close their own accounts

**Settings** (`/settings`)
- **Appearance:** System/Light/Dark theme (persisted in `localStorage`)
- **Change Password:** `/settings/password` (must provide current password, new 8-digit password)
- **Security Questions:** `/settings/security-questions` (choose and answer 3 questions)

### Staff Portal

**Dashboard** (`/staff`)
- Welcome banner on first login (name, employee ID, role, branch if assigned)
- Role card showing privileges
- "Go to account number" box (any account lookup)

**Account Management** (based on role privileges)
- **View Account** (`/staff/accounts/[accountNumber]`): View balance, details, activity
- **Deposit / Withdraw** (`/staff/accounts/[accountNumber]/deposit`, `/withdraw`):
  - Form pre-filled with customer's address (from backend)
  - **Required:** Checkbox "I verified the customer's address" (must be checked on BOTH deposit and withdraw)
  - Area manager can specify branch location
  - Calls backend to execute

**Account Suspension** (Managers/Area Managers only)
- **Suspend Account** (`/staff/accounts/[accountNumber]/suspend`): Set suspension reason, duration, notes
- **Update Suspension** (`/staff/accounts/[accountNumber]/suspend`): Modify existing suspension
- **Reactivate Account** (`/staff/accounts/[accountNumber]/reactivate`): Restore suspended account

**Account Opening** (OPEN_ACCOUNT privilege)
- `/staff/accounts/open`: Create new account for customer
- Calls backend endpoint

**Customer Management** (MANAGE_CUSTOMER_LOGINS privilege)
- `/staff/customers`: List customers, manage logins, set passwords, manage daily request limits
- View customer's daily login count and requests
- Raise or lower individual customer's daily request limit
- Show daily limit origin (custom or default)

**Employee Management** (MANAGE_EMPLOYEES privilege)
- `/staff/employees`: List employees by role (Teller, Manager, Area Manager)
- Pagination and search
- `/staff/employees/[employeeNumber]`: View employee details, manage login status, password, daily request limits

**Settings** (shared with customers)
- `/staff/settings`: Change password, security questions, appearance theme

### Global Features

**Sign-in Error Handling**
- Invalid credentials: "Invalid username or password"
- Account not ACTIVE: "Sign-in is not available: your account status is [STATUS]. Please contact the customer support service."
- Rate limit exceeded (before sign-in): "Daily request limit exceeded for customer N"
- Blocked login (IP/device lock): Display backend's block message

**Daily Request Limit**
- Each customer/employee: 1,000 requests/day (default, configurable per user)
- Counter resets at midnight (calendar day, kept in MySQL)
- One-time pop-up notification when limit exceeded (no inline red error)
- Request counter shown in top bar: "Logins today: N"
- Rate limit applies to all BFF calls (sign-in, data fetch, actions)

**Navigation**
- Top bar: Brand logo, login count, Dark/Light theme switch, Sign out button
- Left sidebar: Feature buttons (only those permitted by role)
- Mobile: Sidebar collapses to compact wrap above page content
- Responsive: Every feature works on 320px phone to wide desktop

**Public Pages**
- `/login`, `/staff/login`: Sign-in forms
- `/help`: FAQ, searchable, deep-linkable (e.g., `/help#locked-out`)
- `/terms`: Terms of Use (templated, server-side)
- `/privacy`: Privacy Policy (templated, server-side)

**Notifications**
- `RateLimitNotice`: One-time dialog when daily limit exceeded
- `SessionTimeout`: Countdown to sign-out (120 seconds before expiry)
- `IdleLogout`: Auto sign-out after inactivity
- `CookieNotice`: Non-dismissible notice (portal sets only necessary cookies)

### Error Handling

**User-Facing Errors**
- Backend errors displayed through `ErrorMessage` component (grey "not available right now" text)
- 429 (rate limit): One-time pop-up, no inline messages
- 403 (forbidden): User redirected to home or sign-in
- 500+ (server error): Generic message, no details exposed

**No Error Exposure**
- Never log or display passwords, security answers, tokens
- Never show backend URLs or internal error details to user
- Never display JWT in response body, logs, or client code

## Non-Functional Requirements

### Performance

- **Page load:** < 2 seconds (on 4G connection)
- **API response:** < 500ms (90th percentile)
- **Daily request limit:** 1,000 requests per customer/employee (no polling; each view fetched once per load)
- **Concurrent users:** Support 100+ concurrent users per instance
- **Database:** Single MySQL instance (backend holds all data)

### Security

**Authentication**
- Passwords: exactly 8 digits
- JWT: 30-minute lifetime (issued by backend)
- Tokens stored in httpOnly, Secure cookies (inaccessible to JavaScript)
- No token refresh (user signs out when token expires)

**Authorization**
- Backend enforces all access control (UI is convenience layer only)
- Never trust client-side role/privilege checks for sensitive actions
- Customer can only see own accounts (backend enforces)
- Staff actions checked against role permissions (backend enforces)

**Data Protection**
- HTTPS required in production (Secure cookie flag)
- No data persisted on server (stateless design)
- No user data stored in logs
- No passwords/tokens/security-answers in logs

**CORS & Same-Origin**
- Browser only calls same-origin `/api/*` handlers
- No CORS headers needed for this portal (backend stays internal)
- Backend called only by Next.js server (never by browser)

**Audit Trail**
- All actions logged by backend (not by portal)
- Porter sends `X-Customer-Id` header (customer ID or employee number)
- Backend tracks: login time, account changes, transactions, privilege changes

### Reliability

**Uptime**
- Target: 99.9% uptime during business hours
- Graceful degradation: old backend versions supported (missing fields handled)
- No state on disk (releases can be swapped freely)

**Error Recovery**
- Service auto-restart on failure (systemd `Restart=on-failure` or Docker `restart: unless-stopped`)
- Automatic health checks (every 30 seconds)
- Rollback: revert to previous release in < 5 minutes

**Monitoring**
- Health check endpoint: `GET /login` (should return 200)
- Logs: systemd journal or Docker logs
- Alerts: on service restart, 3 consecutive health check failures

### Scalability

**Horizontal Scaling**
- Stateless design (can run multiple instances)
- Load balance with nginx or cloud load balancer
- Each instance independent (no session affinity needed)
- No shared cache (all data from backend)

**Vertical Scaling**
- Memory: 2 GB RAM minimum, 4 GB recommended
- CPU: 2 cores minimum, 4 cores recommended for high load
- Disk: 10 GB minimum (for `.next/`, `node_modules/`, logs)

## Technical Requirements

### Technology Stack

**Frontend Framework**
- Next.js 16 (App Router, React 19)
- TypeScript (strict mode)
- ESLint (linting)
- Tailwind CSS (styling, if used)

**Backend Integration**
- Node.js 20.9 or newer (Next 16 requirement)
- Banking service (Spring, port 8081, context path `/brite`)
- BFF endpoints: `/bff/v1/portal/*`, `/bff/v1/staff/*`
- JWT signing key: `BANKING_JWT_SECRET` (backend's key)

**Testing**
- Playwright (end-to-end tests against real backend)
- Mobile testing: iPhone 15, 13 Pro Max, Galaxy S24, Galaxy S9+ (320px)

### Browser Support

**Minimum Versions**
- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions (iOS and macOS)

**Mobile Devices**
- iPhone: 320px and up
- Android: Samsung Galaxy S24, Galaxy S9+ (320px minimum)

**Accessibility**
- WCAG 2.1 Level AA (responsive, keyboard navigation)
- No fixed widths exceeding 320px on phones
- 44px touch targets (minimum)
- Color contrast ratio >= 4.5:1 (text) or 3:1 (UI)

### Environment Variables

**Build-Time** (baked into bundle)
- `NEXT_PUBLIC_SESSION_WARNING_SECONDS`: 120 (default)
- `NEXT_PUBLIC_IDLE_TIMEOUT_SECONDS`: 120 (default)

**Runtime** (read at server start)
- `BANKING_BACKEND_URL`: Backend service address (required)
- `BFF_PORTAL_PATH`: `/bff/v1/portal` (default)
- `BFF_STAFF_PATH`: `/bff/v1/staff` (default)
- `NODE_ENV`: `production` (required in production)
- `PORT`: 3000 (default)
- Optional: `SUPPORT_EMAIL`, `LEGAL_ENTITY_NAME`, `LEGAL_GOVERNING_LAW`, `LEGAL_REVIEWED`

### API Endpoints

**Portal Endpoints** (customers)
- `POST /api/auth/login`: Sign in
- `POST /api/auth/logout`: Sign out
- `GET /api/auth/me`: Get current user profile
- `GET /api/portal/[...path]`: Proxy to `/bff/v1/portal/*` (backend)

**Staff Endpoints** (employees)
- `POST /api/staff/[...path]`: Proxy to `/bff/v1/staff/*` (backend)

**Backend Endpoints** (called by Next.js server only)
- `POST /bff/v1/portal/login`: Customer sign-in
- `POST /bff/v1/staff/login`: Staff sign-in
- `GET /bff/v1/portal/home`: Customer dashboard
- `GET /bff/v1/portal/accounts/{id}/overview`: Account details
- `POST /bff/v1/portal/accounts/deposit`: Deposit transaction
- `POST /bff/v1/portal/accounts/withdraw`: Withdraw transaction
- And many more (see [backend-integration.md](backend-integration.md))

## Deployment Requirements

### Pre-Deployment

- Node.js 20.9+ installed on build machine and target server
- Network access to npm registry (or mirror) for dependency download
- HTTPS certificate (Let's Encrypt or corporate CA)
- Backend service running and accessible

### Production Deployment

**Three Paths Supported**
1. **Traditional** (systemd + nginx): Linux server, nginx reverse proxy, systemd service
2. **Docker**: Container deployment (Docker, Kubernetes, cloud platforms)
3. **Direct Node.js**: Node.js listening directly on port 443 (simpler, one process)

**Deployment Checklist**
- Read `.claude/skills/deployment/SKILL.md` before deploying
- Follow `.claude/docs/production_deploy.md` step-by-step
- Run pre-deployment checks: `tsc --noEmit`, `eslint .`, `npm run build`, e2e tests
- Secure environment file (`chmod 600`)
- Firewall rules: allow 22 (SSH), 80 (HTTP), 443 (HTTPS)
- Run as unprivileged user (`bankui`, not `root`)
- HTTPS required (Secure cookie flag)
- Monitor health checks (every 30 seconds)

### Monitoring & Logging

- Systemd journal or Docker logs
- Log rotation (daily, keep 7 days)
- Health endpoint: `GET /login` (should return 200)
- Alerts on service crash, repeated failures
- No sensitive data in logs (passwords, tokens, security answers)

## Compliance & Governance

### Data Privacy

- **No local storage:** Portal keeps no user data on disk
- **Backend owns data:** All user data lives in backend database
- **Audit trail:** Backend logs all actions (login, account changes, transactions)
- **Session tokens:** httpOnly cookies, not accessible to JavaScript
- **Passwords:** Never logged, never sent in response bodies

### Security Compliance

- HTTPS/TLS in production
- HTTP → HTTPS redirect
- Security headers: HSTS, X-Frame-Options, X-Content-Type-Options, CSP
- OWASP Top 10 compliance: no SQL injection (ORM), no XSS (React escaping), no unvalidated redirects
- No hardcoded secrets (all env vars)

### Testing & Quality Assurance

- **Unit/Integration:** TypeScript + ESLint catch type and style errors at build
- **End-to-End:** Playwright specs against real backend cover customer/staff flows, mobile sizes, error cases
- **Pre-commit:** `tsc --noEmit`, `eslint .` must pass
- **Mobile testing:** `e2e/mobile.spec.ts` fails on overflow (every screen checked)

### Release & Versioning

- Semantic versioning (v1.0.0, v1.0.1, v1.1.0)
- Releases tagged in git (e.g., `git tag v1.2.3`)
- Release notes document new features, bug fixes, security updates
- Rollback supported (keep last 3–5 releases)

## Constraints & Limitations

**Known Constraints**
- No real-time updates (no WebSocket, no polling)
- Single backend instance (no load balancing on backend)
- Portal stateless (cannot resume partially-completed forms)
- 1,000 requests per user per day (enforced by backend)
- 30-minute JWT lifetime (no refresh token)
- Passwords exactly 8 digits (backend constraint)

**Not In Scope** (removed from original design)
- User profiles (stored on backend only)
- User preferences (theme stored in `localStorage` on client)
- Notifications (no email/SMS from portal; backend handles)
- Audit log (kept by backend, not exposed to portal)
- Admin console (backend-only admin functions)
- Two-factor authentication (no TOTP, backend-only)
- Mobile app (web-only for now)

## Success Criteria

- [ ] All customer workflows tested and working
- [ ] All staff workflows tested and working (by role)
- [ ] Responsive on 320px phone to desktop (no overflow)
- [ ] HTTPS secure cookies work (sign-in doesn't loop)
- [ ] Rate limit pop-up appears on 429
- [ ] Session expires and signs out on 30-minute timeout
- [ ] Idle logout after 120 seconds of inactivity
- [ ] Backend errors shown as grey "not available" (no red messages)
- [ ] No passwords/tokens/security-answers in logs
- [ ] Health check passes (GET /login = 200)
- [ ] Rollback to previous version completes in < 5 minutes
- [ ] Deployment runs without downtime (with load balancing)