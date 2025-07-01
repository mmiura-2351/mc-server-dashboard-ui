"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/contexts/language";
import { useServerList } from "../hooks/useServerList";
import { useServerFilters } from "../hooks/useServerFilters";
import { useServerActions } from "../hooks/useServerActions";
import { ServerList } from "./ServerList";
import { ServerFilters } from "./ServerFilters";
import { CreateServerModal } from "./CreateServerModal";
import { ImportServerModal } from "./ImportServerModal";
import type { CreateServerRequest, ServerImportRequest } from "@/types/server";
import styles from "./ServerDashboard.module.css";

export function ServerDashboard() {
  const { t } = useTranslation();
  const router = useRouter();

  // State for modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Custom hooks for server management
  const {
    servers,
    isLoading,
    error,
    refresh: refreshServers,
  } = useServerList();

  const {
    filteredServers,
    filters,
    hasActiveFilters,
    availableVersions,
    updateFilters,
    resetFilters,
  } = useServerFilters(servers);

  const {
    actioningServers,
    isSubmitting,
    startServer,
    stopServer,
    createServer,
    importServer,
  } = useServerActions();

  // Event handlers
  const handleServerClick = useCallback(
    (serverId: number) => {
      router.push(`/servers/${serverId}`);
    },
    [router]
  );

  const handleCreateServer = useCallback(
    async (data: CreateServerRequest) => {
      const result = await createServer(data);
      if (result.isOk()) {
        setShowCreateModal(false);
        await refreshServers();
      }
    },
    [createServer, refreshServers]
  );

  const handleImportServer = useCallback(
    async (data: ServerImportRequest) => {
      const result = await importServer(data);
      if (result.isOk()) {
        setShowImportModal(false);
        await refreshServers();
      }
    },
    [importServer, refreshServers]
  );

  const handleFilterChange = useCallback(
    (updates: Parameters<typeof updateFilters>[0]) => {
      updateFilters(updates);
    },
    [updateFilters]
  );

  const handleToggleFilters = useCallback(() => {
    setShowFilters((prev) => !prev);
  }, []);

  const handleResetFilters = useCallback(() => {
    resetFilters();
  }, [resetFilters]);

  const handleRefresh = useCallback(() => {
    refreshServers();
  }, [refreshServers]);

  const handleServerStart = useCallback(
    (serverId: number) => {
      startServer(serverId);
    },
    [startServer]
  );

  const handleServerStop = useCallback(
    (serverId: number) => {
      stopServer(serverId);
    },
    [stopServer]
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>{t("servers.dashboard.title")}</h1>
          <p className={styles.subtitle}>{t("servers.dashboard.subtitle")}</p>
        </div>

        <div className={styles.actions}>
          <button
            onClick={() => setShowCreateModal(true)}
            className={`${styles.actionButton} ${styles.createButton}`}
            disabled={isSubmitting}
          >
            <span className={styles.buttonIcon}>➕</span>
            {t("servers.actions.create")}
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className={`${styles.actionButton} ${styles.importButton}`}
            disabled={isSubmitting}
          >
            <span className={styles.buttonIcon}>📁</span>
            {t("servers.actions.import")}
          </button>
        </div>
      </div>

      <ServerFilters
        filters={filters}
        availableVersions={availableVersions}
        hasActiveFilters={hasActiveFilters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        showFilters={showFilters}
        onToggleFilters={handleToggleFilters}
        serverCount={servers.length}
        filteredCount={filteredServers.length}
      />

      <ServerList
        servers={filteredServers}
        isLoading={isLoading}
        error={error}
        actioningServers={actioningServers}
        onRefresh={handleRefresh}
        onServerStart={handleServerStart}
        onServerStop={handleServerStop}
        onServerClick={handleServerClick}
      />

      <CreateServerModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateServer}
        isSubmitting={isSubmitting}
      />

      <ImportServerModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSubmit={handleImportServer}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
