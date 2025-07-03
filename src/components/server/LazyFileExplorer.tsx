/**
 * Lazy-loaded FileExplorer component
 * Improves initial bundle size by loading FileExplorer only when needed
 */

"use client";

import React, { lazy, Suspense } from "react";
import { LoadingFallback } from "@/components/ui";
import { ErrorBoundary } from "@/components/error/error-boundary";

// Lazy load the FileExplorer component
const FileExplorer = lazy(() =>
  import("./file-explorer/FileExplorer").then((module) => ({
    default: module.FileExplorer,
  }))
);

interface LazyFileExplorerProps {
  /** Server ID for file operations */
  serverId: number;
  /** Additional CSS classes */
  className?: string;
  /** Additional props to pass to FileExplorer */
  [key: string]: unknown;
}

/**
 * LazyFileExplorer Component
 *
 * A lazy-loaded wrapper for the FileExplorer component that:
 * - Reduces initial bundle size by code splitting
 * - Shows appropriate loading states
 * - Handles loading errors gracefully
 * - Maintains all FileExplorer functionality
 */
export const LazyFileExplorer: React.FC<LazyFileExplorerProps> = ({
  serverId,
  className,
  ...otherProps
}) => {
  return (
    <ErrorBoundary component="LazyFileExplorer">
      <div className={className}>
        <Suspense fallback={<LoadingFallback type="fileExplorer" />}>
          <FileExplorer serverId={serverId} {...otherProps} />
        </Suspense>
      </div>
    </ErrorBoundary>
  );
};

LazyFileExplorer.displayName = "LazyFileExplorer";
