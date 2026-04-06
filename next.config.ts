import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Proxy browser calls to FastAPI. Prefer BACKEND_URL in production so the
    // frontend origin is not confused with the API (avoids 404 on /reading).
    const backendUrl =
      process.env.BACKEND_URL?.trim() ||
      process.env.NEXT_PUBLIC_API_URL?.trim() ||
      "http://127.0.0.1:8000";
    return [
      {
        source: "/api/backend/:path*",
        destination: `${backendUrl}/:path*`, // Proxy to Backend
      },
    ];
  },
};

export default nextConfig;
