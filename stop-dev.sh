#!/bin/bash

#################################################################
# Brite Banking UI Portal - Development Server Stop Script
# Platform: macOS & Linux
#
# This script gracefully stops the development server running on port 3000.
# It shows helpful information about what was stopped.
#
# Usage: bash stop-dev.sh
#################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

#################################################################
# Check if dev server is running on port 3000
#################################################################
print_info "Checking for dev server on port 3000..."
echo ""

# Check if any process is listening on port 3000
if ! lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_warning "No process found listening on port 3000"
    echo ""
    echo "  The development server is not running."
    echo ""
    echo "  To start it, run:"
    echo "    bash start-dev.sh"
    echo ""
    exit 0
fi

# Get the PID and process information
PID=$(lsof -Pi :3000 -sTCP:LISTEN -t)
PROCESS_INFO=$(ps -p $PID -o comm= 2>/dev/null)

print_success "Found process listening on port 3000"
echo "  PID: $PID"
echo "  Process: $PROCESS_INFO"
echo ""

#################################################################
# Stop the process
#################################################################
print_info "Stopping development server..."
echo ""

# Attempt graceful kill first (SIGTERM)
if kill -TERM $PID 2>/dev/null; then
    echo "  Sent SIGTERM to process $PID"

    # Wait up to 5 seconds for graceful shutdown
    WAIT_TIME=0
    while [ $WAIT_TIME -lt 5 ]; do
        if ! kill -0 $PID 2>/dev/null; then
            # Process has stopped
            print_success "Development server stopped gracefully"
            echo ""
            echo "  ╔═══════════════════════════════════════════════════════════════╗"
            echo "  ║                                                               ║"
            echo "  ║   Development Server Stopped                                  ║"
            echo "  ║                                                               ║"
            echo "  ║   Port 3000 is now available.                                 ║"
            echo "  ║                                                               ║"
            echo "  ║   To start again: bash start-dev.sh                           ║"
            echo "  ║                                                               ║"
            echo "  ╚═══════════════════════════════════════════════════════════════╝"
            echo ""
            exit 0
        fi

        sleep 1
        WAIT_TIME=$((WAIT_TIME + 1))
    done

    # If graceful shutdown didn't work, force kill
    print_warning "Graceful shutdown timed out. Force stopping..."
    if kill -9 $PID 2>/dev/null; then
        print_success "Development server force stopped (SIGKILL)"
        echo ""
        echo "  The process was forcefully terminated."
        echo "  Port 3000 is now available."
        echo ""
    else
        print_error "Failed to stop process $PID"
        echo ""
        echo "  Try manually:"
        echo "    kill -9 $PID"
        echo ""
        exit 1
    fi
else
    print_error "Failed to send signal to process $PID"
    echo ""
    echo "  The process may require elevated permissions to stop."
    echo ""
    echo "  Try manually:"
    echo "    sudo kill -9 $PID"
    echo ""
    exit 1
fi

echo ""
print_success "Port 3000 is now available"
echo "  To start the development server again, run:"
echo "    bash start-dev.sh"
echo ""
