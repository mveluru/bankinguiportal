import type { NextConfig } from "next";

// The browser only calls this app's own /api/* route handlers, which forward to the banking service (BANKING_BACKEND_URL,
// read in lib/backend.ts), so there is nothing to proxy or rewrite here.
const nextConfig: NextConfig = {};

export default nextConfig;
