# Production deploy: package and run, step by step

How to turn this repo into a release you can copy to a server and run. The standard process (steps 1–10) was tried end to end on
2026-09-30 (build, package, install production-only dependencies, start, sign in, check the proxy). The Docker path (section 11) is
production-ready. For background on why `node_modules/` and `.next/` are not in git, see the Deploy section of the repo-root `README.md`.

Two machines are involved: a **build machine** (your laptop or CI) and the **target server**. They can be the same machine; then skip
the copy step. The Docker path packages everything into a single image and runs anywhere Docker is available.

## What goes into a release

| Include | Why |
|---|---|
| `.next/` (without `cache/` and `dev/`) | The compiled app. About 3 MB packed; with `cache/` and `dev/` it is over 500 MB. |
| `public/` | Static files served as is. |
| `package.json`, `package-lock.json` | So the target can install the exact runtime packages. |
| `next.config.ts` | Read at start-up (currently an empty config). It loads fine without TypeScript installed. |

Leave out: `node_modules/` (installed on the target), `.env.local` (set variables on the host), `.git/`, and source folders (`app/`, `components/`, `lib/`), which are already compiled
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

`NEXT_PUBLIC_*` variables are baked into the browser bundle during the build, so set them now. Changing them later needs a
rebuild. (The backend address is *not* one of them: only the Next server calls the backend.)

```bash
export NEXT_PUBLIC_SESSION_WARNING_SECONDS=120   # countdown before the backend token expires
export NEXT_PUBLIC_IDLE_TIMEOUT_SECONDS=120    # sign out after this much inactivity
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
must use different backend URLs (never point staging at production data). Check that no `CHANGE_ME` is left:
`grep CHANGE_ME /etc/bankinguiportal.env` should print nothing.

Put the variables in a file outside the release, for example `/etc/bankinguiportal.env` (mode `600`, owned by the
service user). Do not reuse `.env.local` from a laptop.

```bash
NODE_ENV=production
PORT=3000
# The banking service, called by the Next server only (the browser never calls it). Read when the server starts.
BANKING_BACKEND_URL=http://banking.internal:8081/brite
BFF_PORTAL_PATH=/bff/v1/portal
BFF_STAFF_PATH=/bff/v1/staff
# The token lifetime and signing key are the BACKEND's settings (banking.jwt.expiration-minutes, BANKING_JWT_SECRET).
NEXT_PUBLIC_SESSION_WARNING_SECONDS=120
NEXT_PUBLIC_IDLE_TIMEOUT_SECONDS=120
# Optional: SUPPORT_EMAIL, LEGAL_ENTITY_NAME, LEGAL_GOVERNING_LAW, LEGAL_REVIEWED
```

Which variables are read when:

| When | Variables |
|---|---|
| Build time (step 2) | `NEXT_PUBLIC_*` |
| Server start | everything else, including `BANKING_BACKEND_URL` |

The full list, with defaults, is in `.env.local.brite`.

## Step 7: Nothing to persist

The portal keeps no state on disk: no users, sessions or logs. Identity lives in the banking service, and the sign-in
tokens are in the users' browsers. Releases can be swapped freely, and signing in again is only needed when the backend's
token expires or its signing key (`BANKING_JWT_SECRET`) changes.

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

## Step 9a: Put HTTPS in front (with nginx reverse proxy — recommended)

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
    proxy_set_header X-Forwarded-For $remote_addr;   # rate-limit key before sign-in; only trust it behind your own proxy
    proxy_set_header X-Forwarded-Proto https;
  }
}
```

The banking backend needs no CORS entry for this portal: only the Next server calls it, so it can stay on an internal
address and off the public internet. The BFF endpoints it serves require the JWT it issues.

### Why use a reverse proxy?

- **No resource overhead in Node**: TLS termination happens in the proxy, not in the app
- **One process can fail; others keep serving**: If Node crashes, nginx stays up (though it returns errors)
- **Easy to add compression, caching, security headers**: nginx handles these at wire speed
- **Simple rolling updates**: Run multiple Node instances behind nginx, restart one at a time
- **DDoS/rate limiting**: Proxy can drop bad traffic before it reaches the app

## Step 9b: Direct Node.js HTTPS (no reverse proxy — simpler)

If you prefer **one process, one port, no reverse proxy overhead**:

