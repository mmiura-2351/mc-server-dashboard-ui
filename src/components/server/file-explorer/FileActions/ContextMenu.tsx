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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  const handleMenuItemKeyDown = (
    e: React.KeyboardEvent,
    action: () => void
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action();
      onClose();
    }
  };

  const getMenuAriaLabel = () => {
    if (showBulkActions) {
      return `Bulk actions menu - ${selectedFiles.size} items selected`;
    }
    if (contextMenu.file?.is_directory) {
      return "Directory actions menu";
    }
    return "File actions menu";
  };

  return (
    <div
      className={styles.contextMenu}
      role="menu"
      aria-label={getMenuAriaLabel()}
      onKeyDown={handleKeyDown}
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
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              onClose();
              onBulkDownload();
            }}
            onKeyDown={(e) => handleMenuItemKeyDown(e, onBulkDownload)}
          >
            {t("files.downloadAsZip")} ({selectedFiles.size})
          </button>
          <hr className={styles.contextMenuSeparator} />
          <button
            className={`${styles.contextMenuItem} ${styles.danger}`}
            role="menuitem"
            tabIndex={-1}
            onClick={() => {
              onClose();
              onBulkDelete();
            }}
            onKeyDown={(e) => handleMenuItemKeyDown(e, onBulkDelete)}
          >
            {t("files.deleteSelected")} ({selectedFiles.size})
          </button>
        </>
      ) : contextMenu.file.is_directory ? (
        <>
          <button
            className={styles.contextMenuItem}
            role="menuitem"
            tabIndex={-1}
            onClick={() => onOpenFolder(contextMenu.file!)}
            onKeyDown={(e) =>
              handleMenuItemKeyDown(e, () => onOpenFolder(contextMenu.file!))
            }
          >
            {t("files.openFolder")}
          </button>
          <button
            className={styles.contextMenuItem}
            role="menuitem"
            tabIndex={-1}
            onClick={() => onDownloadFolderAsZip(contextMenu.file!)}
            onKeyDown={(e) =>
              handleMenuItemKeyDown(e, () =>
                onDownloadFolderAsZip(contextMenu.file!)
              )
            }
          >
            {t("files.downloadAsZip")}
          </button>
          <button
            className={styles.contextMenuItem}
            role="menuitem"
            tabIndex={-1}
            onClick={() => onRenameFile(contextMenu.file!)}
            onKeyDown={(e) =>
              handleMenuItemKeyDown(e, () => onRenameFile(contextMenu.file!))
            }
          >
            {t("files.renameFolder")}
          </button>
          <hr className={styles.contextMenuSeparator} />
          <button
            className={`${styles.contextMenuItem} ${styles.danger}`}
            role="menuitem"
            tabIndex={-1}
            onClick={() => onDeleteFile(contextMenu.file!)}
            onKeyDown={(e) =>
              handleMenuItemKeyDown(e, () => onDeleteFile(contextMenu.file!))
            }
          >
            {t("files.deleteFolder")}
          </button>
        </>
      ) : (
        <>
          {isFileViewable(contextMenu.file.name) && (
            <button
              className={styles.contextMenuItem}
              role="menuitem"
              tabIndex={-1}
              onClick={() => onViewFile(contextMenu.file!)}
              onKeyDown={(e) =>
                handleMenuItemKeyDown(e, () => onViewFile(contextMenu.file!))
              }
            >
              {t("files.viewFile")}
            </button>
          )}
          <button
            className={styles.contextMenuItem}
            role="menuitem"
            tabIndex={-1}
            onClick={() => onDownloadFile(contextMenu.file!)}
            onKeyDown={(e) =>
              handleMenuItemKeyDown(e, () => onDownloadFile(contextMenu.file!))
            }
          >
            {t("files.download")}
          </button>
          <button
            className={styles.contextMenuItem}
            role="menuitem"
            tabIndex={-1}
            onClick={() => onRenameFile(contextMenu.file!)}
            onKeyDown={(e) =>
              handleMenuItemKeyDown(e, () => onRenameFile(contextMenu.file!))
            }
          >
            {t("files.renameFile")}
          </button>
          <hr className={styles.contextMenuSeparator} />
          <button
            className={`${styles.contextMenuItem} ${styles.danger}`}
            role="menuitem"
            tabIndex={-1}
            onClick={() => onDeleteFile(contextMenu.file!)}
            onKeyDown={(e) =>
              handleMenuItemKeyDown(e, () => onDeleteFile(contextMenu.file!))
            }
          >
            {t("common.delete")}
          </button>
        </>
      )}
    </div>
  );
}

export type { ContextMenuState, ContextMenuPosition };
