# Production deploy: package and run, step by step

How to turn this repo into a release you can copy to a server and run. Steps 1 to 6 were tried end to end on
2026-09-30 (build, package, install production-only dependencies, start, sign in, check the proxy); the process
manager, reverse proxy and Docker sections are templates and have not been run. For background on why `node_modules/`
and `.next/` are not in git, see the Deploy section of the repo-root `README.md`.

Two machines are involved: a **build machine** (your laptop or CI) and the **target server**. They can be the same
machine; then skip the copy step.

## What goes into a release

| Include | Why |
|---|---|
| `.next/` (without `cache/` and `dev/`) | The compiled app. About 3 MB packed; with `cache/` and `dev/` it is over 500 MB. |
| `public/` | Static files served as is. |
| `package.json`, `package-lock.json` | So the target can install the exact runtime packages. |
| `next.config.ts` | Read at start-up (it holds the `/api/banking` rewrite). It loads fine without TypeScript installed. |

Leave out: `node_modules/` (installed on the target), `.env.local` (set variables on the host), `.data/` (runtime
state, lives on the server), `.git/`, and source folders (`app/`, `components/`, `lib/`), which are already compiled
into `.next/`.

## Prerequisites

- **Both machines:** Node.js 20.9 or newer (Next 16's minimum) and npm.
- **Build machine:** network access to the npm registry (or a mirror).
- **Target:** network access to the registry for step 4 (or ship `node_modules/` yourself), and access to the banking
  backend (see step 5).

## Step 1: Get a clean checkout on the build machine

```bash
git clone <repo-url> bankinguiportal && cd bankinguiportal
git checkout <tag-or-commit>      # build a specific commit, never "whatever is on the branch"
```

## Step 2: Install all dependencies, then set the build-time variables

```bash
npm ci                            # exact versions from package-lock.json; includes dev tools needed for the build
```

`NEXT_PUBLIC_*` variables are baked into the browser bundle during the build, so set them now, for the *production*
backend address. Changing them later needs a rebuild.

```bash
export NEXT_PUBLIC_API_BASE_URL=https://bank.example.com/brite
export NEXT_PUBLIC_CUSTOMER_ID=portal          # rate-limit key only
export NEXT_PUBLIC_SESSION_WARNING_SECONDS=120
```

## Step 3: Build

```bash
npm run build
```

It prints the route list and ends with `ƒ Proxy (Middleware)`. Any type or lint failure stops the build here, not in
production. The output is in `.next/` (about 8 seconds on a modern laptop).

## Step 4: Package

```bash
VERSION=$(git rev-parse --short HEAD)
tar -czf bankinguiportal-$VERSION.tgz \
  --exclude='.next/cache' --exclude='.next/dev' \
  .next public package.json package-lock.json next.config.ts
```

The result was about 3.3 MB. Optionally record a checksum: `shasum -a 256 bankinguiportal-$VERSION.tgz`.

## Step 5: Copy to the server and unpack

Use a versioned directory plus a `current` symlink so you can roll back (step 10).

```bash
scp bankinguiportal-$VERSION.tgz deploy@server:/tmp/
ssh deploy@server
  sudo mkdir -p /opt/bankinguiportal/releases/$VERSION /opt/bankinguiportal/data
  sudo tar -xzf /tmp/bankinguiportal-$VERSION.tgz -C /opt/bankinguiportal/releases/$VERSION
  cd /opt/bankinguiportal/releases/$VERSION
  npm ci --omit=dev               # downloads only the runtime packages (about 320 MB, no TypeScript/ESLint)
```

`npm ci --omit=dev` installs `next`, `react`, `react-dom` and `qrcode` from the lock file. The app loads them from
this `node_modules/` at run time.

## Step 6: Configure the environment on the server

Templates for each environment are in the repo: `.env.staging.brite` and `.env.prod.brite`. Copy one to the host
(`cp .env.prod.brite /etc/bankinguiportal.env`), replace every `CHANGE_ME`, and `chmod 600` it. Staging and production
must use different `AUTH_SECRET`, `DEMO_USERS` and backend URLs. The app does not reject a placeholder secret, so check
that no `CHANGE_ME` is left: `grep CHANGE_ME /etc/bankinguiportal.env` should print nothing.

Put the variables in a file outside the release, for example `/etc/bankinguiportal.env` (mode `600`, owned by the
service user). Do not reuse `.env.local` from a laptop.

```bash
NODE_ENV=production
PORT=3000
# Required. A long random string; generate with: openssl rand -base64 48
# Changing it later signs everyone out and disables existing 2FA setups.
AUTH_SECRET=...
# Replace the defaults, which are public. Format: username:password:customerId[:admin], comma separated.
DEMO_USERS=Admin:<strong-password>:CUST-ADMIN:admin,...
# Read when the server starts: where /api/banking/* is forwarded.
BANKING_BACKEND_URL=http://banking.internal:8081/brite
SESSION_MAX_AGE_SECONDS=28800
REMEMBER_ME_MAX_AGE_SECONDS=2592000
LOCKOUT_MAX_ATTEMPTS=5
LOCKOUT_MINUTES=15
# Optional: SUPPORT_EMAIL, LEGAL_ENTITY_NAME, LEGAL_GOVERNING_LAW, LEGAL_REVIEWED, AUDIT_MAX_BYTES
```

Which variables are read when:

| When | Variables |
|---|---|
| Build time (step 2) | `NEXT_PUBLIC_*` |
| Server start | everything else, including `BANKING_BACKEND_URL` and `AUTH_SECRET` |

The full list, with defaults, is in `.env.local.brite`.

## Step 7: Make `.data/` persistent

The app writes users, 2FA, lockouts, preferences, notifications and the audit log to `.data/` **under the working
directory**. Each release directory is new, so link it to a shared directory:

```bash
ln -s /opt/bankinguiportal/data /opt/bankinguiportal/releases/$VERSION/.data
sudo chown -R bankui:bankui /opt/bankinguiportal/data && sudo chmod 700 /opt/bankinguiportal/data
```

Skip this and every release starts with empty state (password changes, 2FA setups and the audit log are lost). Back
the directory up; in Docker, mount a volume at `/app/.data`.

## Step 8: Start it

Quick test by hand:

```bash
cd /opt/bankinguiportal/releases/$VERSION
set -a; . /etc/bankinguiportal.env; set +a
npm start                         # Next.js prints "Ready"; listens on PORT (default 3000) on all interfaces
```

Then run it as a service so it restarts on failure and on reboot. A systemd unit (template):

```ini
# /etc/systemd/system/bankinguiportal.service
[Unit]
Description=Brite Banking UI Portal
After=network.target

[Service]
User=bankui
WorkingDirectory=/opt/bankinguiportal/current
EnvironmentFile=/etc/bankinguiportal.env
ExecStart=/usr/bin/npm start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo ln -sfn /opt/bankinguiportal/releases/$VERSION /opt/bankinguiportal/current
sudo systemctl daemon-reload && sudo systemctl enable --now bankinguiportal
journalctl -u bankinguiportal -f
```

## Step 9: Put HTTPS in front

The session cookie is `Secure` in production, so **the browser will not send it back over plain HTTP and sign-in
will appear to loop**. Terminate TLS at a reverse proxy and forward to port 3000. Template for nginx:

```nginx
server {
  listen 443 ssl;
  server_name portal.example.com;
  # ssl_certificate / ssl_certificate_key ...
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;   # audit-log client IP; only trust it behind your own proxy
    proxy_set_header X-Forwarded-Proto https;
  }
}
```

Also in the banking backend: add the portal's origin (for example `https://portal.example.com`) to
`banking.portal.allowed-origins`. The browser calls the BFF endpoints directly, so CORS must allow it. The backend does
not authenticate requests, so keep it off the public internet.

## Step 10: Verify, and know how to roll back

Checks (all passed in the trial run):

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://portal.example.com/login   # 200
curl -s -o /dev/null -w "%{http_code}\n" https://portal.example.com/help    # 200 (public)
curl -s -o /dev/null -w "%{http_code}\n" https://portal.example.com/api/banking/v1/api/accounts/x/statement
                                                                              # 401 when signed out
```

Then sign in in a browser and open an account overview. If that loads, the browser-to-backend (CORS) path works; the
deposit, withdraw, statement and close screens use the `/api/banking` proxy and so exercise `BANKING_BACKEND_URL`.
Sign in as a non-admin and confirm `/admin/users` redirects to the home page.

Rollback: point `current` at the previous release and restart. `.data/` is shared, so state is untouched.

```bash
sudo ln -sfn /opt/bankinguiportal/releases/<previous-version> /opt/bankinguiportal/current
sudo systemctl restart bankinguiportal
```

Keep the last few releases and delete older ones.

## Docker alternative (untested template)

```dockerfile
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json next.config.ts ./
RUN npm ci --omit=dev
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["npm", "start"]
```

Run with `-v portal-data:/app/.data --env-file bankinguiportal.env -p 3000:3000`. Add a `.dockerignore` that lists
`node_modules`, `.next`, `.data`, `.env*` and `.git`, so they are not sent to the build.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Sign-in succeeds but the next page returns to `/login` | Served over HTTP; the `Secure` cookie is dropped. Use HTTPS. |
| Everyone is signed out after a restart or release | `AUTH_SECRET` changed, or differs between instances. Keep one stable value. |
| Users, 2FA or audit history disappear after a release | `.data/` is not shared across releases (step 7). |
| Browser calls go to `localhost:8081` | `NEXT_PUBLIC_API_BASE_URL` was not set at build time; rebuild. |
| Account data loads but deposit/withdraw fail | `BANKING_BACKEND_URL` is wrong or unreachable from the server. |
| Account data fails with a network error | The backend's `banking.portal.allowed-origins` lacks the portal origin, or the backend is down or rate limiting (a 429 shows as a network error). |
| `npm ci` fails: lock file out of sync | `package.json` was changed without updating `package-lock.json`; run `npm install` locally and commit both. |