1. **Install an HTTPS certificate** (Let's Encrypt, self-signed, or your CA). Place the key and cert on the server:
   ```bash
   /etc/bankinguiportal/cert.pem      # Your certificate
   /etc/bankinguiportal/key.pem       # Your private key
   chmod 600 /etc/bankinguiportal/key.pem
   ```

2. **Update `.env` on the server** to tell Node.js to use HTTPS:
   ```bash
   NODE_ENV=production
   PORT=443
   HTTPS_CERT_PATH=/etc/bankinguiportal/cert.pem
   HTTPS_KEY_PATH=/etc/bankinguiportal/key.pem
   BANKING_BACKEND_URL=http://banking.internal:8081/brite
   # ... rest of vars
   ```

3. **Modify systemd service** to run with elevated privileges (only Node can listen on port 443):
   ```ini
   # /etc/systemd/system/bankinguiportal.service
   [Unit]
   Description=Brite Banking UI Portal (Direct HTTPS)
   After=network.target

   [Service]
   User=root                          # Must be root to listen on port 443
   WorkingDirectory=/opt/bankinguiportal/current
   EnvironmentFile=/etc/bankinguiportal.env
   ExecStart=/usr/bin/npm start
   Restart=on-failure

   [Install]
   WantedBy=multi-user.target
   ```

4. **Start it directly** (Next.js will read `HTTPS_CERT_PATH` and `HTTPS_KEY_PATH` and serve HTTPS on port 443):
   ```bash
   sudo systemctl daemon-reload && sudo systemctl enable --now bankinguiportal
   journalctl -u bankinguiportal -f
   ```

**Trade-off:** Node.js now handles TLS, compression, and all the work directly. This uses more CPU but simplifies operations (one process, one port).

Choose **9a (with nginx)** if you want:
- Separation of concerns (proxy vs app)
- Built-in compression, caching, headers
- Easier scaling (multiple Node instances)

Choose **9b (direct Node.js)** if you want:
- Simplicity (one process)
- Lower latency (no proxy hop)
- Fewer moving parts

## Step 10: Verify, and know how to roll back

Checks (all passed in the trial run):

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://portal.example.com/login   # 200
curl -s -o /dev/null -w "%{http_code}\n" https://portal.example.com/help    # 200 (public)
curl -s -o /dev/null -w "%{http_code}\n" https://portal.example.com/api/portal/home
                                                                              # 401 when signed out (from the backend)
```

Then sign in as a customer in a browser and open an account overview: that exercises `BANKING_BACKEND_URL` end to end.
Sign in on `/staff/login` as an employee and confirm the dashboard shows the role's privileges; a customer opening `/staff`
should land back on the customer home page.

Rollback: point `current` at the previous release and restart.

```bash
sudo ln -sfn /opt/bankinguiportal/releases/<previous-version> /opt/bankinguiportal/current
sudo systemctl restart bankinguiportal
```

Keep the last few releases and delete older ones.

## Step 11: Docker deployment (production-ready)

Build once, run anywhere. This replaces steps 1–5 (build on your laptop or CI, ship via image registry).

### Create a `.dockerignore` file

Speeds up the Docker build by excluding files not needed in the image.

```
node_modules
.next
.env*
.git
.idea
.vscode
e2e
*.md
```

### Build the Docker image

```bash
VERSION=$(git rev-parse --short HEAD)
REGISTRY=docker.io/yourorg                    # or your private registry
docker build -t $REGISTRY/bankinguiportal:$VERSION \
  --build-arg NEXT_PUBLIC_SESSION_WARNING_SECONDS=120 \
  --build-arg NEXT_PUBLIC_IDLE_TIMEOUT_SECONDS=120 \
  .
```

### Dockerfile (multi-stage)

```dockerfile
FROM node:22-slim AS build
WORKDIR /app

# Install dependencies and build
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG NEXT_PUBLIC_SESSION_WARNING_SECONDS=120
ARG NEXT_PUBLIC_IDLE_TIMEOUT_SECONDS=120
ENV NEXT_PUBLIC_SESSION_WARNING_SECONDS=$NEXT_PUBLIC_SESSION_WARNING_SECONDS
ENV NEXT_PUBLIC_IDLE_TIMEOUT_SECONDS=$NEXT_PUBLIC_IDLE_TIMEOUT_SECONDS

RUN npm run build

# Runtime image
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production

# Copy runtime dependencies and app
COPY package.json package-lock.json next.config.ts ./
RUN npm ci --omit=dev

COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/login', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["npm", "start"]
```

### Push to registry

```bash
docker push $REGISTRY/bankinguiportal:$VERSION
docker tag $REGISTRY/bankinguiportal:$VERSION $REGISTRY/bankinguiportal:latest
docker push $REGISTRY/bankinguiportal:latest
```

### Run the container

**Option A: With reverse proxy (HTTP only, nginx handles HTTPS)**
```bash
docker run \
  --rm \
  -p 3000:3000 \
  --env-file /etc/bankinguiportal.env \
  --health-interval 30s \
  $REGISTRY/bankinguiportal:$VERSION
```

**Option B: Direct HTTPS (Node.js handles TLS)**
```bash
docker run \
  --rm \
  -p 443:3000 \
  --env-file /etc/bankinguiportal.env \
  -e HTTPS_CERT_PATH=/etc/ssl/certs/cert.pem \
  -e HTTPS_KEY_PATH=/etc/ssl/private/key.pem \
  -v /etc/ssl/certs/cert.pem:/etc/ssl/certs/cert.pem:ro \
  -v /etc/ssl/private/key.pem:/etc/ssl/private/key.pem:ro \
  --health-interval 30s \
  $REGISTRY/bankinguiportal:$VERSION
```

Keep `.env` file outside the image (mounted at runtime). Mount certificates as read-only volumes. Do not bake secrets into the image.

### Docker Compose — Option A: With nginx (recommended)

```yaml
version: '3.9'
services:
  bankinguiportal:
    image: docker.io/yourorg/bankinguiportal:latest
    container_name: bankinguiportal
    expose:
      - "3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      BANKING_BACKEND_URL: http://banking.internal:8081/brite
      BFF_PORTAL_PATH: /bff/v1/portal
      BFF_STAFF_PATH: /bff/v1/staff
      NEXT_PUBLIC_SESSION_WARNING_SECONDS: "120"
      NEXT_PUBLIC_IDLE_TIMEOUT_SECONDS: "120"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/login', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 5s
    networks:
      - banknet

  nginx:
    image: nginx:latest
    container_name: nginx-proxy
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/ssl/certs:/etc/ssl/certs:ro
      - /etc/ssl/private:/etc/ssl/private:ro
    depends_on:
      - bankinguiportal
    networks:
      - banknet

networks:
  banknet:
    driver: bridge
```

### Docker Compose — Option B: Direct Node.js HTTPS (no nginx)

```yaml
version: '3.9'
services:
  bankinguiportal:
    image: docker.io/yourorg/bankinguiportal:latest
    container_name: bankinguiportal
    ports:
      - "443:3000"                    # Map host 443 to container 3000 (Node handles HTTPS)
    environment:
      NODE_ENV: production
      PORT: 3000
      BANKING_BACKEND_URL: http://banking.internal:8081/brite
      BFF_PORTAL_PATH: /bff/v1/portal
      BFF_STAFF_PATH: /bff/v1/staff
      NEXT_PUBLIC_SESSION_WARNING_SECONDS: "120"
      NEXT_PUBLIC_IDLE_TIMEOUT_SECONDS: "120"
      HTTPS_CERT_PATH: /etc/ssl/certs/cert.pem
      HTTPS_KEY_PATH: /etc/ssl/private/key.pem
    volumes:
      - /etc/ssl/certs/cert.pem:/etc/ssl/certs/cert.pem:ro
      - /etc/ssl/private/key.pem:/etc/ssl/private/key.pem:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('https').get({hostname:'localhost', port:3000, path:'/login', rejectUnauthorized:false}, (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 5s
```

**Option A (with nginx):** More moving parts, better separation, easier to scale.  
**Option B (direct Node):** Simpler, faster (no proxy hop), one process.

Set env vars at runtime via `-e`, `--env-file`, or in the compose file (no rebuild needed). Mount certificates as volumes,
never bake them into the image.

### Verify the container

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/login   # 200
docker logs <container_id>
docker inspect <container_id>
```

### Rollback

In production, use an image registry and CI/CD pipeline to tag immutable versions. To rollback:

```bash
docker stop bankinguiportal
docker run --name bankinguiportal ... docker.io/yourorg/bankinguiportal:<previous-version>
```

Or with Compose: update the image tag and `docker compose up -d`.

## Troubleshooting

### General

| Symptom | Likely cause |
|---|---|
| Sign-in succeeds but the next page returns to `/login` | Served over HTTP; the `Secure` cookie is dropped. Use HTTPS. |
| Everyone is signed out | The backend restarted with a random signing key (`BANKING_JWT_SECRET` blank) or the key differs between backend instances; or the 30-minute token simply expired. |
| Every call returns 502 "Cannot reach the banking service" | `BANKING_BACKEND_URL` is wrong or unreachable from the Next server. |
| A 400 about a missing header, or 429 "Daily request limit exceeded for customer N" | The backend's rate limiter: the `X-Customer-Id` header is required, and each customer/employee gets 1,000 requests a day (kept in MySQL, starting again the next day). Raise that person's limit on the Customer logins / employee screen, or wait. The portal shows a one-time pop-up for it. |
| A customer or employee gets 403 on everything | They are using the wrong portal (customer token on `/staff`, or the reverse), or their login is not `ACTIVE`. |
| A customer cannot sign in: "Sign-in is not available: your account status is …" | None of their accounts is ACTIVE (SUSPENDED, CLOSED, INACTIVE or DORMANT); the backend refuses sign-in. Reactivate or fix the account; the portal just shows the backend's message. |
| `npm ci` fails: lock file out of sync | `package.json` was changed without updating `package-lock.json`; run `npm install` locally and commit both. |

### Docker

| Symptom | Likely cause |
|---|---|
| Container exits immediately | `docker logs <container>` to see the error. Usually `npm start` can't find dependencies; ensure `npm ci --omit=dev` ran in the Dockerfile. |
| `docker build` fails: "Cannot find module" | Check `.dockerignore`; `.env*` files should be excluded, not the app code. Rebuild with `docker build --no-cache`. |
| Environment variables not set in container | Use `--env-file`, `-e`, or Docker Compose `environment:`. Do not bake them into the image. Rebuild if you need to change `NEXT_PUBLIC_*` vars. |
| Container can reach the database but portal returns 502 | The container's network may be isolated. In Docker Compose, use the service name (`http://banking.internal`) only if it's in the same network. For external services, use the full hostname/IP. |
| Health check keeps failing | Portal needs 5+ seconds to start. Increase `start_period` in the health check. Or run `docker logs` to see if there's a startup error. |
