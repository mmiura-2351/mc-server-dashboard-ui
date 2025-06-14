import type { NextConfig } from "next";

// Get API URL from environment variables with fallback
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_DOMAIN = new URL(API_URL).host;
const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  /* Environment-aware security configuration */

  // Enable security headers (optimized for LAN access in development)
  async headers() {
    // Minimal security headers for development that don't interfere with LAN access
    if (isDevelopment) {
      return [
        {
          source: "/(.*)",
          headers: [
            // Basic XSS protection (doesn't affect network access)
            {
              key: "X-XSS-Protection",
              value: "1; mode=block",
            },
            // Prevent MIME type sniffing (safe for LAN access)
            {
              key: "X-Content-Type-Options",
              value: "nosniff",
            },
            // Allow same-origin framing for development tools
            {
              key: "X-Frame-Options",
              value: "SAMEORIGIN",
            },
          ],
        },
      ];
    }

    const commonHeaders = [
      // Prevent XSS attacks
      {
        key: "X-XSS-Protection",
        value: "1; mode=block",
      },
      // Prevent MIME type sniffing
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      // Referrer policy
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
    ];

    const productionHeaders = [
      // Prevent clickjacking (strict in production)
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
      // Force HTTPS in production only
      {
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains; preload",
      },
      // Permissions policy (disable dangerous features)
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
      },
      // Content Security Policy (restrictive for production)
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob:",
          "font-src 'self'",
          `connect-src 'self' ${API_URL} wss://${API_DOMAIN}`,
          "media-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'none'",
          "upgrade-insecure-requests",
        ].join("; "),
      },
    ];

    return [
      {
        // Apply to all routes
        source: "/(.*)",
        headers: [...commonHeaders, ...productionHeaders],
      },
    ];
  },

  // External packages configuration
  serverExternalPackages: [],

  // Disable powered by header
  poweredByHeader: false,

  // Enable compression for better performance
  compress: true,

  // Configure redirects for security
  async redirects() {
    return [
      // Redirect HTTP to HTTPS in production
      ...(isProduction
        ? [
            {
              source: "/(.*)",
              has: [
                {
                  type: "header",
                  key: "x-forwarded-proto",
                  value: "http",
                },
              ],
              destination: "https://mc-server-dashboard.example.com/$1",
              permanent: true,
            },
          ]
        : []),
    ];
  },

  // Configure rewrites for API proxy if needed
  async rewrites() {
    return [
      // Proxy API requests to backend in development
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

  // Webpack configuration for additional security
  webpack: (config, { isServer }) => {
    // Additional security configurations
    if (!isServer) {
      // Disable eval in production builds
      if (process.env.NODE_ENV === "production") {
        config.devtool = false;
      }
    }

    return config;
  },

  // Environment variables validation
  env: {
    // Ensure required environment variables are set
    NEXT_PUBLIC_API_URL: API_URL,
  },

  // Output configuration for static export security
  output: "standalone",

  // Image optimization security
  images: {
    domains: [], // No external domains allowed for security
    dangerouslyAllowSVG: false, // Block SVG images for security
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // TypeScript configuration for better security
  typescript: {
    // Type checking for build-time security
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    // Don't ignore lint errors in production
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
