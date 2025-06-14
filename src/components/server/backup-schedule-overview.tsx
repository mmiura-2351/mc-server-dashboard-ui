"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/contexts/language";
import * as backupSchedulerService from "@/services/backup-scheduler";
import type { BackupSchedule, SchedulerStatus } from "@/types/server";
import styles from "./backup-schedule-overview.module.css";

interface BackupScheduleOverviewProps {
  serverId?: number;
  onCreateSchedule?: () => void;
  onEditSchedule?: (schedule: BackupSchedule) => void;
  onViewLogs?: (scheduleId: string) => void;
}

export function BackupScheduleOverview({
  serverId,
  onCreateSchedule,
  onEditSchedule,
  onViewLogs,
}: BackupScheduleOverviewProps) {
  const { t } = useTranslation();
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [schedulesResult, statusResult] = await Promise.all([
        backupSchedulerService.getBackupSchedules(serverId),
        backupSchedulerService.getSchedulerStatus(),
      ]);

      if (schedulesResult.isOk()) {
        setSchedules(schedulesResult.value);
      } else {
        setError(schedulesResult.error.message);
      }

      if (statusResult.isOk()) {
        setSchedulerStatus(statusResult.value);
      } else {
        console.warn("Failed to load scheduler status:", statusResult.error.message);
      }
    } catch {
      setError(t("schedules.errors.failedToLoadSchedules"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId]);

  const handleToggleSchedule = async (schedule: BackupSchedule) => {
    const scheduleId = schedule.id;
    setActionLoading((prev) => new Set(prev).add(scheduleId));
    setError(null);

    try {
      const result = schedule.enabled
        ? await backupSchedulerService.disableBackupSchedule(scheduleId)
        : await backupSchedulerService.enableBackupSchedule(scheduleId);

      if (result.isOk()) {
        await loadData();
      } else {
        setError(result.error.message);
      }
    } catch {
      setError(
        t("schedules.errors.failedToToggleSchedule", { name: schedule.name })
      );
    } finally {
      setActionLoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(scheduleId);
        return newSet;
      });
    }
  };

  const handleTriggerSchedule = async (schedule: BackupSchedule) => {
    const scheduleId = schedule.id;
    setActionLoading((prev) => new Set(prev).add(scheduleId));
    setError(null);

    try {
      const result = await backupSchedulerService.triggerBackupSchedule(
        scheduleId
      );

      if (result.isOk()) {
        await loadData();
      } else {
        setError(result.error.message);
      }
    } catch {
      setError(
        t("schedules.errors.failedToTriggerSchedule", { name: schedule.name })
      );
    } finally {
      setActionLoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(scheduleId);
        return newSet;
      });
    }
  };

  const handleDeleteSchedule = async (schedule: BackupSchedule) => {
    if (
      !confirm(
        t("schedules.deleteConfirmation", { name: schedule.name })
      )
    ) {
      return;
    }

    const scheduleId = schedule.id;
    setActionLoading((prev) => new Set(prev).add(scheduleId));
    setError(null);

    try {
      const result = await backupSchedulerService.deleteBackupSchedule(
        scheduleId
      );

      if (result.isOk()) {
        await loadData();
      } else {
        setError(result.error.message);
      }
    } catch {
      setError(
        t("schedules.errors.failedToDeleteSchedule", { name: schedule.name })
      );
    } finally {
      setActionLoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(scheduleId);
        return newSet;
      });
    }
  };

  const formatNextRunTime = (nextRunAt?: string) => {
    if (!nextRunAt) return t("schedules.status.never");
    
    try {
      const nextRun = new Date(nextRunAt);
      const now = new Date();
      const diffMs = nextRun.getTime() - now.getTime();
      
      if (diffMs < 0) return t("schedules.status.overdue");
      
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffDays > 0) {
        return t("schedules.status.nextRunInDays", { days: diffDays });
      } else if (diffHours > 0) {
        return t("schedules.status.nextRunInHours", { hours: diffHours });
      } else {
        return t("schedules.status.nextRunInMinutes", { minutes: diffMinutes });
      }
    } catch {
      return t("schedules.status.unknown");
    }
  };

  const getScheduleStatusColor = (schedule: BackupSchedule) => {
    if (!schedule.enabled) return "var(--color-gray-500)";
    return "var(--color-green-500)";
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerText}>
            <h2>{t("schedules.overview.title")}</h2>
            <p>{t("schedules.overview.description")}</p>
          </div>
          <div className={styles.headerActions}>
            {onCreateSchedule && (
              <button
                onClick={onCreateSchedule}
                className={styles.createButton}
              >
                {t("schedules.create")}
              </button>
            )}
          </div>
        </div>
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

      {/* Scheduler Status */}
      {schedulerStatus && (
        <div className={styles.statusSection}>
          <div className={styles.statusHeader}>
            <h3>{t("schedules.scheduler.title")}</h3>
          </div>
          <div className={styles.statusGrid}>
            <div className={styles.statusItem}>
              <div className={styles.statusLabel}>
                {t("schedules.scheduler.status")}
              </div>
              <div
                className={`${styles.statusValue} ${
                  schedulerStatus.running ? styles.statusActive : styles.statusInactive
                }`}
              >
                {schedulerStatus.running
                  ? t("schedules.scheduler.running")
                  : t("schedules.scheduler.stopped")}
              </div>
            </div>
            <div className={styles.statusItem}>
              <div className={styles.statusLabel}>
                {t("schedules.scheduler.totalSchedules")}
              </div>
              <div className={styles.statusValue}>
                {schedulerStatus.total_schedules}
              </div>
            </div>
            <div className={styles.statusItem}>
              <div className={styles.statusLabel}>
                {t("schedules.scheduler.activeSchedules")}
              </div>
              <div className={styles.statusValue}>
                {schedulerStatus.active_schedules}
              </div>
            </div>
            {schedulerStatus.current_jobs.length > 0 && (
              <div className={styles.statusItem}>
                <div className={styles.statusLabel}>
                  {t("schedules.scheduler.runningJobs")}
                </div>
                <div className={styles.statusValue}>
                  {schedulerStatus.current_jobs.length}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Schedules List */}
      <div className={styles.schedulesSection}>
        <h3>{t("schedules.overview.schedulesList")}</h3>
        {schedules.length === 0 ? (
          <div className={styles.noSchedules}>
            <p>{t("schedules.overview.noSchedulesFound")}</p>
            {onCreateSchedule && (
              <button
                onClick={onCreateSchedule}
                className={styles.createFirstButton}
              >
                {t("schedules.createFirst")}
              </button>
            )}
          </div>
        ) : (
          <div className={styles.schedulesList}>
            {schedules.map((schedule) => (
              <div key={schedule.id} className={styles.scheduleItem}>
                <div className={styles.scheduleInfo}>
                  <div className={styles.scheduleHeader}>
                    <h4 className={styles.scheduleName}>{schedule.name}</h4>
                    <div
                      className={styles.scheduleStatus}
                      style={{ color: getScheduleStatusColor(schedule) }}
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
                  <div className={styles.scheduleDetails}>
                    <span className={styles.scheduleDetail}>
                      {t("schedules.overview.interval")}: {schedule.interval_hours}h
                    </span>
                    <span className={styles.scheduleDetail}>
                      {t("schedules.overview.maxBackups")}: {schedule.max_backups}
                    </span>
                    <span className={styles.scheduleDetail}>
                      {t("schedules.overview.nextRun")}: {formatNextRunTime(schedule.next_run_at)}
                    </span>
                  </div>
                </div>
                <div className={styles.scheduleActions}>
                  <button
                    onClick={() => handleToggleSchedule(schedule)}
                    disabled={actionLoading.has(schedule.id)}
                    className={`${styles.actionButton} ${
                      schedule.enabled ? styles.disableButton : styles.enableButton
                    }`}
                  >
                    {actionLoading.has(schedule.id)
                      ? t("common.loading")
                      : schedule.enabled
                      ? t("schedules.disable")
                      : t("schedules.enable")}
                  </button>
                  {schedule.enabled && (
                    <button
                      onClick={() => handleTriggerSchedule(schedule)}
                      disabled={actionLoading.has(schedule.id)}
                      className={styles.actionButton}
                    >
                      {actionLoading.has(schedule.id)
                        ? t("common.loading")
                        : t("schedules.runNow")}
                    </button>
                  )}
                  {onEditSchedule && (
                    <button
                      onClick={() => onEditSchedule(schedule)}
                      className={styles.actionButton}
                    >
                      {t("schedules.edit")}
                    </button>
                  )}
                  {onViewLogs && (
                    <button
                      onClick={() => onViewLogs(schedule.id)}
                      className={styles.actionButton}
                    >
                      {t("schedules.viewLogs")}
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteSchedule(schedule)}
                    disabled={actionLoading.has(schedule.id)}
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                  >
                    {t("schedules.delete")}
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