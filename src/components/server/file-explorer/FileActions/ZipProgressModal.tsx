"use client";

import { useTranslation } from "@/contexts/language";
import styles from "../../file-explorer.module.css";

interface ZipProgressState {
  current: number;
  total: number;
  percentage: number;
  currentFile: string;
  stage: "downloading" | "zipping" | "finalizing";
}

interface ZipProgressModalProps {
  isOpen: boolean;
  progress: ZipProgressState | null;
  onClose: () => void;
}

export function ZipProgressModal({
  isOpen,
  progress,
  onClose,
}: ZipProgressModalProps) {
  const { t } = useTranslation();

  if (!isOpen || !progress) return null;

  const getStageText = (stage: ZipProgressState["stage"]) => {
    switch (stage) {
      case "downloading":
        return t("files.downloadingFiles");
      case "zipping":
        return t("files.creatingZip");
      case "finalizing":
        return t("files.finalizingZip");
      default:
        return t("files.processingFiles");
    }
  };

  const getStageIcon = (stage: ZipProgressState["stage"]) => {
    switch (stage) {
      case "downloading":
        return "📥";
      case "zipping":
        return "📦";
      case "finalizing":
        return "✨";
      default:
        return "⏳";
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3>
            {getStageIcon(progress.stage)} {t("files.creatingZipFile")}
          </h3>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.progressContainer}>
            <div className={styles.progressInfo}>
              <div className={styles.progressStage}>
                {getStageText(progress.stage)}
              </div>
              <div className={styles.progressDetails}>
                {progress.stage === "downloading" && (
                  <>
                    {t("files.processingFile")}: {progress.currentFile}
                    <br />
                    {progress.current} / {progress.total} {t("files.files")}
                  </>
                )}
                {progress.stage === "zipping" && (
                  <>{t("files.compressingFiles")}</>
                )}
                {progress.stage === "finalizing" && (
                  <>{t("files.preparingDownload")}</>
                )}
              </div>
            </div>

            <div className={styles.progressBar}>
              <div
                className={styles.progressBarFill}
                style={{ width: `${progress.percentage}%` }}
              />
            </div>

            <div className={styles.progressPercentage}>
              {progress.percentage}%
            </div>
          </div>

          {progress.percentage === 100 && (
            <div className={styles.progressComplete}>
              <p>{t("files.zipDownloadComplete")}</p>
              <button onClick={onClose} className={styles.primaryButton}>
                {t("common.ok")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
