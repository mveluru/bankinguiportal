#!/bin/bash

#################################################################
# Brite Banking UI Portal - Development Server Startup Script
# Platform: macOS & Linux
#
# This script sets up and starts the development server on http://localhost:3000
# It performs all prerequisite checks and shows any errors encountered.
#
# Usage: bash start-dev.sh
#################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
}

# Trap errors and show helpful message
trap 'print_error "Script failed. Check the error message above."; exit 1' ERR

#################################################################
# STEP 1: Check Node.js and npm versions
#################################################################
print_step "STEP 1: Checking Node.js and npm"

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 20.9 or newer."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm."
    exit 1
fi

NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)

echo "  Node.js: $NODE_VERSION"
echo "  npm: $NPM_VERSION"

# Check Node version is 20.9+
NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_MAJOR" -lt 20 ]; then
    print_error "Node.js version must be 20.9 or newer. You have $NODE_VERSION"
    exit 1
fi

print_success "Node.js and npm are installed"

#################################################################
# STEP 2: Check if in correct directory
#################################################################
print_step "STEP 2: Verifying project directory"

if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root directory."
    exit 1
fi

PROJECT_NAME=$(grep '"name"' package.json | head -1 | cut -d'"' -f4)
echo "  Project: $PROJECT_NAME"
print_success "Correct directory detected"

#################################################################
# STEP 3: Check if .env.local exists
#################################################################
print_step "STEP 3: Setting up environment variables"

if [ ! -f ".env.local" ]; then
    print_warning ".env.local not found. Creating from .env.local.brite template..."

    if [ ! -f ".env.local.brite" ]; then
        print_error ".env.local.brite template not found"
        exit 1
    fi

    cp .env.local.brite .env.local
    print_success "Created .env.local from template"
else
    print_success ".env.local already exists"
fi

# Show environment configuration
echo "  Environment variables loaded:"
grep "^[^#]" .env.local | head -5 | sed 's/^/    /'

#################################################################
# STEP 4: Install dependencies
#################################################################
print_step "STEP 4: Installing dependencies (npm ci)"

if [ -d "node_modules" ]; then
    print_warning "node_modules already exists. Skipping npm ci."
    echo "  If you want to reinstall, delete node_modules/ and run this script again."
else
    echo "  Installing exact versions from package-lock.json..."
    npm ci --silent
    print_success "Dependencies installed"
fi

PACKAGE_COUNT=$(ls node_modules | wc -l)
echo "  Installed packages: ~$PACKAGE_COUNT"

#################################################################
# STEP 5: Type check with TypeScript
#################################################################
print_step "STEP 5: Running TypeScript type check"

echo "  Running: npx tsc --noEmit"
if npx tsc --noEmit; then
    print_success "TypeScript type check passed (no errors)"
else
    print_error "TypeScript type check failed. Fix errors and retry."
    exit 1
fi

#################################################################
# STEP 6: Lint check with ESLint
#################################################################
print_step "STEP 6: Running ESLint"

echo "  Running: npx eslint ."
if npx eslint . 2>/dev/null; then
    print_success "ESLint passed (no errors)"
else
    print_warning "ESLint found some issues (may be non-blocking). Continuing..."
fi

#################################################################
# STEP 7: Check if port 3000 is available
#################################################################
print_step "STEP 7: Checking if port 3000 is available"

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    PID=$(lsof -Pi :3000 -sTCP:LISTEN -t)
    print_error "Port 3000 is already in use (PID: $PID)"
    echo "  To free it, run: kill $PID"
    echo "  Or use a different port: PORT=3001 npm run dev"
    exit 1
fi

print_success "Port 3000 is available"

#################################################################
# STEP 8: Check backend connectivity (optional)
#################################################################
print_step "STEP 8: Checking backend connectivity"

BACKEND_URL="http://banking.internal:8081/brite"
echo "  Checking backend at: $BACKEND_URL"

if timeout 2 curl -s "$BACKEND_URL" > /dev/null 2>&1; then
    print_success "Backend is reachable"
else
    print_warning "Backend at $BACKEND_URL is not reachable"
    echo "  This is OK for local testing. Sign-in will fail without a running backend."
    echo "  Start the banking backend on port 8081, or update BANKING_BACKEND_URL in .env.local"
fi

#################################################################
# STEP 9: Start the development server
#################################################################
print_step "STEP 9: Starting development server"

echo ""
echo "  ╔═══════════════════════════════════════════════════════════════╗"
echo "  ║                                                               ║"
echo "  ║   Development Server Starting on http://localhost:3000        ║"
echo "  ║                                                               ║"
echo "  ║   ✓ Hot reload enabled (changes auto-refresh)                 ║"
echo "  ║   ✓ TypeScript & ESLint checking enabled                      ║"
echo "  ║   ✓ Backend calls forwarded to: $BACKEND_URL ║"
echo "  ║                                                               ║"
echo "  ║   To stop: Press Ctrl+C                                       ║"
echo "  ║                                                               ║"
echo "  ╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Start the development server
npm run dev
