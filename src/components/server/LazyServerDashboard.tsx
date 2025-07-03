/**
 * Lazy-loaded ServerDashboard component
 * Improves initial bundle size by loading ServerDashboard only when needed
 */

"use client";

import React, { lazy, Suspense } from "react";
import { LoadingFallback } from "@/components/ui";
import { ErrorBoundary } from "@/components/error/error-boundary";

// Lazy load the ServerDashboard component
const ServerDashboard = lazy(() =>
  import("./server-dashboard").then((module) => ({
    default: module.ServerDashboard,
  }))
);

interface LazyServerDashboardProps {
  /** Additional CSS classes */
  className?: string;
  /** Additional props for future extensibility */
  [key: string]: unknown;
}

/**
 * LazyServerDashboard Component
 *
 * A lazy-loaded wrapper for the ServerDashboard component that:
 * - Reduces initial bundle size by code splitting
 * - Shows appropriate loading states
 * - Handles loading errors gracefully
 * - Maintains all ServerDashboard functionality
 */
export const LazyServerDashboard: React.FC<LazyServerDashboardProps> = ({
  className,
  ...otherProps
}) => {
  return (
    <ErrorBoundary component="LazyServerDashboard">
      <div className={className}>
        <Suspense fallback={<LoadingFallback type="serverDashboard" />}>
          <ServerDashboard {...otherProps} />
        </Suspense>
      </div>
    </ErrorBoundary>
  );
};

LazyServerDashboard.displayName = "LazyServerDashboard";
