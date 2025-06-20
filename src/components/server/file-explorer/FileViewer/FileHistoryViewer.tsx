"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/contexts/language";
import { getFileHistory, getFileVersionContent } from "@/services/file-history";
import type {
  FileHistoryRecord,
  FileVersionContentResponse,
} from "@/types/files";
import styles from "../../file-explorer.module.css";

interface FileHistoryViewerProps {
  serverId: number;
  filePath: string;
  onRestore: (version: number, description?: string) => void;
  onDelete?: (version: number) => void;
  isAdmin?: boolean;
}

export function FileHistoryViewer({
  serverId,
  filePath,
  onRestore,
  onDelete,
  isAdmin = false,
}: FileHistoryViewerProps) {
  const { t } = useTranslation();
  const [history, setHistory] = useState<FileHistoryRecord[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [versionContent, setVersionContent] =
    useState<FileVersionContentResponse | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoreDescription, setRestoreDescription] = useState("");

  // Load file history
  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId, filePath]);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    setError(null);

    const result = await getFileHistory(serverId, filePath);
    if (result.isErr()) {
      setError(result.error);
      setIsLoadingHistory(false);
      return;
    }

    setHistory(result.value.history);
    setIsLoadingHistory(false);
  };

  // Load version content when selected
  const handleVersionSelect = async (version: number) => {
    if (selectedVersion === version) {
      setSelectedVersion(null);
      setVersionContent(null);
      return;
    }

    setSelectedVersion(version);
    setIsLoadingContent(true);

    const result = await getFileVersionContent(serverId, filePath, version);
    if (result.isErr()) {
      setError(result.error);
      setIsLoadingContent(false);
      return;
    }

    setVersionContent(result.value);
    setIsLoadingContent(false);
  };

  const handleRestore = () => {
    if (selectedVersion !== null) {
      onRestore(selectedVersion, restoreDescription || undefined);
      setRestoreDescription("");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (isLoadingHistory) {
    return <div className={styles.loading}>{t("files.history.loading")}</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (history.length === 0) {
    return (
      <div className={styles.emptyState}>{t("files.history.noHistory")}</div>
    );
  }

  return (
    <div className={styles.historyContainer}>
      <div className={styles.historyList}>
        <h4>{t("files.history.versions")}</h4>
        <div className={styles.versionList}>
          {history.map((record) => (
            <div
              key={record.id}
              className={`${styles.versionItem} ${
                selectedVersion === record.version_number ? styles.selected : ""
              }`}
              onClick={() => handleVersionSelect(record.version_number)}
            >
              <div className={styles.versionHeader}>
                <span className={styles.versionNumber}>
                  v{record.version_number}
                </span>
                <span className={styles.versionDate}>
                  {formatDate(record.created_at)}
                </span>
              </div>
              <div className={styles.versionInfo}>
                <span className={styles.versionEditor}>
                  {record.editor_username || t("files.history.unknownUser")}
                </span>
                <span className={styles.versionSize}>
                  {formatFileSize(record.file_size)}
                </span>
              </div>
              {record.description && (
                <div className={styles.versionDescription}>
                  {record.description}
                </div>
              )}
              {isAdmin && (
                <button
                  className={styles.deleteVersionButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(record.version_number);
                  }}
                  title={t("files.history.deleteVersion")}
                >
                  🗑️
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedVersion !== null && (
        <div className={styles.versionDetails}>
          <h4>{t("files.history.versionDetails")}</h4>
          {isLoadingContent ? (
            <div className={styles.loading}>
              {t("files.history.loadingContent")}
            </div>
          ) : versionContent ? (
            <>
              <div className={styles.versionContent}>
                <pre>{versionContent.content}</pre>
              </div>
              <div className={styles.restoreSection}>
                <input
                  type="text"
                  placeholder={t("files.history.restoreDescription")}
                  value={restoreDescription}
                  onChange={(e) => setRestoreDescription(e.target.value)}
                  className={styles.restoreDescriptionInput}
                />
                <button
                  className={`${styles.modalButton} ${styles.primaryButton}`}
                  onClick={handleRestore}
                >
                  {t("files.history.restoreVersion")}
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
