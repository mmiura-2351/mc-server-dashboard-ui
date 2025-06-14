"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/contexts/language";
import * as backupSchedulerService from "@/services/backup-scheduler";
import type { BackupScheduleLog, BackupSchedule } from "@/types/server";
import styles from "./backup-schedule-logs.module.css";

interface BackupScheduleLogsProps {
  serverId?: number;
  scheduleId?: string;
  schedules?: BackupSchedule[];
  onViewBackup?: (backupId: string) => void;
  className?: string;
}

interface LogFilters {
  scheduleId: string;
  status: string;
  dateRange: string;
}

export function BackupScheduleLogs({
  serverId,
  scheduleId,
  schedules = [],
  onViewBackup,
  className,
}: BackupScheduleLogsProps) {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<BackupScheduleLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<BackupScheduleLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<LogFilters>({
    scheduleId: scheduleId || "",
    status: "",
    dateRange: "",
  });

  const statusOptions = [
    { value: "", label: t("schedules.logs.filters.allStatuses") },
    { value: "success", label: t("schedules.logs.status.success") },
    { value: "failed", label: t("schedules.logs.status.failed") },
    { value: "running", label: t("schedules.logs.status.running") },
    { value: "cancelled", label: t("schedules.logs.status.cancelled") },
  ];

  const dateRangeOptions = [
    { value: "", label: t("schedules.logs.filters.allTime") },
    { value: "today", label: t("schedules.logs.filters.today") },
    { value: "week", label: t("schedules.logs.filters.thisWeek") },
    { value: "month", label: t("schedules.logs.filters.thisMonth") },
  ];

  const loadLogs = async (page: number = 1) => {
    setIsLoading(true);
    setError(null);

    try {
      const offset = (page - 1) * pageSize;
      const result = await backupSchedulerService.getBackupScheduleLogs(
        filters.scheduleId || scheduleId,
        serverId,
        pageSize,
        offset
      );

      if (result.isOk()) {
        setLogs(result.value.logs);
        setTotalLogs(result.value.total);
        applyFilters(result.value.logs);
      } else {
        setError(result.error.message);
        setLogs([]);
        setTotalLogs(0);
      }
    } catch {
      setError(t("schedules.logs.errors.failedToLoadLogs"));
      setLogs([]);
      setTotalLogs(0);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = (logsToFilter: BackupScheduleLog[] = logs) => {
    let filtered = [...logsToFilter];

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter((log) => log.status === filters.status);
    }

    // Filter by date range
    if (filters.dateRange) {
      const now = new Date();
      let startDate: Date;

      switch (filters.dateRange) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered.filter((log) => {
        const logDate = new Date(log.started_at);
        return logDate >= startDate;
      });
    }

    setFilteredLogs(filtered);
  };

  useEffect(() => {
    loadLogs(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId, scheduleId, currentPage]);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, logs]);

  useEffect(() => {
    if (scheduleId && filters.scheduleId !== scheduleId) {
      setFilters((prev) => ({ ...prev, scheduleId }));
    }
  }, [scheduleId, filters.scheduleId]);

  const handleFilterChange = (field: keyof LogFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const toggleLogExpansion = (logId: string) => {
    setExpandedLogs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
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

  const formatDuration = (log: BackupScheduleLog) => {
    if (log.status === "running") {
      const now = new Date();
      const started = new Date(log.started_at);
      const durationMs = now.getTime() - started.getTime();
      return backupSchedulerService.formatScheduleDuration(
        Math.floor(durationMs / 1000)
      );
    }
    return backupSchedulerService.formatScheduleDuration(log.duration_seconds);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return t("schedules.logs.noSize");
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

  const getScheduleName = (scheduleId: string) => {
    const schedule = schedules.find((s) => s.id === scheduleId);
    return schedule?.name || scheduleId;
  };

  const totalPages = Math.ceil(totalLogs / pageSize);

  if (isLoading && logs.length === 0) {
    return (
      <div className={`${styles.container} ${className || ""}`}>
        <div className={styles.loading}>{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className || ""}`}>
      <div className={styles.header}>
        <h2>{t("schedules.logs.title")}</h2>
        <p>{t("schedules.logs.description")}</p>
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

      {/* Filters */}
      <div className={styles.filtersSection}>
        <h3>{t("schedules.logs.filters.title")}</h3>
        <div className={styles.filtersGrid}>
          {schedules.length > 0 && !scheduleId && (
            <div className={styles.filterField}>
              <label className={styles.filterLabel}>
                {t("schedules.logs.filters.schedule")}
              </label>
              <select
                value={filters.scheduleId}
                onChange={(e) =>
                  handleFilterChange("scheduleId", e.target.value)
                }
                className={styles.filterSelect}
              >
                <option value="">
                  {t("schedules.logs.filters.allSchedules")}
                </option>
                {schedules.map((schedule) => (
                  <option key={schedule.id} value={schedule.id}>
                    {schedule.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.filterField}>
            <label className={styles.filterLabel}>
              {t("schedules.logs.filters.status")}
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className={styles.filterSelect}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterField}>
            <label className={styles.filterLabel}>
              {t("schedules.logs.filters.dateRange")}
            </label>
            <select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange("dateRange", e.target.value)}
              className={styles.filterSelect}
            >
              {dateRangeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterActions}>
            <button
              onClick={() => loadLogs(currentPage)}
              className={styles.refreshButton}
              disabled={isLoading}
            >
              {t("common.refresh")}
            </button>
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className={styles.logsSection}>
        <div className={styles.logsHeader}>
          <h3>{t("schedules.logs.logsList")}</h3>
          <div className={styles.logsInfo}>
            {filteredLogs.length !== totalLogs
              ? t("schedules.logs.showingFiltered", {
                  showing: filteredLogs.length.toString(),
                  total: totalLogs.toString(),
                })
              : t("schedules.logs.showingTotal", {
                  total: totalLogs.toString(),
                })}
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className={styles.noLogs}>
            <p>{t("schedules.logs.noLogsFound")}</p>
          </div>
        ) : (
          <div className={styles.logsList}>
            {filteredLogs.map((log) => (
              <div key={log.id} className={styles.logItem}>
                <div className={styles.logHeader}>
                  <div className={styles.logMainInfo}>
                    <div className={styles.logTitle}>
                      {!scheduleId && (
                        <span className={styles.scheduleName}>
                          {getScheduleName(log.schedule_id)}
                        </span>
                      )}
                      <span
                        className={styles.logStatus}
                        style={{ color: getStatusColor(log.status) }}
                      >
                        {t(`schedules.logs.status.${log.status}`)}
                      </span>
                    </div>
                    <div className={styles.logMeta}>
                      <span>{formatDate(log.started_at)}</span>
                      <span>{formatDuration(log)}</span>
                      {log.backup_size_bytes && (
                        <span>{formatFileSize(log.backup_size_bytes)}</span>
                      )}
                    </div>
                  </div>
                  <div className={styles.logActions}>
                    {log.backup_id && onViewBackup && (
                      <button
                        onClick={() => onViewBackup(log.backup_id!)}
                        className={styles.viewBackupButton}
                      >
                        {t("schedules.logs.viewBackup")}
                      </button>
                    )}
                    <button
                      onClick={() => toggleLogExpansion(log.id)}
                      className={styles.expandButton}
                    >
                      {expandedLogs.has(log.id)
                        ? t("schedules.logs.collapse")
                        : t("schedules.logs.expand")}
                    </button>
                  </div>
                </div>

                {expandedLogs.has(log.id) && (
                  <div className={styles.logDetails}>
                    {log.error_message && (
                      <div className={styles.errorMessage}>
                        <strong>{t("schedules.logs.errorMessage")}:</strong>
                        <pre>{log.error_message}</pre>
                      </div>
                    )}

                    {log.logs && log.logs.length > 0 && (
                      <div className={styles.logOutput}>
                        <strong>{t("schedules.logs.output")}:</strong>
                        <div className={styles.logLines}>
                          {log.logs.map((line, index) => (
                            <div key={index} className={styles.logLine}>
                              {line}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className={styles.logMetadata}>
                      <div className={styles.metadataItem}>
                        <strong>{t("schedules.logs.logId")}:</strong> {log.id}
                      </div>
                      {log.completed_at && (
                        <div className={styles.metadataItem}>
                          <strong>{t("schedules.logs.completedAt")}:</strong>{" "}
                          {formatDate(log.completed_at)}
                        </div>
                      )}
                      {log.backup_id && (
                        <div className={styles.metadataItem}>
                          <strong>{t("schedules.logs.backupId")}:</strong>{" "}
                          {log.backup_id}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={styles.paginationButton}
            >
              {t("schedules.logs.pagination.previous")}
            </button>

            <div className={styles.paginationInfo}>
              {t("schedules.logs.pagination.pageInfo", {
                current: currentPage.toString(),
                total: totalPages.toString(),
              })}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={styles.paginationButton}
            >
              {t("schedules.logs.pagination.next")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
