import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable response caching for API routes that handle real-time data
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
};

export default nextConfig;
