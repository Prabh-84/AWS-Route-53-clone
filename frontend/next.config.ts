import type { NextConfig } from "next";

// The /api/* -> BACKEND_URL forwarding lives in src/proxy.ts so it reads BACKEND_URL at runtime.
const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
