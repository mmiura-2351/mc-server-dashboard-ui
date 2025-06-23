import type { NextConfig } from "next";

// Get API URL from environment variables with fallback
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  // Minimal security headers - most security is handled by nginx in production
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent MIME type sniffing
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Basic clickjacking protection
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
        ],
      },
    ];
  },

  // API proxy for development convenience
  async rewrites() {
    // Only proxy in development for easier local development
    const isDevelopment = process.env.NODE_ENV === "development";

    return [
      ...(isDevelopment
        ? [
            {
              source: "/api/v1/:path*",
              destination: `${API_URL}/api/v1/:path*`,
            },
          ]
        : []),
    ];
  },

  // Basic Next.js configuration
  poweredByHeader: false,
  compress: true,
  output: "standalone",

  // TypeScript and ESLint
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Image optimization
  images: {
    domains: [], // No external domains
    dangerouslyAllowSVG: false,
  },

  // Environment variables validation
  env: {
    NEXT_PUBLIC_API_URL: API_URL,
  },
};

export default nextConfig;
