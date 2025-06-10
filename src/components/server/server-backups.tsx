"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/contexts/language";
import * as serverService from "@/services/server";
import type { ServerBackup, BackupSettings } from "@/types/server";
import styles from "./server-backups.module.css";

interface ServerBackupsProps {
  serverId: number;
}

export function ServerBackups({ serverId }: ServerBackupsProps) {
  const { t } = useTranslation();
  const [backups, setBackups] = useState<ServerBackup[]>([]);
  const [backupSettings, setBackupSettings] = useState<BackupSettings>({
    enabled: false,
    interval: 24,
    maxBackups: 7,
  });
  const [editedSettings, setEditedSettings] = useState<BackupSettings>({
    enabled: false,
    interval: 24,
    maxBackups: 7,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newBackupName, setNewBackupName] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const loadBackupsAndSettings = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [backupsResult, settingsResult] = await Promise.all([
        serverService.getServerBackups(serverId),
        serverService.getBackupSettings(serverId),
      ]);

      if (backupsResult.isOk()) {
        setBackups(backupsResult.value);
      } else {
        setError(backupsResult.error.message);
      }

      if (settingsResult.isOk()) {
        // Ensure all values are properly set and not null
        const settings = settingsResult.value;
        const loadedSettings = {
          enabled: settings.enabled ?? false,
          interval: settings.interval ?? 24,
          maxBackups: settings.maxBackups ?? 7,
        };
        setBackupSettings(loadedSettings);
        setEditedSettings(loadedSettings);
        setHasUnsavedChanges(false);
      } else {
        // Keep default settings if API fails
        console.warn("Failed to load backup settings:", settingsResult.error.message);
      }
    } catch {
      setError(t("errors.failedToLoadBackups"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBackupsAndSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId]);

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
        await loadBackupsAndSettings();
      } else {
        setError(result.error.message);
      }
    } catch {
      setError(t("backups.errors.failedToCreateBackup"));
    }

    setIsCreatingBackup(false);
  };

  const handleRestoreBackup = async (backupId: string, backupName: string) => {
    if (!confirm(t("backups.restoreConfirmation", { name: backupName }))) {
      return;
    }

    setError(null);
    
    try {
      const result = await serverService.restoreBackup(backupId);

      if (result.isOk()) {
        await loadBackupsAndSettings();
      } else {
        setError(result.error.message);
      }
    } catch {
      setError(t("backups.errors.failedToRestoreBackup"));
    }
  };

  const handleDeleteBackup = async (backupId: string, backupName: string) => {
    if (!confirm(t("backups.deleteConfirmation", { name: backupName }))) {
      return;
    }

    setError(null);
    
    try {
      const result = await serverService.deleteBackup(backupId);

      if (result.isOk()) {
        await loadBackupsAndSettings();
      } else {
        setError(result.error.message);
      }
    } catch {
      setError(t("backups.errors.failedToDeleteBackup"));
    }
  };

  const handleEditSettings = (updates: Partial<BackupSettings>) => {
    const newSettings = { ...editedSettings, ...updates };
    setEditedSettings(newSettings);
    setHasUnsavedChanges(true);
  };

  const handleSaveSettings = async () => {
    setError(null);
    setIsSavingSettings(true);
    
    try {
      const result = await serverService.updateBackupSettings(
        serverId,
        editedSettings
      );

      if (result.isOk()) {
        setBackupSettings(editedSettings);
        setHasUnsavedChanges(false);
      } else {
        setError(result.error.message);
      }
    } catch {
      setError(t("errors.operationFailed", { action: "update backup settings" }));
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleCancelChanges = () => {
    setEditedSettings(backupSettings);
    setHasUnsavedChanges(false);
    setError(null);
  };

  const formatBackupSize = (bytes: number | undefined | null) => {
    if (!bytes || bytes === 0) return "0 B";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100} ${sizes[i]}`;
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return t("common.unknown");
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return t("common.unknown");
      return date.toLocaleString();
    } catch {
      return t("common.unknown");
    }
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

      {/* Backup Settings */}
      <div className={styles.section}>
        <h3>{t("backups.settings.title")}</h3>
        <div className={styles.settingsGrid}>
          <div className={styles.settingItem}>
            <label className={styles.label}>
              <input
                type="checkbox"
                checked={!!editedSettings.enabled}
                onChange={(e) =>
                  handleEditSettings({
                    enabled: e.target.checked,
                  })
                }
              />
              {t("backups.settings.enableAutoBackup")}
            </label>
          </div>

          <div className={styles.settingItem}>
            <label className={styles.label}>
              {t("backups.settings.interval")}
              <select
                value={String(editedSettings.interval || 24)}
                onChange={(e) =>
                  handleEditSettings({
                    interval: parseInt(e.target.value) || 24,
                  })
                }
                disabled={!editedSettings.enabled}
              >
                <option value="6">{t("backups.intervals.6hours")}</option>
                <option value="12">{t("backups.intervals.12hours")}</option>
                <option value="24">{t("backups.intervals.24hours")}</option>
                <option value="48">{t("backups.intervals.48hours")}</option>
                <option value="168">{t("backups.intervals.weekly")}</option>
              </select>
            </label>
          </div>

          <div className={styles.settingItem}>
            <label className={styles.label}>
              {t("backups.settings.maxBackups")}
              <input
                type="number"
                min="1"
                max="50"
                value={String(editedSettings.maxBackups || 7)}
                onChange={(e) =>
                  handleEditSettings({
                    maxBackups: parseInt(e.target.value) || 1,
                  })
                }
                disabled={!editedSettings.enabled}
              />
            </label>
          </div>
        </div>
        
        {hasUnsavedChanges && (
          <div className={styles.settingsActions}>
            <button
              onClick={handleCancelChanges}
              className={styles.cancelButton}
              disabled={isSavingSettings}
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={handleSaveSettings}
              className={styles.saveButton}
              disabled={isSavingSettings}
            >
              {isSavingSettings ? t("common.saving") : t("common.save")}
            </button>
          </div>
        )}
      </div>

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
              <div key={backup.id} className={styles.backupItem}>
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
                    <span>{formatDate(backup.created_at)}</span>
                    <span>{formatBackupSize(backup.size_bytes)}</span>
                  </div>
                </div>
                <div className={styles.backupActions}>
                  <button
                    onClick={() => handleRestoreBackup(backup.id, backup.name)}
                    className={styles.restoreButton}
                  >
                    {t("backups.restore")}
                  </button>
                  <button
                    onClick={() => handleDeleteBackup(backup.id, backup.name)}
                    className={styles.deleteButton}
                  >
                    {t("backups.delete")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
