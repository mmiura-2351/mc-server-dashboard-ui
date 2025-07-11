"use client";

import { useState } from "react";
import { useTranslation } from "@/contexts/language";
import type { FileSystemItem } from "@/types/files";
import { ImageViewer } from "./ImageViewer";
import { TextEditor } from "./TextEditor";
import { FileHistoryViewer } from "./FileHistoryViewer";
import styles from "../../file-explorer.module.css";

interface FileViewerProps {
  file: FileSystemItem | null;
  fileContent: string;
  imageUrl: string;
  isLoading: boolean;
  isEditing: boolean;
  isSaving: boolean;
  editedContent: string;
  serverId: number;
  currentPath: string;
  onClose: () => void;
  onEdit: () => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onDownload: () => void;
  onContentChange: (content: string) => void;
  onReloadFile?: () => void;
  isAdmin?: boolean;
}

// Helper functions
const isImageFile = (fileName: string): boolean => {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  return ["png", "jpg", "jpeg", "gif", "bmp", "webp", "svg"].includes(
    extension
  );
};

const isTextFile = (fileName: string): boolean => {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  return [
    "txt",
    "properties",
    "yml",
    "yaml",
    "json",
    "log",
    "sh",
    "bat",
    "cfg",
    "conf",
    "xml",
    "html",
    "css",
    "js",
    "ts",
    "md",
    "ini",
    "toml",
    "env",
  ].includes(extension);
};

export function FileViewer({
  file,
  fileContent,
  imageUrl,
  isLoading,
  isEditing,
  isSaving,
  editedContent,
  serverId,
  currentPath,
  onClose,
  onEdit,
  onSave,
  onCancelEdit,
  onDownload,
  onContentChange,
  onReloadFile,
  isAdmin = false,
}: FileViewerProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"content" | "history">("content");
  const [isRestoring, setIsRestoring] = useState(false);

  if (!file) return null;

  const filePath =
    currentPath === "/" ? file.name : `${currentPath}/${file.name}`;

  const handleRestore = async (version: number, description?: string) => {
    setIsRestoring(true);
    try {
      const { restoreFileFromVersion } = await import(
        "@/services/file-history"
      );
      const result = await restoreFileFromVersion(serverId, filePath, version, {
        create_backup_before_restore: true,
        description,
      });

      if (result.isOk()) {
        // Reload the file content after restore
        onReloadFile?.();
        setActiveTab("content");
      } else {
        // Silently handle restore file error
      }
    } catch {
      // Silently handle restore file exception
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDeleteVersion = async (version: number) => {
    if (!confirm(t("files.history.confirmDelete"))) return;

    try {
      const { deleteFileVersion } = await import("@/services/file-history");
      const result = await deleteFileVersion(serverId, filePath, version);

      if (result.isErr()) {
        // Silently handle delete version error
      }
    } catch {
      // Silently handle delete version exception
    }
  };

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3>
            {activeTab === "history"
              ? "📜"
              : isImageFile(file.name)
                ? "🖼️"
                : "📄"}{" "}
            {file.name}
            {activeTab === "history" && ` - ${t("files.tabs.history")}`}
          </h3>
          <button onClick={onClose} className={styles.closeButton}>
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          {activeTab === "content" ? (
            <>
              {isLoading || isRestoring ? (
                <div className={styles.fileLoading}>
                  {isRestoring
                    ? t("files.history.restoring")
                    : t("files.loadingFileContent")}
                </div>
              ) : isImageFile(file.name) ? (
                <ImageViewer
                  fileName={file.name}
                  imageUrl={imageUrl}
                  onError={() => {
                    // Silently handle image display error
                  }}
                />
              ) : (
                <TextEditor
                  fileName={file.name}
                  content={fileContent}
                  editedContent={editedContent}
                  isEditing={isEditing}
                  isSaving={isSaving}
                  onContentChange={onContentChange}
                />
              )}
            </>
          ) : (
            <FileHistoryViewer
              serverId={serverId}
              filePath={filePath}
              onRestore={handleRestore}
              onDelete={isAdmin ? handleDeleteVersion : undefined}
              isAdmin={isAdmin}
            />
          )}
        </div>

        <div className={styles.modalFooter}>
          {activeTab === "content" &&
            isTextFile(file.name) &&
            !isImageFile(file.name) && (
              <>
                {isEditing ? (
                  <>
                    <button
                      onClick={onSave}
                      className={`${styles.modalButton} ${styles.primaryButton}`}
                      disabled={isSaving || isLoading || isRestoring}
                    >
                      {isSaving ? t("files.saving") : t("files.save")}
                    </button>
                    <button
                      onClick={onCancelEdit}
                      className={styles.modalButton}
                      disabled={isSaving}
                    >
                      {t("files.cancel")}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={onEdit}
                      className={styles.modalButton}
                      disabled={isLoading || isRestoring}
                    >
                      {t("files.edit")}
                    </button>
                    <button
                      onClick={() => setActiveTab("history")}
                      className={styles.modalButton}
                      disabled={isLoading || isRestoring}
                    >
                      {t("files.history.viewHistory")}
                    </button>
                  </>
                )}
              </>
            )}
          {activeTab === "content" && (
            <button
              onClick={onDownload}
              className={styles.modalButton}
              disabled={isLoading || isSaving || isRestoring}
            >
              {t("files.download")}
            </button>
          )}
          {activeTab === "history" && (
            <button
              onClick={() => setActiveTab("content")}
              className={styles.modalButton}
            >
              {t("files.back")}
            </button>
          )}
          <button
            onClick={onClose}
            className={styles.modalButton}
            disabled={isSaving || isRestoring}
          >
            {t("files.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
