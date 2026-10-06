@echo off
REM ################################################################
REM Brite Banking UI Portal - Development Server Startup Script
REM Platform: Windows (CMD)
REM
REM This script sets up and starts the development server on http://localhost:3000
REM It performs all prerequisite checks and shows any errors encountered.
REM
REM Usage: start-dev.bat
REM ################################################################

setlocal enabledelayedexpansion

REM Color codes (using default console colors)
REM Note: Windows CMD has limited color support
set BLUE=[36m
set GREEN=[32m
set RED=[31m
set YELLOW=[33m
set NC=[0m

REM ################################################################
REM STEP 1: Check Node.js and npm versions
REM ################################################################
echo.
echo [36m[36mSTEP 1: Checking Node.js and npm[0m
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [31m[31mERROR: Node.js is not installed. Please install Node.js 20.9 or newer.[0m
    echo Visit: https://nodejs.org/
    pause
    exit /b 1
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [31m[31mERROR: npm is not installed. Please install npm.[0m
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i

echo   Node.js: %NODE_VERSION%
echo   npm: %NPM_VERSION%

echo [32m[32mCHECK PASSED[0m Node.js and npm are installed
echo.

REM ################################################################
REM STEP 2: Check if in correct directory
REM ################################################################
echo [36m[36mSTEP 2: Verifying project directory[0m
echo.

if not exist "package.json" (
    echo [31m[31mERROR: package.json not found. Run this script from the project root directory.[0m
    pause
    exit /b 1
)

for /f "tokens=2 delims=: " %%i in ('findstr "\"name\"" package.json ^| findstr /v "^$" ^| findstr /m .*') do set PROJECT_NAME=%%i
set PROJECT_NAME=%PROJECT_NAME:"=%

echo   Project: %PROJECT_NAME%
echo [32m[32mCHECK PASSED[0m Correct directory detected
echo.

REM ################################################################
REM STEP 3: Check if .env.local exists
REM ################################################################
echo [36m[36mSTEP 3: Setting up environment variables[0m
echo.

if not exist ".env.local" (
    echo [33m[33mWARNING: .env.local not found. Creating from .env.local.brite template...[0m

    if not exist ".env.local.brite" (
        echo [31m[31mERROR: .env.local.brite template not found[0m
        pause
        exit /b 1
    )

    copy .env.local.brite .env.local >nul
    echo [32m[32mCREATED[0m .env.local from template
) else (
    echo [32m[32mCHECK PASSED[0m .env.local already exists
)

echo   Environment variables configured
echo.

REM ################################################################
REM STEP 4: Install dependencies
REM ################################################################
echo [36m[36mSTEP 4: Installing dependencies (npm ci)[0m
echo.

if exist "node_modules" (
    echo [33m[33mWARNING: node_modules already exists. Skipping npm ci.[0m
    echo   If you want to reinstall, delete node_modules\ and run this script again.
) else (
    echo   Installing exact versions from package-lock.json...
    call npm ci --silent
    if %errorlevel% neq 0 (
        echo [31m[31mERROR: npm ci failed[0m
        pause
        exit /b 1
    )
    echo [32m[32mCHECK PASSED[0m Dependencies installed
)
echo.

REM ################################################################
REM STEP 5: Type check with TypeScript
REM ################################################################
echo [36m[36mSTEP 5: Running TypeScript type check[0m
echo.

echo   Running: npx tsc --noEmit
call npx tsc --noEmit
if %errorlevel% neq 0 (
    echo [31m[31mERROR: TypeScript type check failed. Fix errors and retry.[0m
    pause
    exit /b 1
)
echo [32m[32mCHECK PASSED[0m TypeScript type check passed ^(no errors^)
echo.

REM ################################################################
REM STEP 6: Lint check with ESLint
REM ################################################################
echo [36m[36mSTEP 6: Running ESLint[0m
echo.

echo   Running: npx eslint .
call npx eslint . 2>nul
if %errorlevel% neq 0 (
    echo [33m[33mWARNING: ESLint found some issues ^(may be non-blocking^). Continuing...[0m
) else (
    echo [32m[32mCHECK PASSED[0m ESLint passed ^(no errors^)
)
echo.

REM ################################################################
REM STEP 7: Check if port 3000 is available
REM ################################################################
echo [36m[36mSTEP 7: Checking if port 3000 is available[0m
echo.

netstat -ano | find ":3000" >nul 2>nul
if %errorlevel% equ 0 (
    echo [31m[31mERROR: Port 3000 is already in use[0m
    echo   Run: netstat -ano ^| findstr :3000  (to find the PID)
    echo   Then: taskkill /PID [PID] /F  (to free the port)
    echo   Or use: set PORT=3001 ^& npm run dev
    pause
    exit /b 1
)

echo [32m[32mCHECK PASSED[0m Port 3000 is available
echo.

REM ################################################################
REM STEP 8: Check backend connectivity (optional)
REM ################################################################
echo [36m[36mSTEP 8: Checking backend connectivity[0m
echo.

set BACKEND_URL=http://banking.internal:8081/brite
echo   Checking backend at: %BACKEND_URL%

curl -s "%BACKEND_URL%" >nul 2>&1
if %errorlevel% neq 0 (
    echo [33m[33mWARNING: Backend at %BACKEND_URL% is not reachable[0m
    echo   This is OK for local testing. Sign-in will fail without a running backend.
    echo   Start the banking backend on port 8081, or update BANKING_BACKEND_URL in .env.local
) else (
    echo [32m[32mCHECK PASSED[0m Backend is reachable
)
echo.

REM ################################################################
REM STEP 9: Start the development server
REM ################################################################
echo [36m[36mSTEP 9: Starting development server[0m
echo.

echo.
echo   ======================================================================
echo.
echo   Development Server Starting on http://localhost:3000
echo.
echo   - Hot reload enabled (changes auto-refresh)
echo   - TypeScript and ESLint checking enabled
echo   - Backend calls forwarded to: %BACKEND_URL%
echo.
echo   To stop: Press Ctrl+C
echo.
echo   ======================================================================
echo.
echo.

REM Start the development server
call npm run dev

REM If npm run dev exits, offer to stay open for reading error messages
if %errorlevel% neq 0 (
    echo.
    echo [31m[31mDEVELOPMENT SERVER STOPPED WITH ERROR[0m
    echo   Check the error message above for details.
    echo.
    pause
    exit /b 1
)