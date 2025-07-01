"use client";

import React, { useState } from "react";
import { useTranslation } from "@/contexts/language";
import { ServerType } from "@/types/server";
import type { CreateServerRequest } from "@/types/server";
import styles from "./CreateServerModal.module.css";

export interface CreateServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateServerRequest) => Promise<void>;
  isSubmitting: boolean;
}

const DEFAULT_FORM_DATA: CreateServerRequest = {
  name: "",
  minecraft_version: "1.21.6",
  server_type: ServerType.VANILLA,
  max_memory: 2048,
  max_players: 20,
  description: "",
  port: 25565,
};

export function CreateServerModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: CreateServerModalProps) {
  const { t } = useTranslation();
  const [formData, setFormData] =
    useState<CreateServerRequest>(DEFAULT_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t("servers.create.errors.nameRequired");
    }

    if (!formData.minecraft_version.trim()) {
      newErrors.minecraft_version = t("servers.create.errors.versionRequired");
    }

    if (formData.max_memory && formData.max_memory < 512) {
      newErrors.max_memory = t("servers.create.errors.memoryTooLow");
    }

    if (formData.max_players && formData.max_players < 1) {
      newErrors.max_players = t("servers.create.errors.playersInvalid");
    }

    if (formData.port && (formData.port < 1 || formData.port > 65535)) {
      newErrors.port = t("servers.create.errors.portInvalid");
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      await onSubmit(formData);
      // Reset form on successful submission
      setFormData(DEFAULT_FORM_DATA);
      setErrors({});
    }
  };

  const handleChange = (
    field: keyof CreateServerRequest,
    value: string | number | ServerType
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleCancel = () => {
    setFormData(DEFAULT_FORM_DATA);
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t("servers.create.title")}</h2>
          <button
            onClick={handleCancel}
            className={styles.closeButton}
            aria-label={t("common.close")}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="server-name" className={styles.label}>
              {t("servers.create.fields.name")} *
            </label>
            <input
              id="server-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
              placeholder={t("servers.create.placeholders.name")}
              disabled={isSubmitting}
            />
            {errors.name && (
              <span className={styles.errorText}>{errors.name}</span>
            )}
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="minecraft-version" className={styles.label}>
                {t("servers.create.fields.version")} *
              </label>
              <input
                id="minecraft-version"
                type="text"
                value={formData.minecraft_version}
                onChange={(e) =>
                  handleChange("minecraft_version", e.target.value)
                }
                className={`${styles.input} ${errors.minecraft_version ? styles.inputError : ""}`}
                placeholder={t("servers.create.placeholders.version")}
                disabled={isSubmitting}
              />
              {errors.minecraft_version && (
                <span className={styles.errorText}>
                  {errors.minecraft_version}
                </span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="server-type" className={styles.label}>
                {t("servers.create.fields.type")}
              </label>
              <select
                id="server-type"
                value={formData.server_type}
                onChange={(e) =>
                  handleChange("server_type", e.target.value as ServerType)
                }
                className={styles.select}
                disabled={isSubmitting}
              >
                <option value={ServerType.VANILLA}>
                  {t("servers.types.vanilla")}
                </option>
                <option value={ServerType.PAPER}>
                  {t("servers.types.paper")}
                </option>
                <option value={ServerType.FORGE}>
                  {t("servers.types.forge")}
                </option>
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="max-memory" className={styles.label}>
                {t("servers.create.fields.memory")} (MB)
              </label>
              <input
                id="max-memory"
                type="number"
                min="512"
                max="32768"
                step="256"
                value={formData.max_memory}
                onChange={(e) =>
                  handleChange("max_memory", parseInt(e.target.value) || 0)
                }
                className={`${styles.input} ${errors.max_memory ? styles.inputError : ""}`}
                disabled={isSubmitting}
              />
              {errors.max_memory && (
                <span className={styles.errorText}>{errors.max_memory}</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="max-players" className={styles.label}>
                {t("servers.create.fields.players")}
              </label>
              <input
                id="max-players"
                type="number"
                min="1"
                max="100"
                value={formData.max_players}
                onChange={(e) =>
                  handleChange("max_players", parseInt(e.target.value) || 0)
                }
                className={`${styles.input} ${errors.max_players ? styles.inputError : ""}`}
                disabled={isSubmitting}
              />
              {errors.max_players && (
                <span className={styles.errorText}>{errors.max_players}</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="port" className={styles.label}>
                {t("servers.create.fields.port")}
              </label>
              <input
                id="port"
                type="number"
                min="1"
                max="65535"
                value={formData.port}
                onChange={(e) =>
                  handleChange("port", parseInt(e.target.value) || 0)
                }
                className={`${styles.input} ${errors.port ? styles.inputError : ""}`}
                disabled={isSubmitting}
              />
              {errors.port && (
                <span className={styles.errorText}>{errors.port}</span>
              )}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.label}>
              {t("servers.create.fields.description")}
            </label>
            <textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => handleChange("description", e.target.value)}
              className={styles.textarea}
              placeholder={t("servers.create.placeholders.description")}
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              onClick={handleCancel}
              className={styles.cancelButton}
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? t("servers.create.creating")
                : t("servers.create.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
