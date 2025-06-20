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
        console.error("Failed to restore file:", result.error);
      }
    } catch (error) {
      console.error("Error restoring file:", error);
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
        console.error("Failed to delete version:", result.error);
      }
    } catch (error) {
      console.error("Error deleting version:", error);
    }
  };

  const showTabs = isTextFile(file.name) && !isImageFile(file.name);

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3>
            {isImageFile(file.name) ? "🖼️" : "📄"} {file.name}
          </h3>
          <button onClick={onClose} className={styles.closeButton}>
            ×
          </button>
        </div>

        {showTabs && (
          <div className={styles.modalTabs}>
            <button
              className={`${styles.tabButton} ${
                activeTab === "content" ? styles.activeTab : ""
              }`}
              onClick={() => setActiveTab("content")}
            >
              {t("files.tabs.content")}
            </button>
            <button
              className={`${styles.tabButton} ${
                activeTab === "history" ? styles.activeTab : ""
              }`}
              onClick={() => setActiveTab("history")}
            >
              {t("files.tabs.history")}
            </button>
          </div>
        )}

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
                    console.error(`Failed to display image: ${file.name}`);
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
                  <button
                    onClick={onEdit}
                    className={styles.modalButton}
                    disabled={isLoading || isRestoring}
                  >
                    {t("files.edit")}
                  </button>
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
