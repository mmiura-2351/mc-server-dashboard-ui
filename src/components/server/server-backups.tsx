"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/contexts/language";
import { ConfirmationModal } from "@/components/modal";
import * as serverService from "@/services/server";
import type { ServerBackup } from "@/types/server";
import { formatFileSize, formatDate } from "@/utils/format";
import styles from "./server-backups.module.css";

interface ServerBackupsProps {
  serverId: number;
}

export function ServerBackups({ serverId }: ServerBackupsProps) {
  const { t } = useTranslation();
  const [backups, setBackups] = useState<ServerBackup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newBackupName, setNewBackupName] = useState("");
  const [downloadingBackups, setDownloadingBackups] = useState<Set<number>>(
    new Set()
  );
  const [openDropdowns, setOpenDropdowns] = useState<Set<number>>(new Set());
  const [restoringBackups, setRestoringBackups] = useState<Set<number>>(
    new Set()
  );

  // Modal states
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant?: "default" | "danger" | "warning";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const loadBackups = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const backupsResult = await serverService.getServerBackups(serverId);

      if (backupsResult.isOk()) {
        setBackups(backupsResult.value);
      } else {
        setError(backupsResult.error.message);
      }
    } catch {
      setError(t("errors.failedToLoadBackups"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (openDropdowns.size > 0) {
        closeAllDropdowns();
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [openDropdowns]);

  const handleCreateBackup = async () => {
    if (!newBackupName.trim()) {
      setError(t("backups.errors.backupNameRequired"));
      return;
    }

    setIsCreatingBackup(true);
    setError(null);

    try {
      const result = await serverService.createBackup(
        serverId,
        newBackupName.trim()
      );

      if (result.isOk()) {
        setNewBackupName("");
        await loadBackups();
      } else {
        setError(result.error.message);
      }
    } catch {
      setError(t("backups.errors.failedToCreateBackup"));
    }

    setIsCreatingBackup(false);
  };

  const handleRestoreBackup = (backupId: number, backupName: string) => {
    const confirmRestore = async () => {
      setRestoringBackups((prev) => new Set(prev).add(backupId));
      setError(null);

      try {
        const result = await serverService.restoreBackup(backupId);

        if (result.isOk()) {
          await loadBackups();
        } else {
          setError(result.error.message);
        }
      } catch {
        setError(t("backups.errors.failedToRestoreBackup"));
      } finally {
        setRestoringBackups((prev) => {
          const newSet = new Set(prev);
          newSet.delete(backupId);
          return newSet;
        });
      }

      setConfirmModal({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => {},
      });
    };

    setConfirmModal({
      isOpen: true,
      title: t("backups.restore"),
      message: t("backups.restoreConfirmation", { name: backupName }),
      variant: "warning",
      onConfirm: confirmRestore,
    });
  };

  const handleAdvancedRestore = (
    backupId: number,
    backupName: string,
    options?: { preservePlayerData?: boolean; restoreSettings?: boolean }
  ) => {
    const confirmMessage = options?.preservePlayerData
      ? t("backups.advancedRestoreConfirmation", { name: backupName })
      : t("backups.restoreConfirmation", { name: backupName });

    const confirmAdvancedRestore = async () => {
      setRestoringBackups((prev) => new Set(prev).add(backupId));
      setError(null);

      try {
        const result = await serverService.advancedRestoreBackup(
          backupId,
          options
        );

        if (result.isOk()) {
          await loadBackups();
        } else {
          setError(result.error.message);
        }
      } catch {
        setError(t("backups.errors.failedToRestoreBackup"));
      } finally {
        setRestoringBackups((prev) => {
          const newSet = new Set(prev);
          newSet.delete(backupId);
          return newSet;
        });
      }

      setConfirmModal({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => {},
      });
    };

    setConfirmModal({
      isOpen: true,
      title: t("backups.advancedRestore"),
      message: confirmMessage,
      variant: "warning",
      onConfirm: confirmAdvancedRestore,
    });
  };

  const handleDeleteBackup = (backupId: number, backupName: string) => {
    const confirmDelete = async () => {
      setError(null);

      try {
        const result = await serverService.deleteBackup(backupId);

        if (result.isOk()) {
          await loadBackups();
        } else {
          setError(result.error.message);
        }
      } catch {
        setError(t("backups.errors.failedToDeleteBackup"));
      }

      setConfirmModal({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => {},
      });
    };

    setConfirmModal({
      isOpen: true,
      title: t("backups.delete"),
      message: t("backups.deleteConfirmation", { name: backupName }),
      variant: "danger",
      onConfirm: confirmDelete,
    });
  };

  const handleDownloadBackup = async (backupId: number, backupName: string) => {
    setDownloadingBackups((prev) => new Set(prev).add(backupId));
    setError(null);

    try {
      const result = await serverService.downloadBackup(backupId);

      if (result.isOk()) {
        // Create download link
        const url = URL.createObjectURL(result.value);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${backupName}.zip`; // Assume backup files are ZIP format
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        setError(result.error.message);
      }
    } catch {
      setError(t("errors.operationFailed", { action: "download backup" }));
    } finally {
      setDownloadingBackups((prev) => {
        const newSet = new Set(prev);
        newSet.delete(backupId);
        return newSet;
      });
    }
  };

  const toggleDropdown = (backupId: number) => {
    setOpenDropdowns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(backupId)) {
        newSet.delete(backupId);
      } else {
        newSet.clear(); // Close other dropdowns
        newSet.add(backupId);
      }
      return newSet;
    });
  };

  const closeAllDropdowns = () => {
    setOpenDropdowns(new Set());
  };

  const formatBackupDate = (dateString: string | undefined | null) => {
    const formatted = formatDate(dateString);
    return formatted === "Unknown" ? t("common.unknown") : formatted;
  };

  const isAutomaticBackup = (backup: ServerBackup) => {
    return backup.backup_type === "scheduled";
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>{t("common.loading")}</div>
      </div>
    );
  }

  // Show loading overlay during backup creation
  if (isCreatingBackup) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingContent}>
            <div className={styles.spinner}></div>
            <h3>{t("backups.creating")}</h3>
            <p>{t("backups.creatingDescription")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>{t("servers.backups")}</h2>
        <p>{t("backups.description")}</p>
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

      {/* Create New Backup */}
      <div className={styles.section}>
        <h3>{t("backups.createBackup")}</h3>
        <div className={styles.createBackupForm}>
          <input
            type="text"
            placeholder={t("backups.backupNamePlaceholder")}
            value={newBackupName}
            onChange={(e) => setNewBackupName(e.target.value)}
            className={styles.backupNameInput}
            disabled={isCreatingBackup}
          />
          <button
            onClick={handleCreateBackup}
            disabled={isCreatingBackup || !newBackupName.trim()}
            className={styles.createButton}
          >
            {isCreatingBackup ? t("backups.creating") : t("backups.create")}
          </button>
        </div>
      </div>

      {/* Backups List */}
      <div className={styles.section}>
        <h3>{t("backups.existingBackups")}</h3>
        {backups.length === 0 ? (
          <div className={styles.noBackups}>
            <p>{t("backups.noBackupsFound")}</p>
          </div>
        ) : (
          <div className={styles.backupsList}>
            {backups.map((backup) => (
              <div
                key={backup.id}
                className={`${styles.backupItem} ${openDropdowns.has(backup.id) ? styles.backupItemActive : ""}`}
              >
                <div className={styles.backupInfo}>
                  <div className={styles.backupName}>
                    {backup.name}
                    {isAutomaticBackup(backup) && (
                      <span className={styles.automaticBadge}>
                        {t("backups.automatic")}
                      </span>
                    )}
                  </div>
                  <div className={styles.backupDetails}>
                    <span>{formatBackupDate(backup.created_at)}</span>
                    <span>{formatFileSize(backup.size_bytes)}</span>
                  </div>
                </div>
                <div className={styles.backupActions}>
                  <div className={styles.actionDropdown}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDropdown(backup.id);
                      }}
                      className={styles.dropdownToggle}
                      aria-expanded={openDropdowns.has(backup.id)}
                    >
                      {t("backups.actions")}
                      <span className={styles.dropdownArrow}>▼</span>
                    </button>
                    {openDropdowns.has(backup.id) && (
                      <div
                        className={styles.dropdownMenu}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            handleDownloadBackup(backup.id, backup.name);
                            closeAllDropdowns();
                          }}
                          className={`${styles.dropdownItem} ${styles.downloadItem}`}
                          disabled={downloadingBackups.has(backup.id)}
                        >
                          {downloadingBackups.has(backup.id)
                            ? t("backups.downloading")
                            : t("backups.download")}
                        </button>
                        <button
                          onClick={() => {
                            handleRestoreBackup(backup.id, backup.name);
                            closeAllDropdowns();
                          }}
                          className={styles.dropdownItem}
                          disabled={restoringBackups.has(backup.id)}
                        >
                          {restoringBackups.has(backup.id)
                            ? t("backups.restoring")
                            : t("backups.restore")}
                        </button>
                        <button
                          onClick={() => {
                            handleAdvancedRestore(backup.id, backup.name, {
                              preservePlayerData: true,
                              restoreSettings: true,
                            });
                            closeAllDropdowns();
                          }}
                          className={styles.dropdownItem}
                          disabled={restoringBackups.has(backup.id)}
                        >
                          {restoringBackups.has(backup.id)
                            ? t("backups.restoring")
                            : t("backups.advancedRestore")}
                        </button>
                        <hr className={styles.dropdownDivider} />
                        <button
                          onClick={() => {
                            handleDeleteBackup(backup.id, backup.name);
                            closeAllDropdowns();
                          }}
                          className={`${styles.dropdownItem} ${styles.deleteItem}`}
                        >
                          {t("backups.delete")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() =>
          setConfirmModal({
            isOpen: false,
            title: "",
            message: "",
            onConfirm: () => {},
          })
        }
      />
    </div>
  );
}
