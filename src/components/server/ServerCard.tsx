/**
 * Optimized server card component with React.memo
 * Renders individual server items in the server dashboard mobile card view
 */

"use client";

import React from "react";
import { useTranslation } from "@/contexts/language";
import type { MinecraftServer } from "@/types/server";
import { ServerStatus } from "@/types/server";
import styles from "./server-dashboard.module.css";

interface ServerCardProps {
  server: MinecraftServer;
  onStart: (serverId: number) => void;
  onStop: (serverId: number) => void;
  onRestart: (serverId: number) => void;
  onDelete: (serverId: number) => void;
  onManage: (serverId: number) => void;
}

/**
 * ServerCard Component - Memoized for performance optimization
 *
 * This component renders individual server items in the mobile card view.
 * It's wrapped with React.memo to prevent unnecessary re-renders when parent
 * component updates but this item's props haven't changed.
 */
export const ServerCard = React.memo<ServerCardProps>(function ServerCard({
  server,
  onStart,
  onStop,
  onRestart,
  onDelete,
  onManage,
}) {
  const { t } = useTranslation();

  const getStatusClass = (status: ServerStatus): string => {
    switch (status) {
      case ServerStatus.RUNNING:
        return styles.running || "";
      case ServerStatus.STOPPED:
        return styles.stopped || "";
      case ServerStatus.STARTING:
        return styles.starting || "";
      case ServerStatus.STOPPING:
        return styles.stopping || "";
      case ServerStatus.ERROR:
        return styles.error || "";
      default:
        return "";
    }
  };

  const getStatusText = (status: ServerStatus): string => {
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
        return status as string;
    }
  };

  const getServerTypeText = (type: string): string => {
    const key = `servers.type.${type}`;
    return t(key);
  };

  const getStatusIcon = (status: ServerStatus): string => {
    switch (status) {
      case ServerStatus.RUNNING:
        return "🟢";
      case ServerStatus.STOPPED:
        return "🔴";
      case ServerStatus.STARTING:
        return "🟡";
      case ServerStatus.STOPPING:
        return "🟡";
      case ServerStatus.ERROR:
        return "🔴";
      default:
        return "⚪";
    }
  };

  const canStart =
    server.status === ServerStatus.STOPPED ||
    server.status === ServerStatus.ERROR;
  const canStop = server.status === ServerStatus.RUNNING;
  const canRestart = server.status === ServerStatus.RUNNING;
  const isTransitioning =
    server.status === ServerStatus.STARTING ||
    server.status === ServerStatus.STOPPING;

  return (
    <div key={server.id} className={styles.serverCard}>
      <div className={styles.serverCardHeader}>
        <div className={styles.serverCardName}>
          <strong>{server.name}</strong>
        </div>
        <div className={styles.serverCardStatus}>
          <span className={styles.statusIcon}>
            {getStatusIcon(server.status)}
          </span>
          <span className={`${styles.status} ${getStatusClass(server.status)}`}>
            {getStatusText(server.status)}
          </span>
        </div>
      </div>

      {server.description && (
        <div className={styles.serverCardDescription}>{server.description}</div>
      )}

      <div className={styles.serverCardInfo}>
        <div className={styles.serverCardInfoItem}>
          <span className={styles.serverCardInfoLabel}>Version:</span>
          <span>{server.minecraft_version}</span>
        </div>
        <div className={styles.serverCardInfoItem}>
          <span className={styles.serverCardInfoLabel}>Type:</span>
          <span>{getServerTypeText(server.server_type)}</span>
        </div>
      </div>

      <div className={styles.serverCardActions}>
        {canStart && (
          <button
            onClick={() => onStart(server.id)}
            className={`${styles.actionButton} ${styles.start}`}
            disabled={isTransitioning}
          >
            {t("servers.start")}
          </button>
        )}
        {canStop && (
          <button
            onClick={() => onStop(server.id)}
            className={`${styles.actionButton} ${styles.stop}`}
            disabled={isTransitioning}
          >
            {t("servers.stop")}
          </button>
        )}
        {canRestart && (
          <button
            onClick={() => onRestart(server.id)}
            className={`${styles.actionButton} ${styles.restart}`}
            disabled={isTransitioning}
          >
            {t("servers.restart")}
          </button>
        )}
        <button
          onClick={() => onManage(server.id)}
          className={`${styles.actionButton} ${styles.manage}`}
        >
          {t("servers.manage")}
        </button>
        <button
          onClick={() => onDelete(server.id)}
          className={`${styles.actionButton} ${styles.delete}`}
        >
          {t("servers.delete")}
        </button>
      </div>
    </div>
  );
});

ServerCard.displayName = "ServerCard";
