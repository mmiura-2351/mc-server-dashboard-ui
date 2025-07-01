"use client";

import React from "react";
import { useTranslation } from "@/contexts/language";
import type { MinecraftServer } from "@/types/server";
import { ServerStatus } from "@/types/server";
import styles from "./ServerList.module.css";

export interface ServerListProps {
  servers: MinecraftServer[];
  isLoading: boolean;
  error: string | null;
  actioningServers: Set<number>;
  onRefresh: () => void;
  onServerStart: (serverId: number) => void;
  onServerStop: (serverId: number) => void;
  onServerClick: (serverId: number) => void;
}

export function ServerList({
  servers,
  isLoading,
  error,
  actioningServers,
  onRefresh,
  onServerStart,
  onServerStop,
  onServerClick,
}: ServerListProps) {
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

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>❌</div>
        <p className={styles.errorMessage}>{error}</p>
        <button onClick={onRefresh} className={styles.retryButton}>
          {t("common.retry")}
        </button>
      </div>
    );
  }

  if (servers.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>🏠</div>
        <h3>{t("servers.emptyState.title")}</h3>
        <p>{t("servers.emptyState.description")}</p>
        <button onClick={onRefresh} className={styles.refreshButton}>
          {t("common.refresh")}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.tableContainer}>
        <table className={styles.serverTable}>
          <thead>
            <tr>
              <th>{t("servers.fields.name")}</th>
              <th>{t("servers.fields.status")}</th>
              <th>{t("servers.fields.version")}</th>
              <th>{t("servers.fields.type")}</th>
              <th>{t("servers.fields.players")}</th>
              <th>{t("servers.fields.memory")}</th>
              <th>{t("servers.fields.port")}</th>
              <th>{t("servers.fields.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {servers.map((server) => {
              const isActioning = actioningServers.has(server.id);
              const canStart = server.status === ServerStatus.STOPPED && !isActioning;
              const canStop = server.status === ServerStatus.RUNNING && !isActioning;

              return (
                <tr 
                  key={server.id} 
                  className={styles.serverRow}
                  onClick={() => onServerClick(server.id)}
                >
                  <td className={styles.nameCell}>
                    <div className={styles.nameContainer}>
                      <span className={styles.serverName}>{server.name}</span>
                      {server.description && (
                        <span className={styles.serverDescription}>
                          {server.description}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className={`${styles.status} ${getStatusColor(server.status)}`}>
                      <span className={styles.statusDot}>●</span>
                      <span>{getStatusText(server.status)}</span>
                    </div>
                  </td>
                  <td>{server.minecraft_version}</td>
                  <td>
                    <span className={styles.serverType}>
                      {t(`servers.types.${server.server_type}`)}
                    </span>
                  </td>
                  <td>
                    <span className={styles.playersInfo}>
                      -{server.max_players}
                    </span>
                  </td>
                  <td>
                    <span className={styles.memoryInfo}>
                      {server.max_memory}MB
                    </span>
                  </td>
                  <td>{server.port}</td>
                  <td className={styles.actionsCell}>
                    <div className={styles.actionButtons}>
                      {canStart && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onServerStart(server.id);
                          }}
                          className={`${styles.actionButton} ${styles.startButton}`}
                          disabled={isActioning}
                        >
                          ▶
                        </button>
                      )}
                      {canStop && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onServerStop(server.id);
                          }}
                          className={`${styles.actionButton} ${styles.stopButton}`}
                          disabled={isActioning}
                        >
                          ⏹
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onServerClick(server.id);
                        }}
                        className={`${styles.actionButton} ${styles.settingsButton}`}
                        title={t("servers.actions.settings")}
                      >
                        ⚙
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle delete action
                        }}
                        className={`${styles.actionButton} ${styles.deleteButton}`}
                        title={t("servers.actions.delete")}
                      >
                        −
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
