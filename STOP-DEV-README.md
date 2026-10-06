# Stop Development Server Scripts

Scripts to gracefully stop the Brite Banking UI Portal development server running on port 3000.

## Quick Start

### macOS & Linux

```bash
bash stop-dev.sh
```

Or:

```bash
chmod +x stop-dev.sh
./stop-dev.sh
```

### Windows (CMD)

```bash
stop-dev.bat
```

Or double-click `stop-dev.bat` in File Explorer.

## What the Scripts Do

1. **Check if server is running** on port 3000
2. **Get process information** (PID, process name)
3. **Send graceful shutdown signal** (SIGTERM / taskkill)
4. **Wait for graceful shutdown** (5 seconds)
5. **Force stop if needed** (SIGKILL / Force termination)
6. **Confirm port is free** for next use
7. **Show success message** with next steps

## Output Examples

### Successful Stop (Graceful)

```
ℹ️  Checking for dev server on port 3000...

✅ Found process listening on port 3000
  PID: 12345
  Process: node

ℹ️  Stopping development server...
  Sent SIGTERM to process 12345
✅ Development server stopped gracefully

╔═══════════════════════════════════════════════════════════════╗
║ Development Server Stopped                                    ║
║ Port 3000 is now available.                                   ║
║ To start again: bash start-dev.sh                             ║
╚═══════════════════════════════════════════════════════════════╝
```

### Server Not Running

```
ℹ️  Checking for dev server on port 3000...

⚠️  WARNING: No process found listening on port 3000

The development server is not running.

To start it, run:
  bash start-dev.sh
```

### Force Stop (Graceful Shutdown Timed Out)

```
ℹ️  Checking for dev server on port 3000...

✅ Found process listening on port 3000
  PID: 12345
  Process: node

ℹ️  Stopping development server...
  Sent SIGTERM to process 12345
⚠️  Graceful shutdown timed out. Force stopping...
✅ Development server force stopped (SIGKILL)

Port 3000 is now available.
```

## When to Use

### Stop the Server

Use these scripts when you:
- ✅ Finish development work
- ✅ Need to free port 3000 for another app
- ✅ Want to cleanly restart the dev server
- ✅ Need to switch between branches that have conflicting dependencies

### Manual Stop (During Development)

If the dev server is running in a terminal, simply:
- Press **Ctrl+C** in the terminal

The server will stop gracefully.

## Troubleshooting

### "No process found listening on port 3000"

The server is already stopped. You can safely run the start script:

```bash
bash start-dev.sh
```

### "Failed to stop process" (Permission Denied)

The script lacks permission to kill the process. Options:

**Option 1: Use sudo (macOS/Linux)**
```bash
sudo bash stop-dev.sh
```

**Option 2: Manual kill (macOS/Linux)**
```bash
lsof -i :3000                    # Find the PID
kill -9 <PID>                    # Kill it
```

**Option 3: Admin Command Prompt (Windows)**
1. Right-click Command Prompt → "Run as Administrator"
2. Run: `stop-dev.bat`

**Option 4: Manual kill (Windows)**
```bash
netstat -ano | findstr :3000     # Find the PID
taskkill /PID <PID> /F           # Force kill
```

### Server doesn't stop after 5 seconds

The script automatically force-stops the process if graceful shutdown takes too long.

If this happens repeatedly, the server may have hung processes:

```bash
# macOS/Linux: See all Node processes
ps aux | grep node

# Windows: See all Node processes
tasklist | findstr node

# Kill specific process
kill -9 <PID>              # macOS/Linux
taskkill /PID <PID> /F     # Windows
```

## Shutdown Process

### Graceful Shutdown (Preferred)

1. Script sends SIGTERM / termination signal
2. Server receives signal and:
   - Closes HTTP connections gracefully
   - Flushes any pending data
   - Shuts down cleanly
3. Takes 1-2 seconds
4. Port 3000 immediately available

### Force Shutdown (After 5 seconds)

1. Graceful shutdown times out
2. Script sends SIGKILL / force kill
3. Server terminates immediately
4. Port 3000 immediately available
5. **Note:** Any unsaved work is lost (rare in dev)

## Port 3000 Cleanup

After stopping, port 3000 is immediately available for:
- Restarting the dev server
- Running another service on port 3000
- Testing with a different backend

To verify port is free:

**macOS/Linux:**
```bash
lsof -i :3000       # Should return nothing if free
```

**Windows:**
```bash
netstat -ano | findstr :3000    # Should return nothing if free
```

## Next Steps After Stopping

### Restart Dev Server

```bash
bash start-dev.sh         # macOS/Linux
# or
start-dev.bat             # Windows
```

### Switch Branches

```bash
git checkout other-branch
bash start-dev.sh
```

### Deploy to Production

```bash
npm run build
# Then follow production deployment steps in docs/production_deploy.md
```

## Tips

- **Quick stop:** Press Ctrl+C in terminal where server runs (faster than scripts)
- **Check what's running:** `lsof -i :3000` (macOS/Linux) or `netstat -ano | findstr :3000` (Windows)
- **Schedule stops:** Can be automated in CI/CD pipelines
- **Multiple instances:** Each port can run independently (port 3001, 3002, etc.)

## FAQ

### Can I stop the server without a script?

Yes, three ways:

1. **Press Ctrl+C** in terminal where `npm run dev` is running (fastest)
2. **Use Activity Monitor** (macOS) or Task Manager (Windows) to kill Node process
3. **Command line:** `lsof -ti :3000 | xargs kill -9` (macOS/Linux)

### Does stopping the server delete my code?

No. Stopping the server only stops the running process. Your code files are unchanged and safe.

### Can I use port 3001 instead of 3000?

Yes. Set PORT environment variable:

```bash
PORT=3001 npm run dev              # macOS/Linux
set PORT=3001 & npm run dev        # Windows
```

Then stop with:
```bash
lsof -i :3001 | tail -1 | awk '{print $2}' | xargs kill -9
```

### Does stopping the server affect the backend?

No. The dev server (Next.js on port 3000) is separate from:
- Banking backend (Spring on port 8081)
- Database (MySQL)
- Any other services

Stopping the portal doesn't affect them.

---

**Happy stopping!** 🛑