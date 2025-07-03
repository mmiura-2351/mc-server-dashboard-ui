/**
 * Optimized server table row component with React.memo
 * Renders individual server items in the server dashboard table view
 */

"use client";

import React from "react";
import { useTranslation } from "@/contexts/language";
import type { MinecraftServer } from "@/types/server";
import { ServerStatus } from "@/types/server";
import styles from "./server-dashboard.module.css";

interface ServerTableRowProps {
  server: MinecraftServer;
  onStart: (serverId: number) => void;
  onStop: (serverId: number) => void;
  onRestart: (serverId: number) => void;
  onDelete: (serverId: number) => void;
  onManage: (serverId: number) => void;
}

/**
 * ServerTableRow Component - Memoized for performance optimization
 *
 * This component renders individual server items in the table view.
 * It's wrapped with React.memo to prevent unnecessary re-renders when parent
 * component updates but this item's props haven't changed.
 */
export const ServerTableRow = React.memo<ServerTableRowProps>(
  function ServerTableRow({
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

    const formatPlayerCount = (): string => {
      const currentPlayers = server.process_info?.players || 0;
      return `${currentPlayers}/${server.max_players} ${t("servers.players")}`;
    };

    const formatMemoryUsage = (): string => {
      const currentMemory = server.process_info?.memory_usage || 0;
      return `${currentMemory}/${server.max_memory} ${t("servers.memory")}`;
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
      <tr key={server.id} className={styles.serverRow}>
        <td>
          <div className={styles.serverName}>
            <strong>{server.name}</strong>
            {server.description && (
              <div className={styles.serverDescription}>
                {server.description}
              </div>
            )}
          </div>
        </td>
        <td>
          <span className={`${styles.status} ${getStatusClass(server.status)}`}>
            {getStatusText(server.status)}
          </span>
        </td>
        <td>{server.minecraft_version}</td>
        <td>{getServerTypeText(server.server_type)}</td>
        <td>{formatPlayerCount()}</td>
        <td>{formatMemoryUsage()}</td>
        <td>{server.port}</td>
        <td>
          <div className={styles.actions}>
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
        </td>
      </tr>
    );
  }
);

ServerTableRow.displayName = "ServerTableRow";
