"use client";

import React from "react";
import { useTranslation } from "@/contexts/language";
import type { MinecraftServer } from "@/types/server";
import { ServerStatus } from "@/types/server";
import styles from "./ServerListItem.module.css";

export interface ServerListItemProps {
  server: MinecraftServer;
  isActioning: boolean;
  onStart: () => void;
  onStop: () => void;
  onClick: () => void;
}

export const ServerListItem = React.memo(function ServerListItem({
  server,
  isActioning,
  onStart,
  onStop,
  onClick,
}: ServerListItemProps) {
  const { t } = useTranslation();

  const getStatusColor = (status: ServerStatus) => {
    switch (status) {
      case ServerStatus.RUNNING:
        return styles.statusRunning;
      case ServerStatus.STOPPED:
        return styles.statusStopped;
      case ServerStatus.STARTING:
        return styles.statusStarting;
      case ServerStatus.STOPPING:
        return styles.statusStopping;
      case ServerStatus.ERROR:
        return styles.statusError;
      default:
        return styles.statusStopped;
    }
  };

  const getStatusText = (status: ServerStatus) => {
    switch (status) {
      case ServerStatus.RUNNING:
        return t("servers.status.running");
      case ServerStatus.STOPPED:
        return t("servers.status.stopped");
      case ServerStatus.STARTING:
        return t("servers.status.starting");
      case ServerStatus.STOPPING:
        return t("servers.status.stopping");
      case ServerStatus.ERROR:
        return t("servers.status.error");
      default:
        return t("servers.status.unknown");
    }
  };

  const getStatusIcon = (status: ServerStatus) => {
    switch (status) {
      case ServerStatus.RUNNING:
        return "🟢";
      case ServerStatus.STOPPED:
        return "🔴";
      case ServerStatus.STARTING:
        return "🟡";
      case ServerStatus.STOPPING:
        return "🟠";
      case ServerStatus.ERROR:
        return "❌";
      default:
        return "⚪";
    }
  };

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  const canStart = server.status === ServerStatus.STOPPED && !isActioning;
  const canStop = server.status === ServerStatus.RUNNING && !isActioning;
  const isTransitional =
    server.status === ServerStatus.STARTING ||
    server.status === ServerStatus.STOPPING;

  return (
    <div className={styles.card} onClick={onClick} data-testid="server-card">
      <div className={styles.header}>
        <h3 className={styles.name}>{server.name}</h3>
        <div className={`${styles.status} ${getStatusColor(server.status)}`}>
          <span
            className={styles.statusIndicator}
            data-testid="status-indicator"
          >
            {getStatusIcon(server.status)}
          </span>
          <span className={styles.statusText}>
            {getStatusText(server.status)}
          </span>
        </div>
      </div>

      {server.description && (
        <p className={styles.description}>{server.description}</p>
      )}

      <div className={styles.details}>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>
            {t("servers.details.version")}
          </span>
          <span className={styles.detailValue}>{server.minecraft_version}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>
            {t("servers.details.type")}
          </span>
          <span className={styles.detailValue}>{server.server_type}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>
            {t("servers.details.memory")}
          </span>
          <span className={styles.detailValue}>{server.max_memory}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>
            {t("servers.details.players")}
          </span>
          <span className={styles.detailValue}>{server.max_players}</span>
        </div>
      </div>

      <div className={styles.actions}>
        {canStart && (
          <button
            onClick={(e) => handleActionClick(e, onStart)}
            disabled={isActioning}
            className={`${styles.actionButton} ${styles.startButton}`}
          >
            {isActioning
              ? t("servers.actions.starting")
              : t("servers.actions.start")}
          </button>
        )}

        {canStop && (
          <button
            onClick={(e) => handleActionClick(e, onStop)}
            disabled={isActioning}
            className={`${styles.actionButton} ${styles.stopButton}`}
          >
            {isActioning
              ? t("servers.actions.stopping")
              : t("servers.actions.stop")}
          </button>
        )}

        {isTransitional && (
          <div className={styles.transitionalState}>
            <span className={styles.spinner} />
            <span>{getStatusText(server.status)}</span>
          </div>
        )}
      </div>
    </div>
  );
});
