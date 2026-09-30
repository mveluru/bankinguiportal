import type { NextConfig } from "next";

const backend = process.env.BANKING_BACKEND_URL ?? "http://localhost:8081/brite";

const nextConfig: NextConfig = {
  // The backend only enables CORS for /bff/**, so account operations go through this same-origin proxy.
  async rewrites() {
    return [{ source: "/api/banking/:path*", destination: `${backend}/:path*` }];
  },
};

export default nextConfig;
