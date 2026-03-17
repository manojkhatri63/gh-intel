import type { NextConfig } from "next";

function isLoopbackUrl(value: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(value);
}

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      return [];
    }

    const normalizedBackendUrl = backendUrl.replace(/\/+$/, '');

    // Safety guard for hosted deployments: never proxy to loopback hosts.
    if (process.env.NODE_ENV === 'production' && isLoopbackUrl(normalizedBackendUrl)) {
      return [];
    }

    return [
      {
        source: '/api/:path*',
        destination: `${normalizedBackendUrl}/api/:path*`
      }
    ];
  }
};

export default nextConfig;
