"use client";

import { useState, useCallback } from "react";
import { useConnection } from "@/contexts/connection";
import { useTranslation } from "@/contexts/language";
import styles from "./connection-warning-banner.module.css";

/**
 * Props for ConnectionWarningBanner
 */
interface ConnectionWarningBannerProps {
  /** Show banner for degraded connections */
  showOnDegraded?: boolean;
  /** Allow user to dismiss the banner */
  dismissible?: boolean;
  /** Auto-hide the banner after successful reconnection */
  autoHide?: boolean;
  /** Custom CSS class name */
  className?: string;
  /** Show detailed error information */
  showDetails?: boolean;
}

/**
 * Connection warning banner component
 * Shows a prominent warning when backend connection is lost or degraded
 */
export function ConnectionWarningBanner({
  showOnDegraded = true,
  dismissible = true,
  autoHide = true,
  className = "",
  showDetails = false,
}: ConnectionWarningBannerProps) {
  const { t } = useTranslation();
  const { state, checkConnection, isDown, isDegraded, isChecking } = useConnection();
  const [dismissed, setDismissed] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showDetailedInfo, setShowDetailedInfo] = useState(false);

  // Determine if banner should be visible
  const shouldShowBanner = !dismissed && (
    isDown || (showOnDegraded && isDegraded)
  );

  // Auto-hide when connection is restored
  if (autoHide && state.isConnected && !isDegraded && dismissed) {
    setDismissed(false);
  }

  // Handle retry connection
  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    try {
      await checkConnection();
    } finally {
      setIsRetrying(false);
    }
  }, [checkConnection]);

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  // Toggle details
  const toggleDetails = useCallback(() => {
    setShowDetailedInfo(prev => !prev);
  }, []);

  // Don't render if banner shouldn't be shown
  if (!shouldShowBanner) {
    return null;
  }

  // Get banner variant based on connection state
  const bannerVariant = isDown ? "error" : "warning";
  
  // Get appropriate title and description
  const title = t("connection.banner.title");
  const description = isDegraded 
    ? t("connection.banner.degradedDescription")
    : t("connection.banner.description");

  // Format downtime
  const formatDowntime = (downtime: number): string => {
    const seconds = Math.floor(downtime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const containerClasses = [
    styles.banner,
    styles[`variant-${bannerVariant}`],
    className,
  ].filter(Boolean).join(" ");

  return (
    <div className={containerClasses} role="alert" aria-live="polite">
      <div className={styles.content}>
        <div className={styles.icon}>
          {isDown ? "❌" : "⚠️"}
        </div>
        
        <div className={styles.message}>
          <div className={styles.title}>
            {title}
          </div>
          <div className={styles.description}>
            {description}
          </div>
          
          {state.downtime > 0 && (
            <div className={styles.downtime}>
              {t("connection.indicator.tooltip.downtime", { 
                duration: formatDowntime(state.downtime) 
              })}
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button
            className={`${styles.button} ${styles.retryButton}`}
            onClick={handleRetry}
            disabled={isRetrying || isChecking}
            aria-label={t("connection.actions.retryConnection")}
          >
            {isRetrying ? t("connection.banner.retrying") : t("connection.banner.retry")}
          </button>

          {showDetails && (
            <button
              className={`${styles.button} ${styles.detailsButton}`}
              onClick={toggleDetails}
              aria-expanded={showDetailedInfo}
              aria-label={showDetailedInfo ? t("connection.banner.hideDetails") : t("connection.banner.details")}
            >
              {showDetailedInfo ? t("connection.banner.hideDetails") : t("connection.banner.details")}
            </button>
          )}

          {dismissible && (
            <button
              className={`${styles.button} ${styles.dismissButton}`}
              onClick={handleDismiss}
              aria-label={t("connection.banner.dismiss")}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {showDetailedInfo && state.error && (
        <div className={styles.details}>
          <div className={styles.detailsTitle}>
            {t("errors.boundary.technicalDetails")}
          </div>
          <div className={styles.errorInfo}>
            <div>
              <strong>{t("errors.boundary.errorMessage")}:</strong> {state.error.message}
            </div>
            {state.error.endpoint && (
              <div>
                <strong>Endpoint:</strong> {state.error.endpoint}
              </div>
            )}
            {state.error.retryCount !== undefined && (
              <div>
                <strong>{t("errors.boundary.retryCount")}:</strong> {state.error.retryCount}
              </div>
            )}
            {state.lastCheck && (
              <div>
                <strong>{t("connection.indicator.tooltip.lastCheck")}:</strong>{" "}
                {new Intl.DateTimeFormat(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                }).format(state.lastCheck)}
              </div>
            )}
          </div>
          {state.error.suggestions && state.error.suggestions.length > 0 && (
            <div className={styles.suggestions}>
              <div className={styles.suggestionsTitle}>
                {t("connection.suggestions.checkServerRunning")}:
              </div>
              <ul className={styles.suggestionsList}>
                {state.error.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}