"use client";

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

  if (!isOpen) return null;

  const handleClose = () => {
    if (!uploadState.isUploading) {
      onReset();
      onClose();
    }
  };

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3>{t("files.uploadProgress")}</h3>
          <button
            onClick={handleClose}
            className={styles.closeButton}
            disabled={uploadState.isUploading}
          >
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          {uploadState.isUploading && (
            <div className={styles.uploadOverallProgress}>
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
            <button onClick={handleClose} className={styles.modalButton}>
              {t("files.close")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
