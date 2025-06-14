"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/contexts/language";
import { BackupScheduleOverview } from "./backup-schedule-overview";
import { BackupScheduleForm } from "./backup-schedule-form";
import { BackupScheduleLogs } from "./backup-schedule-logs";
import { BackupScheduleAdmin } from "./backup-schedule-admin";
import * as backupSchedulerService from "@/services/backup-scheduler";
import type { BackupSchedule } from "@/types/server";
import styles from "./backup-schedule-manager.module.css";

interface BackupScheduleManagerProps {
  serverId?: number;
  userRole?: string;
  className?: string;
}

type TabId = "overview" | "settings" | "history" | "admin";

interface Tab {
  id: TabId;
  label: string;
  requiresAdmin?: boolean;
}

export function BackupScheduleManager({
  serverId,
  userRole = "user",
  className,
}: BackupScheduleManagerProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<BackupSchedule | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [, setFormMode] = useState<"create" | "edit">("create");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = userRole === "admin" || userRole === "operator";

  const tabs: Tab[] = [
    { id: "overview", label: t("schedules.tabs.overview") },
    { id: "settings", label: t("schedules.tabs.settings") },
    { id: "history", label: t("schedules.tabs.history") },
    ...(isAdmin ? [{ id: "admin" as TabId, label: t("schedules.tabs.admin"), requiresAdmin: true }] : []),
  ];

  const loadSchedules = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await backupSchedulerService.getBackupSchedules(serverId);
      if (result.isOk()) {
        setSchedules(result.value);
      } else {
        setError(result.error.message);
      }
    } catch {
      setError(t("schedules.errors.failedToLoadSchedules"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId]);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setShowForm(false);
    setSelectedSchedule(null);
  };

  const handleCreateSchedule = () => {
    setFormMode("create");
    setSelectedSchedule(null);
    setShowForm(true);
    setActiveTab("settings");
  };

  const handleEditSchedule = (schedule: BackupSchedule) => {
    setFormMode("edit");
    setSelectedSchedule(schedule);
    setShowForm(true);
    setActiveTab("settings");
  };

  const handleFormSave = async (_schedule: BackupSchedule) => {
    setShowForm(false);
    setSelectedSchedule(null);
    await loadSchedules();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setSelectedSchedule(null);
  };

  const handleViewLogs = (_scheduleId: string) => {
    setActiveTab("history");
    // You could pass the scheduleId to the logs component for filtering
  };

  const handleViewBackup = (_backupId: string) => {
    // This could navigate to a backup details view or trigger a download
    // TODO: Implement backup viewing functionality
  };

  const renderTabContent = () => {
    if (activeTab === "settings" && showForm) {
      return (
        <BackupScheduleForm
          serverId={serverId}
          schedule={selectedSchedule}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
          className={styles.tabContent}
        />
      );
    }

    switch (activeTab) {
      case "overview":
        return (
          <BackupScheduleOverview
            serverId={serverId}
            onCreateSchedule={handleCreateSchedule}
            onEditSchedule={handleEditSchedule}
            onViewLogs={handleViewLogs}
          />
        );

      case "settings":
        return (
          <div className={styles.settingsTab}>
            <div className={styles.settingsHeader}>
              <h2>{t("schedules.settings.title")}</h2>
              <p>{t("schedules.settings.description")}</p>
              <button
                onClick={handleCreateSchedule}
                className={styles.createButton}
              >
                {t("schedules.create")}
              </button>
            </div>

            {schedules.length === 0 ? (
              <div className={styles.emptyState}>
                <h3>{t("schedules.settings.noSchedules")}</h3>
                <p>{t("schedules.settings.noSchedulesDescription")}</p>
                <button
                  onClick={handleCreateSchedule}
                  className={styles.createFirstButton}
                >
                  {t("schedules.createFirst")}
                </button>
              </div>
            ) : (
              <div className={styles.schedulesList}>
                <h3>{t("schedules.settings.existingSchedules")}</h3>
                <div className={styles.schedulesGrid}>
                  {schedules.map((schedule) => (
                    <div key={schedule.id} className={styles.scheduleCard}>
                      <div className={styles.scheduleCardHeader}>
                        <h4>{schedule.name}</h4>
                        <div
                          className={`${styles.scheduleStatus} ${
                            schedule.enabled ? styles.enabled : styles.disabled
                          }`}
                        >
                          {schedule.enabled
                            ? t("schedules.status.enabled")
                            : t("schedules.status.disabled")}
                        </div>
                      </div>
                      {schedule.description && (
                        <p className={styles.scheduleDescription}>
                          {schedule.description}
                        </p>
                      )}
                      <div className={styles.scheduleInfo}>
                        <div className={styles.scheduleDetail}>
                          <span className={styles.label}>
                            {t("schedules.overview.interval")}:
                          </span>
                          <span>{schedule.interval_hours}h</span>
                        </div>
                        <div className={styles.scheduleDetail}>
                          <span className={styles.label}>
                            {t("schedules.overview.maxBackups")}:
                          </span>
                          <span>{schedule.max_backups}</span>
                        </div>
                      </div>
                      <div className={styles.scheduleActions}>
                        <button
                          onClick={() => handleEditSchedule(schedule)}
                          className={styles.editButton}
                        >
                          {t("schedules.edit")}
                        </button>
                        <button
                          onClick={() => handleViewLogs(schedule.id)}
                          className={styles.viewLogsButton}
                        >
                          {t("schedules.viewLogs")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case "history":
        return (
          <BackupScheduleLogs
            serverId={serverId}
            schedules={schedules}
            onViewBackup={handleViewBackup}
          />
        );

      case "admin":
        if (!isAdmin) {
          return (
            <div className={styles.accessDenied}>
              <h2>{t("schedules.admin.accessDenied")}</h2>
              <p>{t("schedules.admin.accessDeniedDescription")}</p>
            </div>
          );
        }
        return <BackupScheduleAdmin />;

      default:
        return null;
    }
  };

  if (isLoading && schedules.length === 0) {
    return (
      <div className={`${styles.container} ${className || ""}`}>
        <div className={styles.loading}>{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className || ""}`}>
      <div className={styles.header}>
        <h1>{t("schedules.manager.title")}</h1>
        <p>{t("schedules.manager.description")}</p>
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

      <div className={styles.tabsContainer}>
        <div className={styles.tabsList} role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              onClick={() => handleTabChange(tab.id)}
              className={`${styles.tab} ${
                activeTab === tab.id ? styles.tabActive : ""
              }`}
            >
              {tab.label}
              {tab.requiresAdmin && (
                <span className={styles.adminBadge}>
                  {t("schedules.admin.badge")}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className={styles.tabPanels}>
          <div
            id={`tabpanel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            className={styles.tabPanel}
          >
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}