"use client";

import React from "react";
import { useTranslation } from "@/contexts/language";
import type { MinecraftServer } from "@/types/server";
import { ServerListItem } from "./ServerListItem";
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
      <div className={styles.header}>
        <h2 className={styles.title}>{t("servers.list.title")}</h2>
        <button onClick={onRefresh} className={styles.refreshButton}>
          {t("common.refresh")}
        </button>
      </div>

      <div className={styles.serverGrid}>
        {servers.map((server) => (
          <ServerListItem
            key={server.id}
            server={server}
            isActioning={actioningServers.has(server.id)}
            onStart={() => onServerStart(server.id)}
            onStop={() => onServerStop(server.id)}
            onClick={() => onServerClick(server.id)}
          />
        ))}
      </div>
    </div>
  );
}
