/**
 * Lazy-loaded AdminPanel component
 * Improves initial bundle size by loading UserManagement only when needed
 */

"use client";

import React, { lazy, Suspense } from "react";
import { LoadingFallback } from "@/components/ui";
import { ErrorBoundary } from "@/components/error/error-boundary";

// Lazy load the UserManagement component
const UserManagement = lazy(() =>
  import("./user-management").then((module) => ({
    default: module.UserManagement,
  }))
);

interface LazyAdminPanelProps {
  /** Additional CSS classes */
  className?: string;
  /** Additional props for future extensibility */
  [key: string]: unknown;
}

/**
 * LazyAdminPanel Component
 *
 * A lazy-loaded wrapper for the UserManagement component that:
 * - Reduces initial bundle size by code splitting
 * - Shows appropriate loading states for admin panel
 * - Handles loading errors gracefully
 * - Maintains all UserManagement functionality
 * - Only loads when admin users access the panel
 */
export const LazyAdminPanel: React.FC<LazyAdminPanelProps> = ({
  className,
  ...otherProps
}) => {
  return (
    <ErrorBoundary component="LazyAdminPanel">
      <div className={className}>
        <Suspense fallback={<LoadingFallback type="adminPanel" />}>
          <UserManagement {...otherProps} />
        </Suspense>
      </div>
    </ErrorBoundary>
  );
};

LazyAdminPanel.displayName = "LazyAdminPanel";
