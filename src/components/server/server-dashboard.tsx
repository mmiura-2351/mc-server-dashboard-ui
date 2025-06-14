"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth";
import { useTranslation } from "@/contexts/language";
import * as serverService from "@/services/server";
import type {
  MinecraftServer,
  ServerTemplate,
  CreateServerRequest,
  ServerImportRequest,
} from "@/types/server";
import { ServerType, ServerStatus, MINECRAFT_VERSIONS } from "@/types/server";
import styles from "./server-dashboard.module.css";

export function ServerDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [servers, setServers] = useState<MinecraftServer[]>([]);
  const [, setTemplates] = useState<ServerTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalTab, setModalTab] = useState<"create" | "import">("create");
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Create server form
  const [createForm, setCreateForm] = useState<CreateServerRequest>({
    name: "",
    minecraft_version: "1.21.5",
    server_type: ServerType.VANILLA,
    max_memory: 2048,
    description: "",
  });

  // Import server form
  const [importForm, setImportForm] = useState<
    Omit<ServerImportRequest, "file">
  >({
    name: "",
    description: "",
  });
  const [importFile, setImportFile] = useState<File | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Removed debug logging for security

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
      setError(t("errors.generic"));
    } finally {
      setIsLoading(false);
    }
  }, [logout, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Status polling effect for servers in transitional states
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const hasTransitionalServers = servers.some(
      (server) =>
        server.status === ServerStatus.STARTING ||
        server.status === ServerStatus.STOPPING
    );

    if (hasTransitionalServers) {
      intervalId = setInterval(async () => {
        const result = await serverService.getServers();
        if (result.isOk()) {
          setServers(result.value);
        }
      }, 2000); // Poll every 2 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [servers]);

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    // Removed debug logging for security

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

  const handleImportServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    setIsImporting(true);

    const result = await serverService.importServer({
      ...importForm,
      file: importFile,
    });

    if (result.isOk()) {
      setServers([...servers, result.value]);
      setShowCreateModal(false);
      setImportForm({
        name: "",
        description: "",
      });
      setImportFile(null);
    } else {
      if (result.error.status === 401) {
        logout();
        return;
      }
      setError(result.error.message);
    }
    setIsImporting(false);
  };

  const handleServerClick = (serverId: number) => {
    router.push(`/servers/${serverId}`);
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

  if (!user) return null;

  return (
    <div className={styles.container}>
      <div className={styles.containerHeader}>
        <h1 className={styles.title}>{t("servers.title")}</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className={styles.createButton}
          disabled={isCreating}
        >
          {t("servers.createServer")}
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
        <div className={styles.loading}>{t("servers.loadingServers")}</div>
      ) : (
        <>
          {servers.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>{t("servers.noServersFound")}</h3>
              <p>{t("servers.createFirstServer")}</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className={styles.createButton}
              >
                {t("servers.createServer")}
              </button>
            </div>
          ) : (
            <div className={styles.serverGrid}>
              {servers.map((server) => (
                <div
                  key={server.id}
                  className={styles.serverCard}
                  onClick={() => handleServerClick(server.id)}
                >
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
                      <span className={styles.label}>
                        {t("servers.fields.version")}:
                      </span>
                      <span>{server.minecraft_version}</span>
                    </div>
                    <div className={styles.infoRow}>
                      <span className={styles.label}>
                        {t("servers.fields.type")}:
                      </span>
                      <span className={styles.serverType}>
                        {server.server_type}
                      </span>
                    </div>
                    <div className={styles.infoRow}>
                      <span className={styles.label}>
                        {t("servers.fields.players")}:
                      </span>
                      <span>0/{server.max_players}</span>
                    </div>
                    <div className={styles.infoRow}>
                      <span className={styles.label}>
                        {t("servers.fields.memory")}:
                      </span>
                      <span>{server.max_memory}MB</span>
                    </div>
                    <div className={styles.infoRow}>
                      <span className={styles.label}>
                        {t("servers.fields.port")}:
                      </span>
                      <span>{server.port}</span>
                    </div>
                  </div>

                  {server.description && (
                    <p className={styles.serverDescription}>
                      {server.description}
                    </p>
                  )}

                  <div className={styles.serverCardFooter}>
                    <span className={styles.clickHint}>
                      {t("servers.clickToManage")}
                    </span>
                    <span className={styles.arrow}>→</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create/Import Server Modal */}
      {showCreateModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>
                {modalTab === "create"
                  ? t("servers.create.title")
                  : t("servers.import.title")}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className={styles.closeButton}
              >
                ×
              </button>
            </div>

            <div className={styles.modalTabs}>
              <button
                className={`${styles.modalTab} ${modalTab === "create" ? styles.activeModalTab : ""}`}
                onClick={() => setModalTab("create")}
              >
                {t("servers.create.title")}
              </button>
              <button
                className={`${styles.modalTab} ${modalTab === "import" ? styles.activeModalTab : ""}`}
                onClick={() => setModalTab("import")}
              >
                {t("servers.import.title")}
              </button>
            </div>

            {modalTab === "create" ? (
              <form onSubmit={handleCreateServer} className={styles.form}>
                <div className={styles.field}>
                  <label htmlFor="serverName">
                    {t("servers.create.serverName")}
                  </label>
                  <input
                    id="serverName"
                    type="text"
                    value={createForm.name}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, name: e.target.value })
                    }
                    required
                    placeholder={t("servers.create.defaultName")}
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="serverVersion">
                    {t("servers.create.minecraftVersion")}
                  </label>
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
                  <label htmlFor="serverType">
                    {t("servers.create.serverType")}
                  </label>
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
                  <label htmlFor="serverMemory">
                    {t("servers.create.memory")}
                  </label>
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
                    {t("servers.create.description")}
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
                    placeholder={t("servers.create.descriptionPlaceholder")}
                    rows={3}
                  />
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className={styles.cancelButton}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className={styles.submitButton}
                  >
                    {isCreating
                      ? t("servers.create.creating")
                      : t("servers.create.createButton")}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleImportServer} className={styles.form}>
                <div className={styles.field}>
                  <label htmlFor="importFile">{t("servers.import.file")}</label>
                  <input
                    id="importFile"
                    type="file"
                    accept=".zip"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    required
                    className={styles.fileInput}
                  />
                  <small className={styles.fieldHelp}>
                    {t("servers.import.fileHelp")}
                  </small>
                </div>

                <div className={styles.field}>
                  <label htmlFor="importServerName">
                    {t("servers.import.serverName")}
                  </label>
                  <input
                    id="importServerName"
                    type="text"
                    value={importForm.name}
                    onChange={(e) =>
                      setImportForm({ ...importForm, name: e.target.value })
                    }
                    required
                    placeholder={t("servers.import.serverNamePlaceholder")}
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="importServerDescription">
                    {t("servers.create.description")}
                  </label>
                  <textarea
                    id="importServerDescription"
                    value={importForm.description || ""}
                    onChange={(e) =>
                      setImportForm({
                        ...importForm,
                        description: e.target.value,
                      })
                    }
                    placeholder={t("servers.import.descriptionPlaceholder")}
                    rows={3}
                  />
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className={styles.cancelButton}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={isImporting || !importFile}
                    className={styles.submitButton}
                  >
                    {isImporting
                      ? t("servers.import.importing")
                      : t("servers.import.importButton")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
