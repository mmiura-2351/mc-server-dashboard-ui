"use client";

import { useTranslation } from "@/contexts/language";
import type { FileSystemItem } from "@/types/files";
import styles from "../../file-explorer.module.css";

interface ContextMenuPosition {
  x: number;
  y: number;
}

interface ContextMenuState {
  show: boolean;
  position: ContextMenuPosition;
  file: FileSystemItem | null;
}

interface ContextMenuProps {
  contextMenu: ContextMenuState;
  selectedFiles: Set<string>;
  onClose: () => void;
  onOpenFolder: (file: FileSystemItem) => void;
  onViewFile: (file: FileSystemItem) => void;
  onDownloadFile: (file: FileSystemItem) => void;
  onDownloadFolderAsZip: (file: FileSystemItem) => void;
  onRenameFile: (file: FileSystemItem) => void;
  onDeleteFile: (file: FileSystemItem) => void;
  onBulkDownload: () => void;
  onBulkDelete: () => void;
}

const isFileViewable = (fileName: string): boolean => {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  const viewableExtensions = [
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
    "png",
    "jpg",
    "jpeg",
    "gif",
    "bmp",
    "webp",
    "svg",
  ];
  return viewableExtensions.includes(extension);
};

export function ContextMenu({
  contextMenu,
  selectedFiles,
  onClose,
  onOpenFolder,
  onViewFile,
  onDownloadFile,
  onDownloadFolderAsZip,
  onRenameFile,
  onDeleteFile,
  onBulkDownload,
  onBulkDelete,
}: ContextMenuProps) {
  const { t } = useTranslation();

  if (!contextMenu.show || !contextMenu.file) return null;

  // Show bulk actions if multiple items are selected or if any folder is selected
  const showBulkActions =
    selectedFiles.size > 1 ||
    (selectedFiles.size > 0 && selectedFiles.has(contextMenu.file.name));

  return (
    <div
      className={styles.contextMenu}
      style={{
        position: "fixed",
        top: contextMenu.position.y,
        left: contextMenu.position.x,
        zIndex: 1000,
      }}
    >
      {showBulkActions ? (
        <>
          <div className={styles.contextMenuHeader}>
            {selectedFiles.size} {t("files.itemsSelected")}
          </div>
          <button
            className={styles.contextMenuItem}
            onClick={() => {
              onClose();
              onBulkDownload();
            }}
          >
            {t("files.downloadAsZip")} ({selectedFiles.size})
          </button>
          <hr className={styles.contextMenuSeparator} />
          <button
            className={`${styles.contextMenuItem} ${styles.danger}`}
            onClick={() => {
              onClose();
              onBulkDelete();
            }}
          >
            {t("files.deleteSelected")} ({selectedFiles.size})
          </button>
        </>
      ) : contextMenu.file.is_directory ? (
        <>
          <button
            className={styles.contextMenuItem}
            onClick={() => onOpenFolder(contextMenu.file!)}
          >
            {t("files.openFolder")}
          </button>
          <button
            className={styles.contextMenuItem}
            onClick={() => onDownloadFolderAsZip(contextMenu.file!)}
          >
            {t("files.downloadAsZip")}
          </button>
          <button
            className={styles.contextMenuItem}
            onClick={() => onRenameFile(contextMenu.file!)}
          >
            {t("files.renameFolder")}
          </button>
          <hr className={styles.contextMenuSeparator} />
          <button
            className={`${styles.contextMenuItem} ${styles.danger}`}
            onClick={() => onDeleteFile(contextMenu.file!)}
          >
            {t("files.deleteFolder")}
          </button>
        </>
      ) : (
        <>
          {isFileViewable(contextMenu.file.name) && (
            <button
              className={styles.contextMenuItem}
              onClick={() => onViewFile(contextMenu.file!)}
            >
              {t("files.viewFile")}
            </button>
          )}
          <button
            className={styles.contextMenuItem}
            onClick={() => onDownloadFile(contextMenu.file!)}
          >
            {t("files.download")}
          </button>
          <button
            className={styles.contextMenuItem}
            onClick={() => onRenameFile(contextMenu.file!)}
          >
            {t("files.renameFile")}
          </button>
          <hr className={styles.contextMenuSeparator} />
          <button
            className={`${styles.contextMenuItem} ${styles.danger}`}
            onClick={() => onDeleteFile(contextMenu.file!)}
          >
            {t("common.delete")}
          </button>
        </>
      )}
    </div>
  );
}

export type { ContextMenuState, ContextMenuPosition };
