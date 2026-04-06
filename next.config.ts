import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Backend proxy is implemented in app/api/backend/[...path]/route.ts so
  // BACKEND_URL / NEXT_PUBLIC_API_URL are read at **runtime** on the server.
  // next.config rewrites only see env at build time, which breaks Vercel deploys.
};

export default nextConfig;
