"use client";

import { useEffect, useRef, useCallback } from "react";
import { useTranslation } from "@/contexts/language";
import { UploadProgress } from "./UploadProgress";
import styles from "../../file-explorer.module.css";

export interface UploadProgressItem {
  filename: string;
  percentage: number;
  loaded: number;
  total: number;
}

export interface UploadState {
  isUploading: boolean;
  progress: UploadProgressItem[];
  completed: string[];
  failed: { file: string; error: string }[];
}

interface UploadModalProps {
  isOpen: boolean;
  uploadState: UploadState;
  onClose: () => void;
  onReset: () => void;
}

export function UploadModal({
  isOpen,
  uploadState,
  onClose,
  onReset,
}: UploadModalProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const handleClose = useCallback(() => {
    if (!uploadState.isUploading) {
      onReset();
      onClose();
    }
  }, [uploadState.isUploading, onReset, onClose]);

  // Handle focus management and keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    // Focus the close button when modal opens (if not uploading)
    if (!uploadState.isUploading && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !uploadState.isUploading) {
        event.preventDefault();
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, uploadState.isUploading, handleClose]);

  // Handle overlay click
  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget && !uploadState.isUploading) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  const titleId = "upload-modal-title";
  const descriptionId = "upload-modal-description";

  return (
    <div
      className={styles.modal}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <div ref={dialogRef} className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3 id={titleId}>{t("files.uploadProgress")}</h3>
          <button
            onClick={handleClose}
            className={styles.closeButton}
            disabled={uploadState.isUploading}
            aria-label={t("common.close")}
          >
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          <div id={descriptionId} className="sr-only">
            {t("files.uploadInstructions")}
          </div>

          {uploadState.isUploading && (
            <div className={styles.uploadOverallProgress} aria-live="polite">
              <p>{t("files.uploadingFiles")}</p>
              <div className={styles.overallProgressBar}>
                <div
                  className={styles.overallProgressFill}
                  style={{
                    width: `${
                      uploadState.progress.length > 0
                        ? uploadState.progress.reduce(
                            (sum, p) => sum + p.percentage,
                            0
                          ) / uploadState.progress.length
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          )}

          <div className={styles.uploadFileList}>
            {uploadState.progress.map((progress) => (
              <UploadProgress key={progress.filename} progress={progress} />
            ))}

            {uploadState.completed.length > 0 && (
              <div className={styles.uploadSection}>
                <h4 className={styles.uploadSectionTitle}>
                  {t("files.completed")} ({uploadState.completed.length})
                </h4>
                {uploadState.completed.map((filename) => (
                  <div key={filename} className={styles.uploadCompletedItem}>
                    {filename}
                  </div>
                ))}
              </div>
            )}

            {uploadState.failed.length > 0 && (
              <div className={styles.uploadSection}>
                <h4 className={styles.uploadSectionTitle}>
                  {t("files.failed")} ({uploadState.failed.length})
                </h4>
                {uploadState.failed.map((failure) => (
                  <div key={failure.file} className={styles.uploadFailedItem}>
                    <div className={styles.uploadFailedFile}>
                      {failure.file}
                    </div>
                    <div className={styles.uploadFailedError}>
                      {failure.error}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.modalFooter}>
          {!uploadState.isUploading && (
            <button
              ref={closeButtonRef}
              onClick={handleClose}
              className={styles.modalButton}
            >
              {t("files.close")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
