# Development Server Startup Scripts

Automated scripts to start the Brite Banking UI Portal development server with full error checking.

## Overview

**Dev Server Location:** `http://localhost:3000`

These scripts handle all prerequisites:
1. ✅ Check Node.js & npm installation
2. ✅ Verify project directory
3. ✅ Setup environment variables (`.env.local`)
4. ✅ Install dependencies (`npm ci`)
5. ✅ Type-check code (TypeScript)
6. ✅ Lint code (ESLint)
7. ✅ Check port 3000 availability
8. ✅ Verify backend connectivity (optional)
9. ✅ Start development server on `http://localhost:3000`

## Quick Start

### macOS & Linux

```bash
bash start-dev.sh
```

Or:

```bash
chmod +x start-dev.sh
./start-dev.sh
```

### Windows (CMD)

```bash
start-dev.bat
```

Or double-click `start-dev.bat` in File Explorer.

## What Each Script Does

### Step 1: Check Node.js & npm

Verifies Node.js 20.9+ and npm are installed.

```
✅ Node.js: v24.18.1
✅ npm: 11.16.0
```

**Error Example:**
```
❌ ERROR: Node.js is not installed. Please install Node.js 20.9 or newer.
Visit: https://nodejs.org/
```

### Step 2: Verify Project Directory

Checks that `package.json` exists (must run from project root).

```
✅ Project: bankinguiportal
✅ Correct directory detected
```

**Error Example:**
```
❌ ERROR: package.json not found. Please run this script from the project root directory.
```

### Step 3: Setup Environment Variables

Creates `.env.local` from `.env.local.brite` template if needed.

```
✅ Created .env.local from template
Environment variables loaded:
    BANKING_BACKEND_URL=http://banking.internal:8081/brite
    PORT=3000
    ...
```

### Step 4: Install Dependencies

Runs `npm ci` to install exact versions from `package-lock.json`.

```
✅ Dependencies installed
Installed packages: ~348
```

**Skipped if** `node_modules/` already exists. Delete it to force reinstall:

```bash
# macOS/Linux
rm -rf node_modules

# Windows
rmdir /s /q node_modules
```

Then re-run the startup script.

### Step 5: TypeScript Type Check

Runs `npx tsc --noEmit` to check for type errors.

```
✅ TypeScript type check passed (no errors)
```

**Error Example:**
```
❌ ERROR: TypeScript type check failed. Fix errors and retry.
src/components/Button.tsx:15:8 - error TS2322: Type 'string' is not assignable to type 'number'.
```

### Step 6: ESLint (Linting)

Runs `npx eslint .` to check code style.

```
✅ ESLint passed (no errors)
```

**Warning Example:**
```
⚠️  WARNING: ESLint found some issues (may be non-blocking). Continuing...
```

Non-blocking warnings won't stop the startup.

### Step 7: Check Port 3000

Verifies no other process is using port 3000.

```
✅ Port 3000 is available
```

**Error Example (macOS/Linux):**
```
❌ ERROR: Port 3000 is already in use (PID: 12345)
To free it, run: kill 12345
Or use a different port: PORT=3001 npm run dev
```

**Error Example (Windows):**
```
❌ ERROR: Port 3000 is already in use
Run: netstat -ano | findstr :3000  (to find the PID)
Then: taskkill /PID [PID] /F  (to free the port)
Or use: set PORT=3001 & npm run dev
```

### Step 8: Check Backend Connectivity

Tests if the banking backend is reachable at `http://banking.internal:8081/brite`.

```
✅ Backend is reachable
```

**Warning Example:**
```
⚠️  WARNING: Backend at http://banking.internal:8081/brite is not reachable
This is OK for local testing. Sign-in will fail without a running backend.
Start the banking backend on port 8081, or update BANKING_BACKEND_URL in .env.local
```

This is **not** a fatal error—you can test the UI even without a backend.

### Step 9: Start Development Server

Launches `npm run dev` on `http://localhost:3000`.

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   Development Server Starting on http://localhost:3000        ║
║                                                               ║
║   ✓ Hot reload enabled (changes auto-refresh)                 ║
║   ✓ TypeScript & ESLint checking enabled                      ║
║   ✓ Backend calls forwarded to: ...                           ║
║                                                               ║
║   To stop: Press Ctrl+C                                       ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

## Dev Server Details

### URL
- **Local:** `http://localhost:3000`
- **Network:** `http://192.168.x.x:3000` (if accessing from another machine)

