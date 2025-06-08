"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth";
import { MainLayout } from "@/components/layout/main-layout";
import { ServerPropertiesEditor } from "@/components/server/server-properties";
import * as serverService from "@/services/server";
import type { MinecraftServer } from "@/types/server";
import { ServerStatus } from "@/types/server";
import styles from "./server-detail.module.css";

export default function ServerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [server, setServer] = useState<MinecraftServer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActioning, setIsActioning] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "properties">("info");

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
        setError("Server not found");
      } else {
        setError(result.error.message);
      }
    }
    setIsLoading(false);
  }, [serverId, logout]);

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }

    loadServerData();
  }, [serverId, user, router, loadServerData]);

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
      setError(`Failed to ${action} server`);
    } finally {
      setIsActioning(false);
    }
  };

  const handleDeleteServer = async () => {
    if (!server) return;

    if (
      !confirm(
        "Are you sure you want to delete this server? This action cannot be undone."
      )
    ) {
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
        return "Running";
      case ServerStatus.STOPPED:
        return "Stopped";
      case ServerStatus.STARTING:
        return "Starting...";
      case ServerStatus.STOPPING:
        return "Stopping...";
      case ServerStatus.ERROR:
        return "Error";
      default:
        return "Unknown";
    }
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <MainLayout>
        <div className={styles.container}>
          <div className={styles.loading}>Loading server details...</div>
        </div>
      </MainLayout>
    );
  }

  if (error && !server) {
    return (
      <MainLayout>
        <div className={styles.container}>
          <div className={styles.error}>
            <h2>Error</h2>
            <p>{error}</p>
            <button
              onClick={() => router.push("/dashboard")}
              className={styles.backButton}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!server) {
    return (
      <MainLayout>
        <div className={styles.container}>
          <div className={styles.error}>
            <h2>Server not found</h2>
            <button
              onClick={() => router.push("/dashboard")}
              className={styles.backButton}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <button
            onClick={() => router.push("/dashboard")}
            className={styles.backButton}
          >
            ← Back to Dashboard
          </button>
          <div className={styles.titleSection}>
            <h1 className={styles.title}>{server.name}</h1>
            <span
              className={`${styles.status} ${getStatusColor(server.status)}`}
            >
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
            onClick={() => setActiveTab("info")}
          >
            Information
          </button>
          <button
            className={`${styles.tab} ${activeTab === "properties" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("properties")}
          >
            Properties
          </button>
        </div>

        <div className={styles.content}>
          {activeTab === "info" ? (
            <>
              <div className={styles.infoSection}>
                <h2>Server Information</h2>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Minecraft Version:</span>
                    <span>{server.minecraft_version}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Server Type:</span>
                    <span className={styles.serverType}>
                      {server.server_type}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Max Players:</span>
                    <span>{server.max_players}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Memory Limit:</span>
                    <span>{server.max_memory}MB</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Port:</span>
                    <span>{server.port}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Created:</span>
                    <span>
                      {new Date(server.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {server.description && (
                  <div className={styles.description}>
                    <span className={styles.label}>Description:</span>
                    <p>{server.description}</p>
                  </div>
                )}
              </div>

              <div className={styles.actionsSection}>
                <h2>Server Actions</h2>
                <div className={styles.actionButtons}>
                  {(server.status === ServerStatus.STOPPED ||
                    server.status === ServerStatus.ERROR) && (
                    <button
                      onClick={() => handleServerAction("start")}
                      className={`${styles.actionButton} ${styles.startButton}`}
                      disabled={isActioning}
                    >
                      {isActioning ? "Starting..." : "Start Server"}
                    </button>
                  )}
                  {(server.status === ServerStatus.RUNNING ||
                    server.status === ServerStatus.STARTING) && (
                    <button
                      onClick={() => handleServerAction("stop")}
                      className={`${styles.actionButton} ${styles.stopButton}`}
                      disabled={isActioning}
                    >
                      {isActioning ? "Stopping..." : "Stop Server"}
                    </button>
                  )}
                  {server.status === ServerStatus.RUNNING && (
                    <button
                      onClick={() => handleServerAction("restart")}
                      className={`${styles.actionButton} ${styles.restartButton}`}
                      disabled={isActioning}
                    >
                      {isActioning ? "Restarting..." : "Restart Server"}
                    </button>
                  )}
                  <button
                    onClick={handleDeleteServer}
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    disabled={isActioning}
                  >
                    {isActioning ? "Deleting..." : "Delete Server"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <ServerPropertiesEditor serverId={server.id} />
          )}
        </div>
      </div>
    </MainLayout>
  );
}
