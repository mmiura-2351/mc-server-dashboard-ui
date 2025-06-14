"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "@/contexts/language";
import * as backupSchedulerService from "@/services/backup-scheduler";
import type {
  BackupSchedule,
  BackupScheduleCreateRequest,
  BackupScheduleUpdateRequest,
} from "@/types/server";
import styles from "./backup-schedule-form.module.css";

interface BackupScheduleFormProps {
  serverId?: number;
  schedule?: BackupSchedule | null;
  onSave?: (schedule: BackupSchedule) => void;
  onCancel?: () => void;
  className?: string;
}

interface FormData {
  name: string;
  description: string;
  enabled: boolean;
  intervalType: "preset" | "custom";
  intervalHours: number;
  customCron: string;
  maxBackups: number;
  onlyWhenRunning: boolean;
}

export function BackupScheduleForm({
  serverId,
  schedule,
  onSave,
  onCancel,
  className,
}: BackupScheduleFormProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    enabled: true,
    intervalType: "preset",
    intervalHours: 24,
    customCron: "",
    maxBackups: 7,
    onlyWhenRunning: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Predefined interval options
  const intervalOptions = useMemo(
    () => [
      { value: 1, label: t("schedules.intervals.hourly") },
      { value: 6, label: t("schedules.intervals.6hours") },
      { value: 12, label: t("schedules.intervals.12hours") },
      { value: 24, label: t("schedules.intervals.daily") },
      { value: 48, label: t("schedules.intervals.2days") },
      { value: 168, label: t("schedules.intervals.weekly") },
    ],
    [t]
  );

  // Initialize form data when schedule prop changes
  useEffect(() => {
    if (schedule) {
      setIsEditMode(true);
      const intervalHours = schedule.interval_hours || 24;
      const hasPresetInterval = intervalOptions.some(
        (option) => option.value === intervalHours
      );

      setFormData({
        name: schedule.name,
        description: schedule.description || "",
        enabled: schedule.enabled,
        intervalType: hasPresetInterval ? "preset" : "custom",
        intervalHours: hasPresetInterval ? intervalHours : 24,
        customCron: hasPresetInterval ? "" : schedule.cron_expression,
        maxBackups: schedule.max_backups,
        onlyWhenRunning: schedule.only_when_running,
      });
    } else {
      setIsEditMode(false);
      setFormData({
        name: "",
        description: "",
        enabled: true,
        intervalType: "preset",
        intervalHours: 24,
        customCron: "",
        maxBackups: 7,
        onlyWhenRunning: true,
      });
    }
    setErrors({});
    setSubmitError(null);
  }, [schedule, intervalOptions]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t("schedules.validation.nameRequired");
    } else if (formData.name.length > 100) {
      newErrors.name = t("schedules.validation.nameTooLong");
    }

    if (formData.description.length > 500) {
      newErrors.description = t("schedules.validation.descriptionTooLong");
    }

    if (formData.intervalType === "custom") {
      if (!formData.customCron.trim()) {
        newErrors.customCron = t("schedules.validation.cronRequired");
      } else {
        // Basic cron validation (you might want to use a proper cron validator)
        const cronParts = formData.customCron.trim().split(/\s+/);
        if (cronParts.length !== 5) {
          newErrors.customCron = t("schedules.validation.cronInvalid");
        }
      }
    }

    if (
      isNaN(formData.maxBackups) ||
      formData.maxBackups < 1 ||
      formData.maxBackups > 100
    ) {
      newErrors.maxBackups = t("schedules.validation.maxBackupsRange");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!serverId && !schedule?.server_id) {
      setSubmitError(t("schedules.validation.serverRequired"));
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const requestData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        enabled: formData.enabled,
        max_backups: formData.maxBackups,
        only_when_running: formData.onlyWhenRunning,
        ...(formData.intervalType === "preset"
          ? {
              interval_hours: formData.intervalHours,
              cron_expression: backupSchedulerService.generateCronExpression(
                formData.intervalHours
              ),
            }
          : {
              cron_expression: formData.customCron.trim(),
            }),
      };

      let result;
      if (isEditMode && schedule) {
        result = await backupSchedulerService.updateBackupSchedule(
          schedule.id,
          requestData as BackupScheduleUpdateRequest
        );
      } else {
        const createData: BackupScheduleCreateRequest = {
          server_id: serverId || schedule!.server_id,
          ...requestData,
        };
        result = await backupSchedulerService.createBackupSchedule(createData);
      }

      if (result.isOk()) {
        onSave?.(result.value);
      } else {
        setSubmitError(result.error.message);
      }
    } catch {
      setSubmitError(
        isEditMode
          ? t("schedules.errors.failedToUpdateSchedule")
          : t("schedules.errors.failedToCreateSchedule")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    field: keyof FormData,
    value: string | number | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const getNextRunPreview = () => {
    if (formData.intervalType === "preset") {
      const cronExpression = backupSchedulerService.generateCronExpression(
        formData.intervalHours
      );
      const nextRun = backupSchedulerService.getNextRunTime(cronExpression);
      if (nextRun) {
        return nextRun.toLocaleString();
      }
    }
    return t("schedules.form.nextRunUnknown");
  };

  return (
    <div className={`${styles.container} ${className || ""}`}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.header}>
          <h2>
            {isEditMode
              ? t("schedules.form.editTitle")
              : t("schedules.form.createTitle")}
          </h2>
          <p>{t("schedules.form.description")}</p>
        </div>

        {submitError && (
          <div className={styles.error}>
            {submitError}
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              className={styles.dismissButton}
            >
              ×
            </button>
          </div>
        )}

        <div className={styles.formGrid}>
          {/* Basic Information */}
          <div className={styles.section}>
            <h3>{t("schedules.form.basicInfo")}</h3>

            <div className={styles.field}>
              <label htmlFor="name" className={styles.label}>
                {t("schedules.form.name")}
                <span className={styles.required}>*</span>
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
                placeholder={t("schedules.form.namePlaceholder")}
                maxLength={100}
              />
              {errors.name && (
                <div className={styles.fieldError}>{errors.name}</div>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="description" className={styles.label}>
                {t("schedules.form.description")}
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                className={`${styles.textarea} ${errors.description ? styles.inputError : ""}`}
                placeholder={t("schedules.form.descriptionPlaceholder")}
                rows={3}
                maxLength={500}
              />
              {errors.description && (
                <div className={styles.fieldError}>{errors.description}</div>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) =>
                    handleInputChange("enabled", e.target.checked)
                  }
                  className={styles.checkbox}
                />
                {t("schedules.form.enabled")}
              </label>
            </div>
          </div>

          {/* Schedule Configuration */}
          <div className={styles.section}>
            <h3>{t("schedules.form.scheduleConfig")}</h3>

            <div className={styles.field}>
              <label className={styles.label}>
                {t("schedules.form.intervalType")}
              </label>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="intervalType"
                    value="preset"
                    checked={formData.intervalType === "preset"}
                    onChange={() => handleInputChange("intervalType", "preset")}
                    className={styles.radio}
                  />
                  {t("schedules.form.presetInterval")}
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="intervalType"
                    value="custom"
                    checked={formData.intervalType === "custom"}
                    onChange={() => handleInputChange("intervalType", "custom")}
                    className={styles.radio}
                  />
                  {t("schedules.form.customCron")}
                </label>
              </div>
            </div>

            {formData.intervalType === "preset" ? (
              <div className={styles.field}>
                <label htmlFor="intervalHours" className={styles.label}>
                  {t("schedules.form.interval")}
                </label>
                <select
                  id="intervalHours"
                  value={formData.intervalHours}
                  onChange={(e) =>
                    handleInputChange("intervalHours", parseInt(e.target.value))
                  }
                  className={styles.select}
                >
                  {intervalOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className={styles.field}>
                <label htmlFor="customCron" className={styles.label}>
                  {t("schedules.form.cronExpression")}
                  <span className={styles.required}>*</span>
                </label>
                <input
                  id="customCron"
                  type="text"
                  value={formData.customCron}
                  onChange={(e) =>
                    handleInputChange("customCron", e.target.value)
                  }
                  className={`${styles.input} ${errors.customCron ? styles.inputError : ""}`}
                  placeholder="0 */6 * * *"
                />
                {errors.customCron && (
                  <div className={styles.fieldError}>{errors.customCron}</div>
                )}
                <div className={styles.fieldHelp}>
                  {t("schedules.form.cronHelp")}
                </div>
              </div>
            )}

            {formData.intervalType === "preset" && (
              <div className={styles.previewBox}>
                <strong>{t("schedules.form.nextRunPreview")}:</strong>{" "}
                {getNextRunPreview()}
              </div>
            )}
          </div>

          {/* Backup Options */}
          <div className={styles.section}>
            <h3>{t("schedules.form.backupOptions")}</h3>

            <div className={styles.field}>
              <label htmlFor="maxBackups" className={styles.label}>
                {t("schedules.form.maxBackups")}
                <span className={styles.required}>*</span>
              </label>
              <input
                id="maxBackups"
                type="number"
                min="1"
                max="100"
                value={formData.maxBackups}
                onChange={(e) =>
                  handleInputChange("maxBackups", parseInt(e.target.value) || 1)
                }
                className={`${styles.input} ${errors.maxBackups ? styles.inputError : ""}`}
              />
              {errors.maxBackups && (
                <div className={styles.fieldError}>{errors.maxBackups}</div>
              )}
              <div className={styles.fieldHelp}>
                {t("schedules.form.maxBackupsHelp")}
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.onlyWhenRunning}
                  onChange={(e) =>
                    handleInputChange("onlyWhenRunning", e.target.checked)
                  }
                  className={styles.checkbox}
                />
                {t("schedules.form.onlyWhenRunning")}
              </label>
              <div className={styles.fieldHelp}>
                {t("schedules.form.onlyWhenRunningHelp")}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className={styles.cancelButton}
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </button>
          )}
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? t("common.saving")
              : isEditMode
                ? t("schedules.form.updateSchedule")
                : t("schedules.form.createSchedule")}
          </button>
        </div>
      </form>
    </div>
  );
}
