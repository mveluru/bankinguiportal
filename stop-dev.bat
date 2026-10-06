@echo off
REM ################################################################
REM Brite Banking UI Portal - Development Server Stop Script
REM Platform: Windows (CMD)
REM
REM This script gracefully stops the development server running on port 3000.
REM It shows helpful information about what was stopped.
REM
REM Usage: stop-dev.bat
REM ################################################################

setlocal enabledelayedexpansion

REM ################################################################
REM Check if dev server is running on port 3000
REM ################################################################
echo.
echo [36m[36m[36mChecking for dev server on port 3000...[0m
echo.

REM Use netstat to find process on port 3000
for /f "tokens=5" %%A in ('netstat -ano ^| findstr :3000') do (
    set "PID=%%A"
)

if "!PID!"=="" (
    echo [33m[33mWARNING: No process found listening on port 3000[0m
    echo.
    echo   The development server is not running.
    echo.
    echo   To start it, run:
    echo     start-dev.bat
    echo.
    pause
    exit /b 0
)

REM ################################################################
REM Get process information
REM ################################################################
echo [32m[32mFOUND[0m process listening on port 3000
echo   PID: !PID!
echo.

REM ################################################################
REM Stop the process
REM ################################################################
echo [36m[36mStopping development server...[0m
echo.

REM Try to terminate the process gracefully
taskkill /PID !PID! /T 2>nul
if %errorlevel% equ 0 (
    echo   Sent termination signal to process !PID!

    REM Wait a moment for graceful shutdown
    timeout /t 2 /nobreak >nul

    REM Check if process still exists
    tasklist /FI "PID eq !PID!" 2>nul | findstr !PID! >nul
    if %errorlevel% neq 0 (
        echo.
        echo [32m[32mSUCCESS[0m Development server stopped gracefully
        echo.
        echo   ======================================================================
        echo.
        echo   Development Server Stopped
        echo.
        echo   Port 3000 is now available.
        echo.
        echo   To start again: start-dev.bat
        echo.
        echo   ======================================================================
        echo.
        pause
        exit /b 0
    ) else (
        REM Process still running, force kill
        echo [33m[33mWARNING: Graceful shutdown timed out. Force stopping...[0m
        taskkill /PID !PID! /F 2>nul
        if %errorlevel% equ 0 (
            echo.
            echo [32m[32mSUCCESS[0m Development server force stopped (FORCEKILL)
            echo   Port 3000 is now available.
            echo.
        ) else (
            echo.
            echo [31m[31mERROR[0m Failed to stop process !PID!
            echo   The process may require elevated permissions.
            echo.
            echo   Try opening Command Prompt as Administrator and run:
            echo     taskkill /PID !PID! /F
            echo.
            pause
            exit /b 1
        )
    )
) else (
    echo [31m[31mERROR[0m Failed to stop process !PID!
    echo   The process may require elevated permissions.
    echo.
    echo   Try opening Command Prompt as Administrator and run:
    echo     taskkill /PID !PID! /F
    echo.
    pause
    exit /b 1
)

echo.
echo [32m[32mSUCCESS[0m Port 3000 is now available
echo   To start the development server again, run:
echo     start-dev.bat
echo.
pause
