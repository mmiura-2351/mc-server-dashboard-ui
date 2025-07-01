"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth";
import { useTranslation } from "@/contexts/language";
import * as serverService from "@/services/server";
import type { MinecraftServer, ServerTemplate } from "@/types/server";
import { ServerType, ServerStatus } from "@/types/server";
import styles from "./server-dashboard.module.css";

// Fallback versions if API call fails
const FALLBACK_VERSIONS = [
  "1.21.6",
  "1.21.5",
  "1.21.4",
  "1.21.3",
  "1.21.2",
  "1.21.1",
  "1.21",
  "1.20.6",
  "1.20.5",
  "1.20.4",
  "1.20.3",
  "1.20.2",
  "1.20.1",
  "1.20",
];

export function ServerDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  // Helper function to get a safe minecraft version
  const getDefaultMinecraftVersion = (): string => {
    if (supportedVersions.length > 0) {
      const firstVersion = supportedVersions[0];
      if (firstVersion) return firstVersion;
    }
    return FALLBACK_VERSIONS[0] as string;
  };
  const [servers, setServers] = useState<MinecraftServer[]>([]);
  const [, setTemplates] = useState<ServerTemplate[]>([]);
  const [supportedVersions, setSupportedVersions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingVersions, setIsLoadingVersions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [versionError, setVersionError] = useState<string | null>(null);
  const [hasInitializedVersion, setHasInitializedVersion] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalTab, setModalTab] = useState<"create" | "import">("create");
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Server action state
  const [actioningServers, setActioningServers] = useState<Set<number>>(
    new Set()
  );
  const [actioningButtons, setActioningButtons] = useState<Map<number, string>>(
    new Map()
  );

  // Create server form
  const [createForm, setCreateForm] = useState<{
    name: string;
    minecraft_version: string;
    server_type: ServerType;
    max_memory: number;
    description: string;
  }>({
    name: "",
    minecraft_version: "",
    server_type: ServerType.VANILLA,
    max_memory: 2048,
    description: "",
  });

  // Import server form
  const [importForm, setImportForm] = useState<{
    name: string;
    description: string;
  }>({
    name: "",
    description: "",
  });
  const [importFile, setImportFile] = useState<File | null>(null);

  // Filter state
  const [selectedServerType, setSelectedServerType] = useState<
    ServerType | "all"
  >("all");
  const [selectedServerStatus, setSelectedServerStatus] = useState<
    ServerStatus | "all"
  >("all");
  const [selectedMinecraftVersion, setSelectedMinecraftVersion] =
    useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<
    "name" | "status" | "created" | "version"
  >("status");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);

  // Reset all filters to default state
  const resetFilters = () => {
    setSelectedServerType("all");
    setSelectedServerStatus("all");
    setSelectedMinecraftVersion("all");
    setSearchQuery("");
    setSortBy("status");
    setSortOrder("desc");
  };

  // Check if any filters are active (not in default state)
  const hasActiveFilters =
    selectedServerType !== "all" ||
    selectedServerStatus !== "all" ||
    selectedMinecraftVersion !== "all" ||
    searchQuery.trim() !== "" ||
    sortBy !== "status" ||
    sortOrder !== "desc";

  // Get unique minecraft versions from existing servers
  const availableVersions = Array.from(
    new Set(servers.map((server) => server.minecraft_version))
  ).sort((a, b) => {
    // Sort versions in descending order (newest first)
    const parseVersion = (version: string) => {
      const parts = version.split(".").map(Number);
      return (parts[0] || 0) * 10000 + (parts[1] || 0) * 100 + (parts[2] || 0);
    };
    return parseVersion(b) - parseVersion(a);
  });

  // Filter servers based on selected type, status, version, and search query
  const filteredServers = servers
    .filter((server) => {
      // Check server type filter
      if (
        selectedServerType !== "all" &&
        server.server_type !== selectedServerType
      ) {
        return false;
      }
      // Check server status filter
      if (
        selectedServerStatus !== "all" &&
        server.status !== selectedServerStatus
      ) {
        return false;
      }
      // Check minecraft version filter
      if (
        selectedMinecraftVersion !== "all" &&
        server.minecraft_version !== selectedMinecraftVersion
      ) {
        return false;
      }
      // Check search query filter (case-insensitive)
      if (
        searchQuery.trim() !== "" &&
        !server.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "status":
          // Sort by status priority: running > stopped > error
          const statusPriority: Record<ServerStatus, number> = {
            [ServerStatus.RUNNING]: 3,
            [ServerStatus.STARTING]: 2,
            [ServerStatus.STOPPING]: 1,
            [ServerStatus.STOPPED]: 0,
            [ServerStatus.ERROR]: -1,
          };
          comparison = statusPriority[a.status] - statusPriority[b.status];
          break;
        case "created":
          comparison =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "version":
          comparison = a.minecraft_version.localeCompare(b.minecraft_version);
          break;
        default:
          return 0;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

  const resetForms = () => {
    setCreateForm({
      name: "",
      minecraft_version: getDefaultMinecraftVersion(),
      server_type: ServerType.VANILLA,
      max_memory: 2048,
      description: "",
    });
    setImportForm({
      name: "",
      description: "",
    });
    setImportFile(null);
    setHasInitializedVersion(false); // Reset flag to allow re-initialization
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setModalTab("create");
    resetForms();
  };

  const switchTab = (tab: "create" | "import") => {
    setModalTab(tab);
    // Don't reset forms on tab switch to preserve user input
  };

  // Load data only once on mount
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!isMounted) return;

      setIsLoading(true);
      setError(null);

      try {
        const [serversResult, templatesResult] = await Promise.all([
          serverService.getServers(),
          serverService.getServerTemplates(),
        ]);

        if (!isMounted) return;

        if (serversResult.isOk()) {
          setServers(serversResult.value);
        } else {
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
        if (isMounted) {
          setError(t("errors.failedToLoadData"));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [logout, t]);

  // Load supported versions only once on mount
  useEffect(() => {
    let isMounted = true;

    const loadSupportedVersions = async () => {
      if (!isMounted) return;

      setIsLoadingVersions(true);
      setVersionError(null);

      const result = await serverService.getSupportedVersions();

      if (!isMounted) return;

      if (result.isOk()) {
        setSupportedVersions(result.value);
      } else {
        setSupportedVersions(FALLBACK_VERSIONS);
        // Check if this is a timeout error for better user feedback
        if (
          result.error.status === 408 ||
          result.error.message.includes("timeout")
        ) {
          setVersionError("TIMEOUT_ERROR");
        } else {
          // Set a flag for general error message translation later
          setVersionError("TRANSLATION_NEEDED");
        }
      }
      setIsLoadingVersions(false);
    };

    loadSupportedVersions();

    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run on mount

  // Translate error message when needed
  useEffect(() => {
    if (versionError === "TRANSLATION_NEEDED") {
      setVersionError(t("servers.create.errors.failedToLoadVersions"));
    } else if (versionError === "TIMEOUT_ERROR") {
      setVersionError(t("servers.create.errors.versionLoadTimeout"));
    }
  }, [versionError, t]);

  // Initialize form with first available version when versions are loaded
  useEffect(() => {
    if (supportedVersions.length > 0 && !hasInitializedVersion) {
      setCreateForm((prev) => {
        // Only update if no version is currently set
        if (!prev.minecraft_version) {
          return {
            ...prev,
            minecraft_version:
              supportedVersions[0] || (FALLBACK_VERSIONS[0] as string),
          };
        }
        return prev;
      });
      setHasInitializedVersion(true);
    }
  }, [supportedVersions, hasInitializedVersion]);

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

    const result = await serverService.createServer({
      name: createForm.name,
      minecraft_version: createForm.minecraft_version,
      server_type: createForm.server_type,
      max_memory: createForm.max_memory,
      description: createForm.description || undefined,
    });
    if (result.isOk()) {
      setServers([...servers, result.value]);
      closeModal();
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
      name: importForm.name,
      description: importForm.description || undefined,
      file: importFile,
    });

    if (result.isOk()) {
      setServers([...servers, result.value]);
      closeModal();
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

  const handleSort = (column: "name" | "status" | "created" | "version") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const handleServerAction = async (
    e: React.MouseEvent,
    serverId: number,
    action: "start" | "stop"
  ) => {
    e.stopPropagation();

    // Add server to actioning set
    setActioningServers((prev) => new Set(prev).add(serverId));
    setActioningButtons((prev) => new Map(prev).set(serverId, action));
    setError(null);

    try {
      let result;
      switch (action) {
        case "start":
          result = await serverService.startServer(serverId);
          break;
        case "stop":
          result = await serverService.stopServer(serverId);
          break;
      }

      if (result.isOk()) {
        // Reload server data to get updated status
        const refreshResult = await serverService.getServers();
        if (refreshResult.isOk()) {
          setServers(refreshResult.value);
        }
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
      // Remove server from actioning set
      setActioningServers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(serverId);
        return newSet;
      });
      setActioningButtons((prev) => {
        const newMap = new Map(prev);
        newMap.delete(serverId);
        return newMap;
      });
    }
  };

  const handleServerDetails = (e: React.MouseEvent, serverId: number) => {
    e.stopPropagation();
    router.push(`/servers/${serverId}`);
  };

  if (!user) return null;

  return (
    <div className={styles.container}>
      <div className={styles.containerHeader}>
        <h1 className={styles.title}>{t("servers.title")}</h1>
      </div>

      {/* Fixed Header Bar */}
      {servers.length > 0 && (
        <div className={styles.fixedHeaderBar}>
          {hasActiveFilters && (
            <div className={styles.filterStatus}>
              {filteredServers.length}/{servers.length}
            </div>
          )}

          <div className={styles.headerActions}>
            <div className={styles.filterButtonContainer}>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={styles.filterButton}
                title={t("servers.filters.title")}
              >
                🔍 {t("servers.filters.title")}
                {hasActiveFilters && (
                  <span className={styles.activeIndicator}></span>
                )}
              </button>

              {/* Filter Modal */}
              {showFilters && (
                <>
                  <div
                    className={styles.filterOverlay}
                    onClick={() => setShowFilters(false)}
                  />
                  <div className={styles.expandedFilters}>
                    <div className={styles.filterHeader}>
                      <h3>{t("servers.filters.title")}</h3>
                      <button
                        onClick={() => setShowFilters(false)}
                        className={styles.closeFiltersButton}
                        aria-label={t("servers.filters.closeFilters")}
                      >
                        ×
                      </button>
                    </div>

                    {/* Search Section - moved to top */}
                    <div className={styles.searchSection}>
                      <div className={styles.filterGroup}>
                        <label
                          htmlFor="serverSearchInput"
                          className={styles.filterLabel}
                        >
                          {t("servers.filters.search.label")}
                        </label>
                        <input
                          id="serverSearchInput"
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder={t("servers.filters.search.placeholder")}
                          className={styles.filterInput}
                        />
                      </div>
                    </div>

                    {/* Filter Section */}
                    <div className={styles.filterSection}>
                      <h4 className={styles.sectionTitle}>
                        🔍 {t("servers.filters.filterBy")}
                      </h4>
                      <div className={styles.filterGrid}>
                        <div className={styles.filterGroup}>
                          <label
                            htmlFor="serverTypeFilter"
                            className={styles.filterLabel}
                          >
                            {t("servers.filters.type.label")}
                          </label>
                          <select
                            id="serverTypeFilter"
                            value={selectedServerType}
                            onChange={(e) =>
                              setSelectedServerType(
                                e.target.value as ServerType | "all"
                              )
                            }
                            className={styles.filterSelect}
                          >
                            <option value="all">
                              {t("servers.filters.type.all")}
                            </option>
                            <option value={ServerType.VANILLA}>
                              {t("servers.filters.type.vanilla")}
                            </option>
                            <option value={ServerType.PAPER}>
                              {t("servers.filters.type.paper")}
                            </option>
                            <option value={ServerType.FORGE}>
                              {t("servers.filters.type.forge")}
                            </option>
                          </select>
                        </div>

                        <div className={styles.filterGroup}>
                          <label
                            htmlFor="serverStatusFilter"
                            className={styles.filterLabel}
                          >
                            {t("servers.filters.status.label")}
                          </label>
                          <select
                            id="serverStatusFilter"
                            value={selectedServerStatus}
                            onChange={(e) =>
                              setSelectedServerStatus(
                                e.target.value as ServerStatus | "all"
                              )
                            }
                            className={styles.filterSelect}
                          >
                            <option value="all">
                              {t("servers.filters.status.all")}
                            </option>
                            <option value={ServerStatus.RUNNING}>
                              {t("servers.filters.status.running")}
                            </option>
                            <option value={ServerStatus.STOPPED}>
                              {t("servers.filters.status.stopped")}
                            </option>
                            <option value={ServerStatus.ERROR}>
                              {t("servers.filters.status.error")}
                            </option>
                          </select>
                        </div>

                        <div className={styles.filterGroup}>
                          <label
                            htmlFor="serverVersionFilter"
                            className={styles.filterLabel}
                          >
                            {t("servers.filters.version.label")}
                          </label>
                          <select
                            id="serverVersionFilter"
                            value={selectedMinecraftVersion}
                            onChange={(e) =>
                              setSelectedMinecraftVersion(e.target.value)
                            }
                            className={styles.filterSelect}
                          >
                            <option value="all">
                              {t("servers.filters.version.all")}
                            </option>
                            {availableVersions.map((version) => (
                              <option key={version} value={version}>
                                {version}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Sort Section */}
                    <div className={styles.sortSection}>
                      <h4 className={styles.sectionTitle}>
                        📊 {t("servers.filters.sortBy")}
                      </h4>
                      <div className={styles.sortControls}>
                        <div className={styles.filterGroup}>
                          <label
                            htmlFor="serverSortBy"
                            className={styles.filterLabel}
                          >
                            {t("servers.filters.sort.label")}
                          </label>
                          <select
                            id="serverSortBy"
                            value={sortBy}
                            onChange={(e) =>
                              setSortBy(
                                e.target.value as
                                  | "name"
                                  | "status"
                                  | "created"
                                  | "version"
                              )
                            }
                            className={styles.filterSelect}
                          >
                            <option value="status">
                              {t("servers.filters.sort.status")}
                            </option>
                            <option value="name">
                              {t("servers.filters.sort.name")}
                            </option>
                            <option value="created">
                              {t("servers.filters.sort.created")}
                            </option>
                            <option value="version">
                              {t("servers.filters.sort.version")}
                            </option>
                          </select>
                        </div>

                        <div className={styles.filterGroup}>
                          <label className={styles.filterLabel}>
                            {t("servers.filters.sort.order")}
                          </label>
                          <button
                            onClick={() =>
                              setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                            }
                            className={styles.sortOrderButton}
                          >
                            {sortOrder === "asc" ? (
                              <>↑ {t("servers.filters.sort.ascending")}</>
                            ) : (
                              <>↓ {t("servers.filters.sort.descending")}</>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Reset Button */}
                    {hasActiveFilters && (
                      <div className={styles.resetSection}>
                        <button
                          onClick={resetFilters}
                          className={styles.resetFiltersButtonLarge}
                        >
                          🔄 {t("servers.filters.reset")}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className={styles.createButtonHeader}
              disabled={isCreating}
            >
              {t("servers.createServer")}
            </button>
          </div>
        </div>
      )}

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
          {servers.length > 0 && (
            <div className={styles.resultsCount}>
              {t("servers.filters.resultsCount", {
                count: filteredServers.length.toString(),
                total: servers.length.toString(),
              })}
            </div>
          )}
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
          ) : filteredServers.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>{t("servers.noServersFound")}</h3>
              <p>{t("servers.filters.noMatchingServers")}</p>
            </div>
          ) : (
            <>
              {/* Table view for desktop */}
              <div className={styles.tableContainer}>
                <table className={styles.serverTable}>
                  <thead>
                    <tr>
                      <th
                        className={styles.sortableHeader}
                        onClick={() => handleSort("name")}
                      >
                        <div className={styles.headerContent}>
                          <span>{t("servers.fields.name")}</span>
                          {sortBy === "name" && (
                            <span className={styles.sortIndicator}>
                              {sortOrder === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        className={styles.sortableHeader}
                        onClick={() => handleSort("status")}
                      >
                        <div className={styles.headerContent}>
                          <span>{t("servers.fields.status")}</span>
                          {sortBy === "status" && (
                            <span className={styles.sortIndicator}>
                              {sortOrder === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        className={styles.sortableHeader}
                        onClick={() => handleSort("version")}
                      >
                        <div className={styles.headerContent}>
                          <span>{t("servers.fields.version")}</span>
                          {sortBy === "version" && (
                            <span className={styles.sortIndicator}>
                              {sortOrder === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </th>
                      <th>{t("servers.fields.type")}</th>
                      <th>{t("servers.fields.players")}</th>
                      <th>{t("servers.fields.memory")}</th>
                      <th>{t("servers.fields.port")}</th>
                      <th className={styles.actionsHeader}>
                        {t("servers.fields.actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredServers.map((server) => (
                      <tr key={server.id} className={styles.serverRow}>
                        <td className={styles.nameCell}>
                          <div className={styles.nameContent}>
                            <span className={styles.serverNameText}>
                              {server.name}
                            </span>
                            {server.description && (
                              <span className={styles.serverDescriptionText}>
                                {server.description}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`${styles.statusBadge} ${getStatusColor(server.status)}`}
                          >
                            {getStatusIcon(server.status)}{" "}
                            {getStatusText(server.status)}
                          </span>
                        </td>
                        <td>{server.minecraft_version}</td>
                        <td>
                          <span className={styles.serverTypeLabel}>
                            {server.server_type}
                          </span>
                        </td>
                        <td>
                          <span className={styles.playersInfo}>
                            {server.status === ServerStatus.RUNNING ? "0" : "-"}
                            /{server.max_players}
                          </span>
                        </td>
                        <td>
                          <span className={styles.memoryInfo}>
                            {server.status === ServerStatus.RUNNING
                              ? `${Math.floor(server.max_memory * 0.5)}/${server.max_memory}MB`
                              : `${server.max_memory}MB`}
                          </span>
                        </td>
                        <td>{server.port}</td>
                        <td className={styles.actionsCell}>
                          <div className={styles.actionButtons}>
                            {(server.status === ServerStatus.STOPPED ||
                              server.status === ServerStatus.ERROR) && (
                              <button
                                className={styles.startButton}
                                onClick={(e) =>
                                  handleServerAction(e, server.id, "start")
                                }
                                disabled={actioningServers.has(server.id)}
                                title={
                                  actioningButtons.get(server.id) === "start"
                                    ? t("servers.actions.starting")
                                    : t("servers.actions.start")
                                }
                              >
                                {actioningButtons.get(server.id) === "start"
                                  ? "⏳"
                                  : "▶"}
                              </button>
                            )}
                            {server.status === ServerStatus.RUNNING && (
                              <button
                                className={styles.stopButton}
                                onClick={(e) =>
                                  handleServerAction(e, server.id, "stop")
                                }
                                disabled={actioningServers.has(server.id)}
                                title={
                                  actioningButtons.get(server.id) === "stop"
                                    ? t("servers.actions.stopping")
                                    : t("servers.actions.stop")
                                }
                              >
                                {actioningButtons.get(server.id) === "stop"
                                  ? "⏳"
                                  : "■"}
                              </button>
                            )}
                            {(server.status === ServerStatus.STARTING ||
                              server.status === ServerStatus.STOPPING) &&
                              !actioningServers.has(server.id) && (
                                <button
                                  className={styles.actionButtonDisabled}
                                  disabled
                                  title={getStatusText(server.status)}
                                >
                                  ⏳
                                </button>
                              )}
                            <button
                              className={styles.detailsButton}
                              onClick={(e) => handleServerDetails(e, server.id)}
                              disabled={actioningServers.has(server.id)}
                              title={t("servers.actions.details")}
                            >
                              →
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Card view for mobile */}
              <div className={styles.serverGrid}>
                {filteredServers.map((server) => (
                  <div
                    key={server.id}
                    className={styles.serverCard}
                    onClick={() => handleServerClick(server.id)}
                  >
                    <div className={styles.compactHeader}>
                      <div className={styles.serverInfo}>
                        <h3 className={styles.serverName}>{server.name}</h3>
                        <div className={styles.serverMeta}>
                          <span className={styles.versionBadge}>
                            {server.minecraft_version}
                          </span>
                          <span className={styles.separator}>•</span>
                          <span className={styles.typeBadge}>
                            {server.server_type}
                          </span>
                        </div>
                      </div>
                      <div className={styles.statusSection}>
                        <span className={styles.statusIcon}>
                          {getStatusIcon(server.status)}
                        </span>
                        <span
                          className={`${styles.statusText} ${getStatusColor(server.status)}`}
                        >
                          {getStatusText(server.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
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
              <button onClick={closeModal} className={styles.closeButton}>
                ×
              </button>
            </div>

            <div className={styles.modalTabs}>
              <button
                className={`${styles.modalTab} ${modalTab === "create" ? styles.activeModalTab : ""}`}
                onClick={() => switchTab("create")}
              >
                {t("servers.create.title")}
              </button>
              <button
                className={`${styles.modalTab} ${modalTab === "import" ? styles.activeModalTab : ""}`}
                onClick={() => switchTab("import")}
              >
                {t("servers.import.title")}
              </button>
            </div>

            {modalTab === "create" ? (
              <form
                onSubmit={handleCreateServer}
                className={styles.form}
                key="create-form"
              >
                <div className={styles.field}>
                  <label htmlFor="createServerName">
                    {t("servers.create.serverName")}
                  </label>
                  <input
                    id="createServerName"
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
                  <label htmlFor="createServerVersion">
                    {t("servers.create.minecraftVersion")}
                  </label>
                  <select
                    id="createServerVersion"
                    value={createForm.minecraft_version}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        minecraft_version: e.target.value,
                      })
                    }
                    disabled={isLoadingVersions}
                  >
                    {isLoadingVersions ? (
                      <option value="">
                        {t("servers.create.loadingVersions")}
                      </option>
                    ) : supportedVersions.length > 0 ? (
                      supportedVersions.map((version) => (
                        <option key={version} value={version}>
                          {version}
                        </option>
                      ))
                    ) : (
                      <option value="">
                        {t("servers.create.noVersionsAvailable")}
                      </option>
                    )}
                  </select>
                  {versionError && (
                    <div className={styles.errorText}>{versionError}</div>
                  )}
                </div>

                <div className={styles.field}>
                  <label htmlFor="createServerType">
                    {t("servers.create.serverType")}
                  </label>
                  <select
                    id="createServerType"
                    value={createForm.server_type}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        server_type: e.target.value as ServerType,
                      })
                    }
                  >
                    <option value={ServerType.VANILLA}>
                      {t("servers.filters.type.vanilla")}
                    </option>
                    <option value={ServerType.PAPER}>
                      {t("servers.filters.type.paper")}
                    </option>
                    <option value={ServerType.FORGE}>
                      {t("servers.filters.type.forge")}
                    </option>
                  </select>
                </div>

                <div className={styles.field}>
                  <label htmlFor="createServerMemory">
                    {t("servers.create.memory")}
                  </label>
                  <select
                    id="createServerMemory"
                    value={createForm.max_memory}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        max_memory: parseInt(e.target.value),
                      })
                    }
                  >
                    <option value={1024}>
                      {t("servers.create.memoryOptions.1024")}
                    </option>
                    <option value={2048}>
                      {t("servers.create.memoryOptions.2048")}
                    </option>
                    <option value={4096}>
                      {t("servers.create.memoryOptions.4096")}
                    </option>
                    <option value={8192}>
                      {t("servers.create.memoryOptions.8192")}
                    </option>
                    <option value={16384}>
                      {t("servers.create.memoryOptions.16384")}
                    </option>
                  </select>
                </div>

                <div className={styles.field}>
                  <label htmlFor="createServerDescription">
                    {t("servers.create.description")}
                  </label>
                  <textarea
                    id="createServerDescription"
                    value={createForm.description}
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
                    onClick={closeModal}
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
              <form
                onSubmit={handleImportServer}
                className={styles.form}
                key="import-form"
              >
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
                    value={importForm.description}
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
                    onClick={closeModal}
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
