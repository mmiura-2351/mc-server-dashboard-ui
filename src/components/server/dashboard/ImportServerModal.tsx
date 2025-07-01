"use client";

import React, { useState } from "react";
import { useTranslation } from "@/contexts/language";
import type { ServerImportRequest } from "@/types/server";
import styles from "./ImportServerModal.module.css";

export interface ImportServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ServerImportRequest) => Promise<void>;
  isSubmitting: boolean;
}

const DEFAULT_FORM_DATA = {
  name: "",
  directory_path: "",
  description: "",
  file: null as File | null,
};

export function ImportServerModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: ImportServerModalProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t("servers.import.errors.nameRequired");
    }

    if (!formData.file) {
      newErrors.file = t("servers.import.errors.fileRequired");
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0 && formData.file) {
      const submitData: ServerImportRequest = {
        name: formData.name,
        description: formData.description,
        file: formData.file,
      };
      await onSubmit(submitData);
      // Reset form on successful submission
      setFormData(DEFAULT_FORM_DATA);
      setErrors({});
    }
  };

  const handleChange = (field: string, value: string | File) => {
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
          <h2 className={styles.title}>{t("servers.import.title")}</h2>
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
            <label htmlFor="import-name" className={styles.label}>
              {t("servers.import.fields.name")} *
            </label>
            <input
              id="import-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
              placeholder={t("servers.import.placeholders.name")}
              disabled={isSubmitting}
            />
            {errors.name && (
              <span className={styles.errorText}>{errors.name}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="import-file" className={styles.label}>
              {t("servers.import.fields.file")} *
            </label>
            <input
              id="import-file"
              type="file"
              accept=".zip,.tar,.tar.gz"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleChange("file", file);
                }
              }}
              className={`${styles.input} ${errors.file ? styles.inputError : ""}`}
              disabled={isSubmitting}
            />
            {errors.file && (
              <span className={styles.errorText}>{errors.file}</span>
            )}
            <small className={styles.helpText}>
              {t("servers.import.fileHelp")}
            </small>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="import-description" className={styles.label}>
              {t("servers.import.fields.description")}
            </label>
            <textarea
              id="import-description"
              value={formData.description || ""}
              onChange={(e) => handleChange("description", e.target.value)}
              className={styles.textarea}
              placeholder={t("servers.import.placeholders.description")}
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
                ? t("servers.import.importing")
                : t("servers.import.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
