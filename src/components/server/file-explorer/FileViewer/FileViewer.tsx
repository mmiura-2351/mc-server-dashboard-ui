"use client";

import { useTranslation } from "@/contexts/language";
import type { FileSystemItem } from "@/types/files";
import { ImageViewer } from "./ImageViewer";
import { TextEditor } from "./TextEditor";
import styles from "../../file-explorer.module.css";

interface FileViewerProps {
  file: FileSystemItem | null;
  fileContent: string;
  imageUrl: string;
  isLoading: boolean;
  isEditing: boolean;
  isSaving: boolean;
  editedContent: string;
  onClose: () => void;
  onEdit: () => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onDownload: () => void;
  onContentChange: (content: string) => void;
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
  onClose,
  onEdit,
  onSave,
  onCancelEdit,
  onDownload,
  onContentChange,
}: FileViewerProps) {
  const { t } = useTranslation();

  if (!file) return null;

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

        <div className={styles.modalBody}>
          {isLoading ? (
            <div className={styles.fileLoading}>
              {t("files.loadingFileContent")}
            </div>
          ) : isImageFile(file.name) ? (
            <ImageViewer
              fileName={file.name}
              imageUrl={imageUrl}
              onError={() => {
                // Error handling could be passed as a prop
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
        </div>

        <div className={styles.modalFooter}>
          {isTextFile(file.name) && !isImageFile(file.name) && (
            <>
              {isEditing ? (
                <>
                  <button
                    onClick={onSave}
                    className={`${styles.modalButton} ${styles.primaryButton}`}
                    disabled={isSaving || isLoading}
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
                  disabled={isLoading}
                >
                  {t("files.edit")}
                </button>
              )}
            </>
          )}
          <button
            onClick={onDownload}
            className={styles.modalButton}
            disabled={isLoading || isSaving}
          >
            {t("files.download")}
          </button>
          <button
            onClick={onClose}
            className={styles.modalButton}
            disabled={isSaving}
          >
            {t("files.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