### Features

| Feature | Status |
|---|---|
| Hot reload | ✅ Enabled (changes refresh automatically) |
| TypeScript | ✅ Watched (errors shown in terminal) |
| ESLint | ✅ Watched (style errors shown in terminal) |
| Backend proxy | ✅ `/api/*` forwarded to backend via route handlers |
| HTTPS | ❌ Not in dev (HTTP only; use nginx for HTTPS in production) |

### Environment

Dev server reads:
- `.env.local` (created by script)
- Defaults from `.env.local.brite`
- Build-time: `NEXT_PUBLIC_*` variables (baked into bundle)
- Runtime: All other variables (read each time server starts)

## Troubleshooting

### "Port 3000 already in use"

**macOS/Linux:**
```bash
lsof -ti :3000 | xargs kill  # or
lsof -i :3000                # to see what's running
kill -9 <PID>                # kill by PID
```

**Windows:**
```bash
netstat -ano | findstr :3000
taskkill /PID 12345 /F
```

**Or use a different port:**
```bash
PORT=3001 npm run dev
```

### "Cannot reach the banking service"

**Backend is not running.** Options:

1. Start the backend on port 8081
2. Update `BANKING_BACKEND_URL` in `.env.local` to point to running backend
3. For UI-only testing, this error is OK (sign-in will fail, but UI loads)

### "TypeScript type check failed"

Fix the TypeScript errors shown in output, then restart the script.

Example:
```
src/components/Button.tsx:15:8 - error TS2322: Type 'string' is not assignable to type 'number'.
```

Fix the file, save, and TypeScript will recheck automatically.

### "node_modules not found" / install takes forever

The first install downloads 348 packages (~500 MB). Subsequent runs skip this.

If install hangs:
1. Delete `node_modules/` and `package-lock.json`
2. Run the script again (it will do `npm ci`)

### Script not executable (macOS/Linux)

```bash
chmod +x start-dev.sh
./start-dev.sh
```

### "npm: command not found" (Windows)

npm might not be in your PATH. Options:

1. Reinstall Node.js (includes npm)
2. Add npm to PATH manually
3. Open a new terminal after installing Node.js

## Stopping the Server

### During Development

Press `Ctrl+C` in the terminal where the server is running.

```
^C
> bankinguiportal@0.1.0 dev
> next dev

Aborted: SIGTERM
```

### If Server Runs in Background

**macOS/Linux:**
```bash
lsof -ti :3000 | xargs kill
```

**Windows:**
```bash
taskkill /F /IM node.exe
```

## Environment Variables

### Build-Time (must restart to change)
- `NEXT_PUBLIC_SESSION_WARNING_SECONDS` — countdown before logout warning (default: 120)
- `NEXT_PUBLIC_IDLE_TIMEOUT_SECONDS` — auto logout after inactivity (default: 120)

### Runtime (read at startup)
- `BANKING_BACKEND_URL` — Backend address (default: `http://banking.internal:8081/brite`)
- `PORT` — Dev server port (default: 3000)
- `BFF_PORTAL_PATH` — Customer API path (default: `/bff/v1/portal`)
- `BFF_STAFF_PATH` — Staff API path (default: `/bff/v1/staff`)

Change build-time vars and restart dev server:
```bash
NEXT_PUBLIC_SESSION_WARNING_SECONDS=300 npm run dev
```

## Testing the Setup

Once the server is running:

### 1. Browser Test
Visit `http://localhost:3000` in Chrome or Firefox. You should see the customer sign-in page.

### 2. API Test
```bash
curl -s http://localhost:3000/login | head -20
```

Should return HTML content (sign-in page).

### 3. Sign-In Test (requires backend)
Use demo credentials:
- **Customer:** `customer0001` / `20262`
- **Staff:** `priya.raman` / (backend seed password)

## Notes

- **Hot reload:** Changes to code files automatically update in browser (no restart needed)
- **Config changes:** Changes to `.env.local` or `next.config.ts` require server restart
- **One dev server per port:** Only one instance can run on port 3000 at a time
- **Network access:** Server listens on all interfaces (you can access from other machines via IP)

## Next Steps

1. ✅ Run startup script
2. ✅ Open `http://localhost:3000` in browser
3. ✅ Test sign-in (if backend is running)
4. ✅ Make code changes and see hot reload in action
5. ✅ Press `Ctrl+C` to stop when done

---

**Happy developing!** 🚀
