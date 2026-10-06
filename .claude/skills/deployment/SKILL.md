---
name: deployment
description: Production deployment paths, infrastructure setup, security hardening, monitoring, CI/CD, and operational runbooks. Use when deploying to production or setting up infrastructure.
---

# Production Deployment Guide

## Deployment Paths

### Path A: Traditional (systemd + nginx) — Recommended for stable, scalable production
- Step 1–5: Build on build machine, package, copy to server
- Step 6–8: Configure environment, run as systemd service
- Step 9a: nginx reverse proxy with HTTPS (TLS termination in proxy)
- Step 10: Verify and rollback procedures
- **Pros:** Low Node overhead, separation of concerns, easy to scale
- **Cons:** More moving parts, requires nginx configuration

### Path B: Docker deployment — Recommended for cloud/Kubernetes
- Build Docker image once with multi-stage Dockerfile
- Push to registry (Docker Hub, ECR, GCR, etc.)
- Run with `docker run` or Docker Compose
- Supports nginx proxy (Option A) or direct HTTPS (Option B)
- **Pros:** Portable, versioned, works everywhere Docker runs
- **Cons:** Container overhead, image size management

### Path C: Direct Node.js HTTPS — Simplest deployment, one process
- Node.js listens directly on port 443 (handles TLS)
- No reverse proxy overhead
- Can be systemd or Docker
- **Pros:** Simplicity, one process, direct connection
- **Cons:** Node handles all TLS work, harder to scale, must run as root for port 443

## Build Process (Common to all paths)

1. **Clone & checkout** specific commit/tag
2. **Install dependencies**: `npm ci` (exact versions)
3. **Set build-time vars**: `export NEXT_PUBLIC_*=...`
4. **Build**: `npm run build` (outputs to `.next/`)
5. **Package**: tar or Docker image (exclude `node_modules/`, `.git/`, source)

## Pre-deployment Checklist

### Code Quality
- [ ] `npx tsc --noEmit` (no TypeScript errors)
- [ ] `npx eslint .` (no linting errors)
- [ ] `npm run build` succeeds
- [ ] Relevant e2e tests pass
- [ ] No secrets in committed code

### Environment Configuration
- [ ] All `CHANGE_ME` placeholders replaced
- [ ] `BANKING_BACKEND_URL` points to correct environment (prod, not staging)
- [ ] `NEXT_PUBLIC_*` values match production
- [ ] `NODE_ENV=production` set
- [ ] Environment file permissions: `chmod 600`

### Deployment Prerequisites
- [ ] Chose deployment path (systemd+nginx, Docker, or direct Node)
- [ ] Release tarball or image built and versioned
- [ ] HTTPS certificate valid (not self-signed in production)
- [ ] Firewall rules configured
- [ ] Server has sufficient resources (2–4 GB RAM, 10+ GB disk)
- [ ] Network access to banking backend verified

## Security Hardening

### Essential Steps
1. **Firewall**: Allow only 22 (SSH), 80 (HTTP→HTTPS), 443 (HTTPS)
2. **User**: Run as unprivileged `bankui` user (not root, except port 443)
3. **Permissions**: Environment file `chmod 600`, secrets never in logs
4. **Certificates**: Let's Encrypt with auto-renewal via certbot
5. **Dependencies**: Run `npm audit` before each build

### HTTPS Security Headers
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

## Monitoring & Logging

### Systemd Logging
```bash
journalctl -u bankinguiportal -f              # Tail logs
journalctl -u bankinguiportal --since "1h"    # Last hour
journalctl -u bankinguiportal -p err          # Errors only
```

### Docker Logging
```bash
docker logs -f bankinguiportal                # Tail
docker logs --tail 100 bankinguiportal        # Last 100
docker logs --since 1h bankinguiportal        # Last hour
```

### Health Checks
- **Endpoint:** `GET /login` (should return 200)
- **Frequency:** Every 30 seconds (systemd healthcheck or Docker healthcheck)
- **Alert if:** 3 consecutive failures (indicates app crash or backend issue)

### Log Rotation
- **Systemd journal:** Configure retention in `/etc/systemd/journald.conf.d/`
- **Docker:** Use `json-file` driver with max-size (e.g., 100m)
- **Logrotate:** If using file logs, rotate daily, keep 7 days

## Resource Requirements

