import type { NextConfig } from "next";

// Get API URL from environment variables with fallback
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_DOMAIN = new URL(API_URL).host;

import { getEnvironmentMode } from "./src/config/environment";

const nextConfig: NextConfig = {
  /* Environment-aware security configuration */

  // Enable security headers (optimized for LAN access in development)
  async headers() {
    const { isDevelopment } = getEnvironmentMode();

    // Check if enhanced security should be enabled
    const enableEnhancedSecurity =
      process.env.ENABLE_ENHANCED_SECURITY === "true";

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

    // Basic production headers (always applied in production)
    const basicProductionHeaders = [
      // Prevent clickjacking (configurable)
      {
        key: "X-Frame-Options",
        value: enableEnhancedSecurity ? "DENY" : "SAMEORIGIN",
      },
    ];

    // Enhanced security headers (only when explicitly enabled)
    const enhancedSecurityHeaders = [
      // Force HTTPS (only when enhanced security is enabled)
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
          `connect-src 'self' ${API_URL} ws://${API_DOMAIN} wss://${API_DOMAIN}`,
          "media-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'none'",
          ...(enableEnhancedSecurity ? ["upgrade-insecure-requests"] : []),
        ].join("; "),
      },
    ];

    // Determine which headers to apply
    const productionHeaders = [
      ...basicProductionHeaders,
      ...(enableEnhancedSecurity ? enhancedSecurityHeaders : []),
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
    const { isProduction } = getEnvironmentMode();

    // Only enable HTTPS redirect if explicitly configured
    const enableHttpsRedirect = process.env.ENABLE_HTTPS_REDIRECT === "true";
    const httpsHostname = process.env.HTTPS_HOSTNAME || "localhost:3000";

    return [
      // Redirect HTTP to HTTPS only when explicitly enabled
      ...(isProduction && enableHttpsRedirect
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
              destination: `https://${httpsHostname}/$1`,
              permanent: true,
            },
          ]
        : []),
    ];
  },

  // Configure rewrites for API proxy if needed
  async rewrites() {
    const { isDevelopment } = getEnvironmentMode();

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
