"use client";

import { useConnectionStatus } from "@/contexts/connection";
import { useTranslation } from "@/contexts/language";
import styles from "./connection-status-indicator.module.css";

/**
 * Props for ConnectionStatusIndicator
 */
interface ConnectionStatusIndicatorProps {
  /** Show detailed tooltip with additional information */
  showDetails?: boolean;
  /** Custom CSS class name */
  className?: string;
  /** Size variant */
  size?: "small" | "medium" | "large";
  /** Position of the indicator */
  position?: "inline" | "fixed";
}

/**
 * Connection status indicator component
 * Shows a visual indicator of the backend API connection status
 */
export function ConnectionStatusIndicator({
  showDetails = true,
  className = "",
  size = "medium",
  position = "inline",
}: ConnectionStatusIndicatorProps) {
  const { t } = useTranslation();
  const { color, text, downtime, error, lastCheck, lastSuccessfulConnection } = useConnectionStatus();

  // Format time for display
  const formatTime = (date: Date | null): string => {
    if (!date) return t("common.unknown");
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  // Build tooltip content
  const buildTooltip = (): string => {
    const parts: string[] = [];
    
    // Status
    const statusKey = `connection.status.${text.toLowerCase().replace(/\.\.\./g, '')}` as const;
    parts.push(t(statusKey));

    // Downtime
    if (downtime) {
      parts.push(t("connection.indicator.tooltip.downtime", { duration: downtime }));
    }

    // Last check
    if (lastCheck && showDetails) {
      parts.push(t("connection.indicator.tooltip.lastCheck", { time: formatTime(lastCheck) }));
    }

    // Last successful connection
    if (lastSuccessfulConnection && showDetails && downtime) {
      parts.push(t("connection.indicator.tooltip.lastSuccess", { time: formatTime(lastSuccessfulConnection) }));
    }

    // Error message
    if (error && showDetails) {
      parts.push(error.message);
    }

    return parts.join("\n");
  };

  // Get status icon
  const getStatusIcon = (): string => {
    switch (color) {
      case "green":
        return "🟢";
      case "yellow":
        return "🟡";
      case "red":
        return "🔴";
      default:
        return "⚪";
    }
  };

  const containerClasses = [
    styles.container,
    styles[`size-${size}`],
    styles[`position-${position}`],
    className,
  ].filter(Boolean).join(" ");

  const indicatorClasses = [
    styles.indicator,
    styles[`status-${color}`],
  ].filter(Boolean).join(" ");

  return (
    <div 
      className={containerClasses}
      title={buildTooltip()}
      role="status"
      aria-label={t("connection.indicator.tooltip.connected")}
    >
      <div className={indicatorClasses}>
        <span className={styles.icon} aria-hidden="true">
          {getStatusIcon()}
        </span>
        {size !== "small" && (
          <span className={styles.text}>
            {text}
          </span>
        )}
      </div>
      
      {showDetails && downtime && (
        <div className={styles.downtime}>
          {downtime}
        </div>
      )}
    </div>
  );
}