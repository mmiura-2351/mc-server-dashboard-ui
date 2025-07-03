/**
 * LoadingFallback component for lazy-loaded components
 * Provides customizable loading states with accessibility support
 */

"use client";

import React from "react";
import { useTranslation } from "@/contexts/language";
import styles from "./loading-fallback.module.css";

export interface LoadingFallbackProps {
  /** Custom loading message to display */
  message?: string;
  /** Translation key for loading message */
  translationKey?: string;
  /** Predefined loading type for common components */
  type?: "fileExplorer" | "serverDashboard" | "adminPanel" | "component";
  /** Visual variant of the loading spinner */
  variant?: "spinner" | "pulse" | "dots";
  /** Whether to display in fullscreen mode */
  fullscreen?: boolean;
  /** Whether to display in compact mode */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const typeTranslationKeys = {
  fileExplorer: "server.files.loading",
  serverDashboard: "server.dashboard.loading",
  adminPanel: "admin.loading",
  component: "common.loadingComponent",
} as const;

/**
 * LoadingFallback Component
 *
 * A reusable loading fallback component for lazy-loaded components.
 * Supports customizable messages, translations, and visual variants.
 */
export const LoadingFallback: React.FC<LoadingFallbackProps> = ({
  message,
  translationKey,
  type = "component",
  variant = "spinner",
  fullscreen = false,
  compact = false,
  className = "",
}) => {
  const { t } = useTranslation();

  // Determine the loading message to display
  const getLoadingMessage = (): string => {
    // Custom message has highest priority
    if (message) {
      return message;
    }

    // Translation key has second priority
    if (translationKey) {
      const translated = t(translationKey);
      if (translated && translated !== translationKey) {
        return translated;
      }
    }

    // Type-based translation has third priority
    if (type && typeTranslationKeys[type]) {
      const translated = t(typeTranslationKeys[type]);
      if (translated && translated !== typeTranslationKeys[type]) {
        return translated;
      }
    }

    // Fallback to default loading message
    return t("common.loading") || "Loading...";
  };

  const loadingText = getLoadingMessage();

  const containerClasses = [
    styles.container,
    fullscreen && styles.fullscreen,
    compact && styles.compact,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const spinnerClasses = [styles.spinner, styles[variant]]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClasses}>
      <div
        role="status"
        aria-live="polite"
        aria-label={loadingText}
        className={styles.loadingWrapper}
      >
        <div
          data-testid="loading-spinner"
          className={spinnerClasses}
          aria-hidden="true"
        />
        <span className={styles.loadingText}>{loadingText}</span>
      </div>
    </div>
  );
};

LoadingFallback.displayName = "LoadingFallback";
