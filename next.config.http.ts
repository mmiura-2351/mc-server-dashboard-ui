import type { NextConfig } from "next";

// Get API URL from environment variables with fallback
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  // Disable all security headers that force HTTPS
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Basic security headers that don't force HTTPS
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },

  // External packages configuration
  serverExternalPackages: [],

  // Disable powered by header
  poweredByHeader: false,

  // Enable compression for better performance
  compress: true,

  // No redirects to HTTPS
  async redirects() {
    return [];
  },

  // Configure rewrites for API proxy if needed
  async rewrites() {
    return [];
  },

  // Environment variables validation
  env: {
    NEXT_PUBLIC_API_URL: API_URL,
  },

  // Output configuration
  output: "standalone",

  // Image optimization
  images: {
    domains: [],
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
