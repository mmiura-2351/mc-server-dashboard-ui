"use client";

import { useState, useEffect, useCallback } from "react";
import type { Result } from "neverthrow";
import { useAuth } from "@/contexts/auth";
import * as serverService from "@/services/server";
import type {
  MinecraftServer,
  ServerTemplate,
  CreateServerRequest,
} from "@/types/server";
import { ServerType, ServerStatus, MINECRAFT_VERSIONS } from "@/types/server";
import type { AuthError } from "@/types/auth";
import styles from "./server-dashboard.module.css";

export function ServerDashboard() {
  const { user, logout } = useAuth();
  const [servers, setServers] = useState<MinecraftServer[]>([]);
  const [, setTemplates] = useState<ServerTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedServer, setSelectedServer] = useState<MinecraftServer | null>(
    null
  );
  const [actioningServers, setActioningServers] = useState<Set<number>>(
    new Set()
  );
  const [isCreating, setIsCreating] = useState(false);

  // Create server form
  const [createForm, setCreateForm] = useState<CreateServerRequest>({
    name: "",
    minecraft_version: "1.21.5",
    server_type: ServerType.VANILLA,
    max_memory: 2048,
    description: "",
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Debug authentication status (development only)
    if (process.env.NODE_ENV === "development") {
      const token = localStorage.getItem("access_token");
      console.log("[DEBUG] Loading servers - Token exists:", !!token);
      console.log("[DEBUG] User:", user);
    }

    try {
      const [serversResult, templatesResult] = await Promise.all([
        serverService.getServers(),
        serverService.getServerTemplates(),
      ]);

      if (serversResult.isOk()) {
        setServers(serversResult.value);
      } else {
        // Handle authentication errors
        if (serversResult.error.status === 401) {
          logout();
          return;
        }
        setError(serversResult.error.message);
      }

      if (templatesResult.isOk()) {
        setTemplates(templatesResult.value);
      }
    } catch {
      setError("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [user, logout]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    // Debug authentication status before creating server (development only)
    if (process.env.NODE_ENV === "development") {
      const token = localStorage.getItem("access_token");
      console.log("[DEBUG] Creating server - Token exists:", !!token);
      console.log("[DEBUG] Form data:", createForm);
    }

    const result = await serverService.createServer(createForm);
    if (result.isOk()) {
      setServers([...servers, result.value]);
      setShowCreateModal(false);
      setCreateForm({
        name: "",
        minecraft_version: "1.21.5",
        server_type: ServerType.VANILLA,
        max_memory: 2048,
        description: "",
      });
    } else {
      // Handle authentication errors
      if (result.error.status === 401) {
        logout();
        return;
      }
      setError(result.error.message);
    }
    setIsCreating(false);
  };

  // Update individual server status
  const updateServerStatus = async (serverId: number) => {
    const statusResult = await serverService.getServerStatus(serverId);
    if (statusResult.isOk()) {
      const { status } = statusResult.value;
      setServers((prevServers) =>
        prevServers.map((server) =>
          server.id === serverId ? { ...server, status } : server
        )
      );
      return status;
    }
    return null;
  };

  // Poll server status until it reaches a stable state
  const pollServerStatus = async (
    serverId: number,
    expectedStates: string[]
  ) => {
    const maxAttempts = 30; // 30 seconds max
    let attempts = 0;

    const poll = async (): Promise<void> => {
      attempts++;
      const status = await updateServerStatus(serverId);

      if (status && expectedStates.includes(status)) {
        // Reached expected state, remove from actioning servers
        setActioningServers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(serverId);
          return newSet;
        });
        return;
      }

      if (attempts < maxAttempts) {
        setTimeout(poll, 1000); // Poll every second
      } else {
        // Timeout reached, remove from actioning servers
        setActioningServers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(serverId);
          return newSet;
        });
      }
    };

    await poll();
  };

  const handleServerAction = async (
    serverId: number,
    action: "start" | "stop" | "delete"
  ) => {
    setActioningServers((prev) => new Set(prev).add(serverId));
    setError(null);

    try {
      let result;

      // Handle delete action separately (with confirmation)
      if (action === "delete") {
        if (
          !confirm(
            "Are you sure you want to delete this server? This action cannot be undone."
          )
        ) {
          setActioningServers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(serverId);
            return newSet;
          });
          return;
        }
        result = await serverService.deleteServer(serverId);
      } else {
        // Handle start/stop with timeout
        const operationPromise =
          action === "start"
            ? serverService.startServer(serverId)
            : serverService.stopServer(serverId);

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Operation timeout")), 30000);
        });

        try {
          result = await Promise.race([operationPromise, timeoutPromise]);
        } catch {
          // Create a proper Result type for timeout errors
          result = {
            isOk: () => false,
            isErr: () => true,
            error: {
              message:
                "操作がタイムアウトしました。サーバーの状態を確認してください。",
            },
          } as Result<void, AuthError>;
        }
      }

      if (result.isOk()) {
        if (action === "delete") {
          setServers(servers.filter((s) => s.id !== serverId));
        } else {
          // Immediately update to intermediate state
          const intermediateStatus =
            action === "start" ? ServerStatus.STARTING : ServerStatus.STOPPING;
          setServers((prevServers) =>
            prevServers.map((server) =>
              server.id === serverId
                ? { ...server, status: intermediateStatus }
                : server
            )
          );

          // Start polling for final state
          const expectedStates =
            action === "start"
              ? [ServerStatus.RUNNING, ServerStatus.ERROR]
              : [ServerStatus.STOPPED, ServerStatus.ERROR];

          // Don't await here to avoid blocking the UI
          pollServerStatus(serverId, expectedStates);
        }
      } else {
        // Handle authentication errors
        if (result.error.status === 401) {
          logout();
          return;
        }

        // Add more context to the error message
        const actionText =
          action === "start" ? "start" : action === "stop" ? "stop" : "delete";
        let errorMessage = `Failed to ${actionText} server: ${result.error.message}`;

        // Handle specific error cases for server operations
        if (result.error.status === 409) {
          if (action === "start") {
            errorMessage = "サーバーは既に起動しているか、起動処理中です。";
          } else if (action === "stop") {
            errorMessage = "サーバーは既に停止しているか、停止処理中です。";
          }
        } else if (result.error.status === 404) {
          errorMessage = "サーバーが見つかりません。ページを更新してください。";
        }

        // Debug logging for server action errors
        if (process.env.NODE_ENV === "development") {
          console.log(
            "[DEBUG] Server action failed:",
            action,
            "Server ID:",
            serverId
          );
          console.log("[DEBUG] Error details:", result.error);
        }

        setError(errorMessage);

        // If it's a state conflict, refresh the server data to show current state
        if (result.error.status === 409) {
          await updateServerStatus(serverId);
        }
      }
    } catch {
      setError("Action failed");
    } finally {
      setActioningServers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(serverId);
        return newSet;
      });
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

  return (
    <div className={styles.container}>
      <div className={styles.containerHeader}>
        <h1 className={styles.title}>Minecraft Servers</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className={styles.createButton}
          disabled={isCreating}
        >
          Create Server
        </button>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
          <button
            onClick={() => setError(null)}
            className={styles.dismissButton}
          >
            ×
          </button>
        </div>
      )}

      {isLoading && servers.length === 0 ? (
        <div className={styles.loading}>Loading servers...</div>
      ) : (
        <>
          {servers.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>No servers found</h3>
              <p>Create your first Minecraft server to get started!</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className={styles.createButton}
              >
                Create Server
              </button>
            </div>
          ) : (
            <div className={styles.serverGrid}>
              {servers.map((server) => (
                <div key={server.id} className={styles.serverCard}>
                  <div className={styles.serverHeader}>
                    <h3 className={styles.serverName}>{server.name}</h3>
                    <span
                      className={`${styles.status} ${getStatusColor(server.status)}`}
                    >
                      {getStatusText(server.status)}
                    </span>
                  </div>

                  <div className={styles.serverInfo}>
                    <div className={styles.infoRow}>
                      <span className={styles.label}>Version:</span>
                      <span>{server.minecraft_version}</span>
                    </div>
                    <div className={styles.infoRow}>
                      <span className={styles.label}>Type:</span>
                      <span className={styles.serverType}>
                        {server.server_type}
                      </span>
                    </div>
                    <div className={styles.infoRow}>
                      <span className={styles.label}>Players:</span>
                      <span>0/{server.max_players}</span>
                    </div>
                    <div className={styles.infoRow}>
                      <span className={styles.label}>Memory:</span>
                      <span>{server.max_memory}MB</span>
                    </div>
                    <div className={styles.infoRow}>
                      <span className={styles.label}>Port:</span>
                      <span>{server.port}</span>
                    </div>
                  </div>

                  {server.description && (
                    <p className={styles.serverDescription}>
                      {server.description}
                    </p>
                  )}

                  <div className={styles.serverActions}>
                    {(server.status === ServerStatus.STOPPED ||
                      server.status === ServerStatus.ERROR) && (
                      <button
                        onClick={() => handleServerAction(server.id, "start")}
                        className={`${styles.actionButton} ${styles.startButton}`}
                        disabled={actioningServers.has(server.id)}
                      >
                        {actioningServers.has(server.id)
                          ? "Starting..."
                          : "Start"}
                      </button>
                    )}
                    {(server.status === ServerStatus.RUNNING ||
                      server.status === ServerStatus.STARTING) && (
                      <button
                        onClick={() => handleServerAction(server.id, "stop")}
                        className={`${styles.actionButton} ${styles.stopButton}`}
                        disabled={actioningServers.has(server.id)}
                      >
                        {actioningServers.has(server.id)
                          ? "Stopping..."
                          : "Stop"}
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedServer(server)}
                      className={`${styles.actionButton} ${styles.manageButton}`}
                    >
                      Manage
                    </button>
                    <button
                      onClick={() => handleServerAction(server.id, "delete")}
                      className={`${styles.actionButton} ${styles.deleteButton}`}
                      disabled={actioningServers.has(server.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Server Modal */}
      {showCreateModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Create New Server</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className={styles.closeButton}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateServer} className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="serverName">Server Name</label>
                <input
                  id="serverName"
                  type="text"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                  required
                  placeholder="My Minecraft Server"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="serverVersion">Minecraft Version</label>
                <select
                  id="serverVersion"
                  value={createForm.minecraft_version}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      minecraft_version: e.target.value,
                    })
                  }
                >
                  {MINECRAFT_VERSIONS.map((version) => (
                    <option key={version} value={version}>
                      {version}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="serverType">Server Type</label>
                <select
                  id="serverType"
                  value={createForm.server_type}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      server_type: e.target.value as ServerType,
                    })
                  }
                >
                  <option value={ServerType.VANILLA}>Vanilla</option>
                  <option value={ServerType.PAPER}>Paper</option>
                  <option value={ServerType.FORGE}>Forge</option>
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="serverMemory">Memory (MB)</label>
                <select
                  id="serverMemory"
                  value={createForm.max_memory}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      max_memory: parseInt(e.target.value),
                    })
                  }
                >
                  <option value={1024}>1GB (1024MB)</option>
                  <option value={2048}>2GB (2048MB)</option>
                  <option value={4096}>4GB (4096MB)</option>
                  <option value={8192}>8GB (8192MB)</option>
                  <option value={16384}>16GB (16384MB)</option>
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="serverDescription">
                  Description (Optional)
                </label>
                <textarea
                  id="serverDescription"
                  value={createForm.description || ""}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Describe your server..."
                  rows={3}
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className={styles.submitButton}
                >
                  {isCreating ? "Creating..." : "Create Server"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Server Management Modal */}
      {selectedServer && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Manage {selectedServer.name}</h2>
              <button
                onClick={() => setSelectedServer(null)}
                className={styles.closeButton}
              >
                ×
              </button>
            </div>

            <div className={styles.managementTabs}>
              <p>Server management features will be implemented here:</p>
              <ul>
                <li>Server Properties</li>
                <li>Player Management (OP/Whitelist)</li>
                <li>File Manager</li>
                <li>Backup Management</li>
                <li>Console</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