| Component | Small | Medium | Large |
|---|---|---|---|
| CPU | 2 cores | 4 cores | 8+ cores |
| RAM | 4 GB | 8 GB | 16+ GB |
| Disk | 10 GB | 20 GB | 50+ GB |
| Users | <100 | 100–500 | >500 |

### Node.js Tuning
```bash
export NODE_OPTIONS="--max-old-space-size=2048"  # 2 GB heap
ulimit -n 65536                                   # Max open files
```

## CI/CD Automation

### GitHub Actions Workflow
1. **Trigger:** On version tag (e.g., `git tag v1.0.0`)
2. **Build:** `npm ci` → lint/type-check → `npm run build` → e2e tests
3. **Docker:** Build image → push to registry
4. **Notify:** Slack/email with deployment instructions

### Manual Deployment Steps
```bash
# 1. Tag release
git tag v1.2.3
git push origin v1.2.3

# 2. CI/CD automatically builds and pushes

# 3. Deploy on server
docker compose pull && docker compose up -d

# 4. Verify
curl https://portal.example.com/login | grep "Sign in"
```

## Operational Runbooks

### Normal Deployment (5–10 min, 0 downtime with load balancing)
1. Test locally: `npm run build && npx playwright test e2e/`
2. Tag release: `git tag v1.2.3 && git push origin v1.2.3`
3. Wait for CI/CD to build and push image
4. On production: `docker compose pull && docker compose up -d`
5. Verify: `curl https://portal.example.com/login`

### Emergency Rollback (2–3 min)
```bash
# If v1.2.3 has critical issue:
docker pull docker.io/yourorg/bankinguiportal:v1.2.2
docker stop bankinguiportal
docker run --name bankinguiportal ... v1.2.2
# Verify and document incident
```

### Service Restart (on crash/failure)
- **Systemd:** `Restart=on-failure` (auto-restart)
- **Docker:** `restart: unless-stopped` (auto-restart)
- **Manual:** `systemctl restart bankinguiportal` or `docker restart bankinguiportal`

### Backend Connection Issues
1. Verify backend reachable: `curl http://banking.internal:8081/brite`
2. Check `BANKING_BACKEND_URL` in environment
3. Restart app: `systemctl restart bankinguiportal`
4. Check logs: `journalctl -u bankinguiportal -p err`

### Certificate Renewal
- **Let's Encrypt:** Certbot auto-renews every 60 days
- **Check expiry:** `openssl x509 -in /etc/letsencrypt/live/*/cert.pem -noout -dates`
- **Manual renew:** `certbot renew --force-renewal`
- **Reload after renew:** `systemctl reload nginx`

### Disk Space Warnings
1. Check usage: `df -h /opt/bankinguiportal`
2. Clean old releases: `rm -rf /opt/bankinguiportal/releases/old-version`
3. Clean Docker: `docker image prune -a --force`
4. Rotate logs: `logrotate -f /etc/logrotate.d/bankinguiportal`

## Load Balancing (Multiple Instances)

If traffic exceeds single Node.js capacity:
1. Run 3–5 Node instances on different ports (3001, 3002, 3003, ...)
2. nginx upstream with `least_conn` balancing
3. Health checks every 30 seconds
4. Restart one instance at a time (rolling updates)

## Troubleshooting

### App Issues
| Symptom | Cause | Fix |
|---|---|---|
| Sign-in loops | HTTP, not HTTPS | Use reverse proxy with HTTPS |
| Everyone logged out | Backend JWT key changed | Restart backend, check signing key |
| 502 Cannot reach backend | Wrong/unreachable `BANKING_BACKEND_URL` | Verify address, check firewall |
| 429 rate limit | Daily request limit hit | Raise limit or wait 24h |
| Health check failing | App needs >5s to start | Increase `start_period` in healthcheck |

### Docker Issues
| Symptom | Cause | Fix |
|---|---|---|
| Container exits | Missing dependencies | Check `docker logs` |
| Cannot connect to backend | Isolated network | Use service name in Compose network |
| Env vars not set | Not mounted at runtime | Use `--env-file` or `environment:` in Compose |

## Reference

**Full documentation:** `.claude/docs/production_deploy.md`
- Steps 1–10: Traditional deployment
- Step 11: Docker deployment
- Security hardening, monitoring, capacity planning
- CI/CD integration, operational runbooks