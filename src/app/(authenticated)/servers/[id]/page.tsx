"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth";
import { useTranslation } from "@/contexts/language";
import { ServerPropertiesEditor } from "@/components/server/server-properties";
import { ServerSettings } from "@/components/server/server-settings";
import { FileExplorer } from "@/components/server/file-explorer";
import { ServerBackups } from "@/components/server/server-backups";
import { BackupScheduleManager } from "@/components/server/backup-schedule-manager";
import * as serverService from "@/services/server";
import type { MinecraftServer } from "@/types/server";
import { ServerStatus } from "@/types/server";
import styles from "./server-detail.module.css";

export default function ServerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [server, setServer] = useState<MinecraftServer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActioning, setIsActioning] = useState(false);

  // Get tab from URL params or default to "info"
  const tabFromUrl = searchParams.get("tab") as
    | "info"
    | "properties"
    | "settings"
    | "files"
    | "backups"
    | "schedule"
    | null;
  const [activeTab, setActiveTab] = useState<
    "info" | "properties" | "settings" | "files" | "backups" | "schedule"
  >(
    tabFromUrl &&
      [
        "info",
        "properties",
        "settings",
        "files",
        "backups",
        "schedule",
      ].includes(tabFromUrl)
      ? tabFromUrl
      : "info"
  );

  const serverId = parseInt(params.id as string);

  const loadServerData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await serverService.getServer(serverId);
    if (result.isOk()) {
      setServer(result.value);
    } else {
      if (result.error.status === 401) {
        logout();
        return;
      }
      if (result.error.status === 404) {
        setError(t("servers.serverNotFound"));
      } else {
        setError(result.error.message);
      }
    }
    setIsLoading(false);
  }, [serverId, logout, t]);

  // Function to update tab and URL
  const handleTabChange = (
    tab: "info" | "properties" | "settings" | "files" | "backups" | "schedule"
  ) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    router.replace(url.pathname + url.search, { scroll: false });
  };

  useEffect(() => {
    // Wait for auth loading to complete
    if (authLoading) return;

    if (!user) {
      router.push("/");
      return;
    }

    loadServerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId, user, router, authLoading]);

  const handleServerAction = async (action: "start" | "stop" | "restart") => {
    if (!server) return;

    setIsActioning(true);
    setError(null);

    try {
      let result;
      switch (action) {
        case "start":
          result = await serverService.startServer(server.id);
          break;
        case "stop":
          result = await serverService.stopServer(server.id);
          break;
        case "restart":
          result = await serverService.restartServer(server.id);
          break;
      }

      if (result.isOk()) {
        // Reload server data to get updated status
        await loadServerData();
      } else {
        if (result.error.status === 401) {
          logout();
          return;
        }
        setError(result.error.message);
      }
    } catch {
      setError(t("errors.operationFailed", { action }));
    } finally {
      setIsActioning(false);
    }
  };

  const handleDeleteServer = async () => {
    if (!server) return;

    if (!confirm(t("servers.deleteConfirmation"))) {
      return;
    }

    setIsActioning(true);
    const result = await serverService.deleteServer(server.id);

    if (result.isOk()) {
      router.push("/dashboard");
    } else {
      if (result.error.status === 401) {
        logout();
        return;
      }
      setError(result.error.message);
      setIsActioning(false);
    }
  };

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

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          {t("servers.loadingServerDetails")}
        </div>
      </div>
    );
  }

  if (error && !server) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>{t("errors.generic")}</h2>
          <p>{error}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className={styles.backButton}
          >
            {t("servers.backToDashboard")}
          </button>
        </div>
      </div>
    );
  }

  if (!server) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>{t("servers.serverNotFound")}</h2>
          <button
            onClick={() => router.push("/dashboard")}
            className={styles.backButton}
          >
            {t("servers.backToDashboard")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button
          onClick={() => router.push("/dashboard")}
          className={styles.backButton}
        >
          {t("servers.backToDashboard")}
        </button>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>{server.name}</h1>
          <span className={`${styles.status} ${getStatusColor(server.status)}`}>
            {getStatusText(server.status)}
          </span>
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          {error}
          <button
            onClick={() => setError(null)}
            className={styles.dismissButton}
          >
            ×
          </button>
        </div>
      )}

      <div className={styles.tabContainer}>
        <button
          className={`${styles.tab} ${activeTab === "info" ? styles.activeTab : ""}`}
          onClick={() => handleTabChange("info")}
        >
          {t("servers.information")}
        </button>
        <button
          className={`${styles.tab} ${activeTab === "settings" ? styles.activeTab : ""}`}
          onClick={() => handleTabChange("settings")}
        >
          {t("servers.settings.title")}
        </button>
        <button
          className={`${styles.tab} ${activeTab === "properties" ? styles.activeTab : ""}`}
          onClick={() => handleTabChange("properties")}
        >
          {t("servers.properties.title")}
        </button>
        <button
          className={`${styles.tab} ${activeTab === "files" ? styles.activeTab : ""}`}
          onClick={() => handleTabChange("files")}
        >
          {t("servers.files")}
        </button>
        <button
          className={`${styles.tab} ${activeTab === "backups" ? styles.activeTab : ""}`}
          onClick={() => handleTabChange("backups")}
        >
          {t("servers.backups")}
        </button>
        <button
          className={`${styles.tab} ${activeTab === "schedule" ? styles.activeTab : ""}`}
          onClick={() => handleTabChange("schedule")}
        >
          {t("servers.backupSchedule")}
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === "info" ? (
          <div className={styles.infoTabContent}>
            <div className={styles.infoSection}>
              <h2>{t("servers.serverInformation")}</h2>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.label}>
                    {t("servers.fields.version")}:
                  </span>
                  <span>{server.minecraft_version}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.label}>
                    {t("servers.fields.type")}:
                  </span>
                  <span className={styles.serverType}>
                    {server.server_type}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.label}>
                    {t("servers.fields.maxPlayers")}:
                  </span>
                  <span>{server.max_players}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.label}>
                    {t("servers.fields.memoryLimit")}:
                  </span>
                  <span>{server.max_memory}MB</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.label}>
                    {t("servers.fields.port")}:
                  </span>
                  <span>{server.port}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.label}>
                    {t("servers.fields.created")}:
                  </span>
                  <span>
                    {new Date(server.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              {server.description && (
                <div className={styles.description}>
                  <span className={styles.label}>
                    {t("servers.description")}:
                  </span>
                  <p>{server.description}</p>
                </div>
              )}
            </div>

            <div className={styles.actionsSection}>
              <h2>{t("servers.serverActions")}</h2>
              <div className={styles.actionButtons}>
                {(server.status === ServerStatus.STOPPED ||
                  server.status === ServerStatus.ERROR) && (
                  <button
                    onClick={() => handleServerAction("start")}
                    className={`${styles.actionButton} ${styles.startButton}`}
                    disabled={isActioning}
                  >
                    {isActioning
                      ? t("servers.actions.starting")
                      : t("servers.actions.start")}
                  </button>
                )}
                {(server.status === ServerStatus.RUNNING ||
                  server.status === ServerStatus.STARTING) && (
                  <button
                    onClick={() => handleServerAction("stop")}
                    className={`${styles.actionButton} ${styles.stopButton}`}
                    disabled={isActioning}
                  >
                    {isActioning
                      ? t("servers.actions.stopping")
                      : t("servers.actions.stop")}
                  </button>
                )}
                {server.status === ServerStatus.RUNNING && (
                  <button
                    onClick={() => handleServerAction("restart")}
                    className={`${styles.actionButton} ${styles.restartButton}`}
                    disabled={isActioning}
                  >
                    {isActioning
                      ? t("servers.actions.restarting")
                      : t("servers.actions.restart")}
                  </button>
                )}
                <button
                  onClick={handleDeleteServer}
                  className={`${styles.actionButton} ${styles.deleteButton}`}
                  disabled={isActioning}
                >
                  {isActioning
                    ? t("servers.actions.deleting")
                    : t("servers.actions.delete")}
                </button>
              </div>
            </div>
          </div>
        ) : activeTab === "settings" ? (
          <div className={styles.fullWidthTabContent}>
            <ServerSettings
              server={server}
              onUpdate={(updatedServer) => setServer(updatedServer)}
            />
          </div>
        ) : activeTab === "properties" ? (
          <div className={styles.fullWidthTabContent}>
            <ServerPropertiesEditor serverId={server.id} />
          </div>
        ) : activeTab === "files" ? (
          <div className={styles.fullWidthTabContent}>
            <FileExplorer serverId={server.id} />
          </div>
        ) : activeTab === "backups" ? (
          <div className={styles.fullWidthTabContent}>
            <ServerBackups serverId={server.id} />
          </div>
        ) : activeTab === "schedule" ? (
          <div className={styles.fullWidthTabContent}>
            <BackupScheduleManager serverId={server.id} userRole={user.role} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
