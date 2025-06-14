"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/contexts/language";
import * as backupSchedulerService from "@/services/backup-scheduler";
import * as serverService from "@/services/server";
import type {
  BackupSchedule,
  SchedulerStatus,
  MinecraftServer,
  BackupScheduleLog,
} from "@/types/server";
import styles from "./backup-schedule-admin.module.css";

interface BackupScheduleAdminProps {
  className?: string;
}

interface SystemStats {
  totalServers: number;
  serversWithSchedules: number;
  totalSchedules: number;
  activeSchedules: number;
  recentSuccessfulBackups: number;
  recentFailedBackups: number;
  totalBackupsToday: number;
  averageBackupSize: number;
}

export function BackupScheduleAdmin({ className }: BackupScheduleAdminProps) {
  const { t } = useTranslation();
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [servers, setServers] = useState<MinecraftServer[]>([]);
  const [schedulerStatus, setSchedulerStatus] =
    useState<SchedulerStatus | null>(null);
  const [recentLogs, setRecentLogs] = useState<BackupScheduleLog[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());

  const loadAllData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [schedulesResult, serversResult, statusResult, logsResult] =
        await Promise.all([
          backupSchedulerService.getBackupSchedules(),
          serverService.getServers(),
          backupSchedulerService.getSchedulerStatus(),
          backupSchedulerService.getBackupScheduleLogs(
            undefined,
            undefined,
            10
          ),
        ]);

      if (schedulesResult.isOk()) {
        setSchedules(schedulesResult.value);
      } else {
        console.warn(
          "Failed to load schedules:",
          schedulesResult.error.message
        );
      }

      if (serversResult.isOk()) {
        setServers(serversResult.value);
      } else {
        console.warn("Failed to load servers:", serversResult.error.message);
      }

      if (statusResult.isOk()) {
        setSchedulerStatus(statusResult.value);
      } else {
        console.warn(
          "Failed to load scheduler status:",
          statusResult.error.message
        );
      }

      if (logsResult.isOk()) {
        setRecentLogs(logsResult.value.logs);
      } else {
        console.warn("Failed to load recent logs:", logsResult.error.message);
      }

      // Calculate stats
      if (schedulesResult.isOk() && serversResult.isOk() && logsResult.isOk()) {
        calculateStats(
          schedulesResult.value,
          serversResult.value,
          logsResult.value.logs
        );
      }
    } catch {
      setError(t("schedules.admin.errors.failedToLoadData"));
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (
    schedulesList: BackupSchedule[],
    serversList: MinecraftServer[],
    logsList: BackupScheduleLog[]
  ) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const serversWithSchedules = new Set(schedulesList.map((s) => s.server_id))
      .size;

    const activeSchedules = schedulesList.filter((s) => s.enabled).length;

    const todayLogs = logsList.filter((log) => {
      const logDate = new Date(log.started_at);
      logDate.setHours(0, 0, 0, 0);
      return logDate.getTime() === today.getTime();
    });

    const recentSuccessfulBackups = logsList.filter(
      (log) => log.status === "success"
    ).length;

    const recentFailedBackups = logsList.filter(
      (log) => log.status === "failed"
    ).length;

    const successfulLogsWithSize = logsList.filter(
      (log) => log.status === "success" && log.backup_size_bytes
    );

    const averageBackupSize =
      successfulLogsWithSize.length > 0
        ? successfulLogsWithSize.reduce(
            (sum, log) => sum + (log.backup_size_bytes || 0),
            0
          ) / successfulLogsWithSize.length
        : 0;

    setStats({
      totalServers: serversList.length,
      serversWithSchedules,
      totalSchedules: schedulesList.length,
      activeSchedules,
      recentSuccessfulBackups,
      recentFailedBackups,
      totalBackupsToday: todayLogs.length,
      averageBackupSize,
    });
  };

  useEffect(() => {
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSchedulerAction = async (
    action: "start" | "stop" | "restart"
  ) => {
    setActionLoading((prev) => new Set(prev).add("scheduler"));
    setError(null);

    try {
      let result;
      switch (action) {
        case "start":
          result = await backupSchedulerService.startScheduler();
          break;
        case "stop":
          result = await backupSchedulerService.stopScheduler();
          break;
        case "restart":
          result = await backupSchedulerService.restartScheduler();
          break;
      }

      if (result.isOk()) {
        await loadAllData();
      } else {
        setError(result.error.message);
      }
    } catch {
      setError(t("schedules.admin.errors.schedulerActionFailed", { action }));
    } finally {
      setActionLoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete("scheduler");
        return newSet;
      });
    }
  };

  const handleBulkToggleSchedules = async (enabled: boolean) => {
    const schedulesToToggle = schedules.filter((s) => s.enabled !== enabled);

    if (schedulesToToggle.length === 0) {
      return;
    }

    if (
      !confirm(
        enabled
          ? t("schedules.admin.enableAllConfirmation", {
              count: schedulesToToggle.length.toString(),
            })
          : t("schedules.admin.disableAllConfirmation", {
              count: schedulesToToggle.length.toString(),
            })
      )
    ) {
      return;
    }

    setActionLoading((prev) => new Set(prev).add("bulk-toggle"));
    setError(null);

    try {
      const promises = schedulesToToggle.map((schedule) =>
        enabled
          ? backupSchedulerService.enableBackupSchedule(schedule.id)
          : backupSchedulerService.disableBackupSchedule(schedule.id)
      );

      await Promise.all(promises);
      await loadAllData();
    } catch {
      setError(
        enabled
          ? t("schedules.admin.errors.failedToEnableSchedules")
          : t("schedules.admin.errors.failedToDisableSchedules")
      );
    } finally {
      setActionLoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete("bulk-toggle");
        return newSet;
      });
    }
  };

  const handleDeleteSchedule = async (schedule: BackupSchedule) => {
    if (
      !confirm(
        t("schedules.admin.deleteScheduleConfirmation", { name: schedule.name })
      )
    ) {
      return;
    }

    setActionLoading((prev) => new Set(prev).add(schedule.id));
    setError(null);

    try {
      const result = await backupSchedulerService.deleteBackupSchedule(
        schedule.id
      );

      if (result.isOk()) {
        await loadAllData();
      } else {
        setError(result.error.message);
      }
    } catch {
      setError(
        t("schedules.admin.errors.failedToDeleteSchedule", {
          name: schedule.name,
        })
      );
    } finally {
      setActionLoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(schedule.id);
        return newSet;
      });
    }
  };

  const getServerName = (serverId: number) => {
    const server = servers.find((s) => s.id === serverId);
    return server?.name || `Server ${serverId}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100} ${sizes[i]}`;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: BackupScheduleLog["status"]) => {
    switch (status) {
      case "success":
        return "var(--color-green-600)";
      case "failed":
        return "var(--color-red-600)";
      case "running":
        return "var(--color-blue-600)";
      case "cancelled":
        return "var(--color-yellow-600)";
      default:
        return "var(--color-gray-600)";
    }
  };

  if (isLoading) {
    return (
      <div className={`${styles.container} ${className || ""}`}>
        <div className={styles.loading}>{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className || ""}`}>
      <div className={styles.header}>
        <h1>{t("schedules.admin.title")}</h1>
        <p>{t("schedules.admin.description")}</p>
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

      {/* System Statistics */}
      {stats && (
        <div className={styles.statsSection}>
          <h2>{t("schedules.admin.systemStats")}</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.totalServers}</div>
              <div className={styles.statLabel}>
                {t("schedules.admin.stats.totalServers")}
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>
                {stats.serversWithSchedules}
              </div>
              <div className={styles.statLabel}>
                {t("schedules.admin.stats.serversWithSchedules")}
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.totalSchedules}</div>
              <div className={styles.statLabel}>
                {t("schedules.admin.stats.totalSchedules")}
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.activeSchedules}</div>
              <div className={styles.statLabel}>
                {t("schedules.admin.stats.activeSchedules")}
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.totalBackupsToday}</div>
              <div className={styles.statLabel}>
                {t("schedules.admin.stats.backupsToday")}
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>
                {formatFileSize(stats.averageBackupSize)}
              </div>
              <div className={styles.statLabel}>
                {t("schedules.admin.stats.averageBackupSize")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scheduler Control */}
      <div className={styles.schedulerSection}>
        <div className={styles.schedulerHeader}>
          <h2>{t("schedules.admin.schedulerControl")}</h2>
          <div className={styles.schedulerActions}>
            <button
              onClick={() => handleSchedulerAction("start")}
              disabled={
                actionLoading.has("scheduler") || schedulerStatus?.running
              }
              className={`${styles.actionButton} ${styles.startButton}`}
            >
              {t("schedules.admin.startScheduler")}
            </button>
            <button
              onClick={() => handleSchedulerAction("stop")}
              disabled={
                actionLoading.has("scheduler") || !schedulerStatus?.running
              }
              className={`${styles.actionButton} ${styles.stopButton}`}
            >
              {t("schedules.admin.stopScheduler")}
            </button>
            <button
              onClick={() => handleSchedulerAction("restart")}
              disabled={actionLoading.has("scheduler")}
              className={styles.actionButton}
            >
              {t("schedules.admin.restartScheduler")}
            </button>
          </div>
        </div>

        {schedulerStatus && (
          <div className={styles.schedulerStatus}>
            <div className={styles.statusItem}>
              <div className={styles.statusLabel}>
                {t("schedules.admin.schedulerStatus")}
              </div>
              <div
                className={`${styles.statusValue} ${
                  schedulerStatus.running
                    ? styles.statusActive
                    : styles.statusInactive
                }`}
              >
                {schedulerStatus.running
                  ? t("schedules.admin.running")
                  : t("schedules.admin.stopped")}
              </div>
            </div>
            {schedulerStatus.last_check_at && (
              <div className={styles.statusItem}>
                <div className={styles.statusLabel}>
                  {t("schedules.admin.lastCheck")}
                </div>
                <div className={styles.statusValue}>
                  {formatDate(schedulerStatus.last_check_at)}
                </div>
              </div>
            )}
            {schedulerStatus.next_check_at && (
              <div className={styles.statusItem}>
                <div className={styles.statusLabel}>
                  {t("schedules.admin.nextCheck")}
                </div>
                <div className={styles.statusValue}>
                  {formatDate(schedulerStatus.next_check_at)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* All Schedules Management */}
      <div className={styles.schedulesSection}>
        <div className={styles.schedulesHeader}>
          <h2>{t("schedules.admin.allSchedules")}</h2>
          <div className={styles.bulkActions}>
            <button
              onClick={() => handleBulkToggleSchedules(true)}
              disabled={actionLoading.has("bulk-toggle")}
              className={`${styles.actionButton} ${styles.enableButton}`}
            >
              {t("schedules.admin.enableAll")}
            </button>
            <button
              onClick={() => handleBulkToggleSchedules(false)}
              disabled={actionLoading.has("bulk-toggle")}
              className={`${styles.actionButton} ${styles.disableButton}`}
            >
              {t("schedules.admin.disableAll")}
            </button>
            <button
              onClick={loadAllData}
              disabled={isLoading}
              className={styles.actionButton}
            >
              {t("common.refresh")}
            </button>
          </div>
        </div>

        {schedules.length === 0 ? (
          <div className={styles.noSchedules}>
            <p>{t("schedules.admin.noSchedulesFound")}</p>
          </div>
        ) : (
          <div className={styles.schedulesList}>
            {schedules.map((schedule) => (
              <div key={schedule.id} className={styles.scheduleItem}>
                <div className={styles.scheduleInfo}>
                  <div className={styles.scheduleHeader}>
                    <h4 className={styles.scheduleName}>{schedule.name}</h4>
                    <div className={styles.scheduleServer}>
                      {getServerName(schedule.server_id)}
                    </div>
                    <div
                      className={styles.scheduleStatus}
                      style={{
                        color: schedule.enabled
                          ? "var(--color-green-600)"
                          : "var(--color-red-600)",
                      }}
                    >
                      {schedule.enabled
                        ? t("schedules.admin.enabled")
                        : t("schedules.admin.disabled")}
                    </div>
                  </div>
                  {schedule.description && (
                    <p className={styles.scheduleDescription}>
                      {schedule.description}
                    </p>
                  )}
                  <div className={styles.scheduleDetails}>
                    <span>
                      {t("schedules.admin.interval")}: {schedule.interval_hours}
                      h
                    </span>
                    <span>
                      {t("schedules.admin.maxBackups")}: {schedule.max_backups}
                    </span>
                    {schedule.last_run_at && (
                      <span>
                        {t("schedules.admin.lastRun")}:{" "}
                        {formatDate(schedule.last_run_at)}
                      </span>
                    )}
                    {schedule.next_run_at && (
                      <span>
                        {t("schedules.admin.nextRun")}:{" "}
                        {formatDate(schedule.next_run_at)}
                      </span>
                    )}
                  </div>
                </div>
                <div className={styles.scheduleActions}>
                  <button
                    onClick={() => handleDeleteSchedule(schedule)}
                    disabled={actionLoading.has(schedule.id)}
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                  >
                    {actionLoading.has(schedule.id)
                      ? t("common.loading")
                      : t("schedules.admin.delete")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className={styles.activitySection}>
        <h2>{t("schedules.admin.recentActivity")}</h2>
        {recentLogs.length === 0 ? (
          <div className={styles.noActivity}>
            <p>{t("schedules.admin.noRecentActivity")}</p>
          </div>
        ) : (
          <div className={styles.activityList}>
            {recentLogs.map((log) => (
              <div key={log.id} className={styles.activityItem}>
                <div className={styles.activityInfo}>
                  <div className={styles.activityHeader}>
                    <span className={styles.activitySchedule}>
                      {schedules.find((s) => s.id === log.schedule_id)?.name ||
                        log.schedule_id}
                    </span>
                    <span className={styles.activityServer}>
                      {getServerName(log.server_id)}
                    </span>
                    <span
                      className={styles.activityStatus}
                      style={{ color: getStatusColor(log.status) }}
                    >
                      {t(`schedules.admin.status.${log.status}`)}
                    </span>
                  </div>
                  <div className={styles.activityMeta}>
                    <span>{formatDate(log.started_at)}</span>
                    {log.duration_seconds && (
                      <span>
                        {backupSchedulerService.formatScheduleDuration(
                          log.duration_seconds
                        )}
                      </span>
                    )}
                    {log.backup_size_bytes && (
                      <span>{formatFileSize(log.backup_size_bytes)}</span>
                    )}
                  </div>
                  {log.error_message && (
                    <div className={styles.activityError}>
                      {log.error_message}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
