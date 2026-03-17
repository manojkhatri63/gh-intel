import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      return [];
    }

    const normalizedBackendUrl = backendUrl.replace(/\/+$/, '');
    return [
      {
        source: '/api/:path*',
        destination: `${normalizedBackendUrl}/api/:path*`
      }
    ];
  }
};

export default nextConfig;
