"use client";

import { useTranslation } from "@/contexts/language";
import type { FileSystemItem } from "@/types/files";
import { FileListItem } from "./FileListItem";
import styles from "../file-explorer.module.css";

interface FileListProps {
  files: FileSystemItem[];
  currentPath: string;
  selectedFiles: Set<string>;
  isDragOver: boolean;
  isLoading: boolean;
  error: string | null;
  onPathChange: (path: string) => void;
  onFileClick: (file: FileSystemItem) => void;
  onContextMenu: (e: React.MouseEvent, file: FileSystemItem) => void;
  onFileSelect: (fileName: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onRefresh: () => void;
  onNavigateUp: () => void;
}

export function FileList({
  files,
  currentPath,
  selectedFiles,
  isDragOver,
  isLoading,
  error,
  onPathChange,
  onFileClick,
  onContextMenu,
  onFileSelect,
  onSelectAll,
  onClearSelection,
  onRefresh,
  onNavigateUp,
}: FileListProps) {
  const { t } = useTranslation();

  const renderBreadcrumb = () => {
    const pathParts = currentPath.split("/").filter(Boolean);
    const breadcrumbItems: React.ReactElement[] = [];

    // Always show root
    breadcrumbItems.push(
      <button
        key="/"
        onClick={() => onPathChange("/")}
        className={`${styles.breadcrumbItem} ${currentPath === "/" ? styles.active : ""}`}
      >
        {t("files.root")}
      </button>
    );

    if (pathParts.length <= 3) {
      // Show all parts if path is short
      pathParts.forEach((part, index) => {
        const path = "/" + pathParts.slice(0, index + 1).join("/");
        breadcrumbItems.push(
          <span key={path}>
            <span className={styles.breadcrumbSeparator}>/</span>
            <button
              onClick={() => onPathChange(path)}
              className={`${styles.breadcrumbItem} ${path === currentPath ? styles.active : ""}`}
            >
              {part}
            </button>
          </span>
        );
      });
    } else {
      // Show root + ellipsis + last few parts
      breadcrumbItems.push(
        <span key="ellipsis">
          <span className={styles.breadcrumbSeparator}>/</span>
          <span className={styles.breadcrumbEllipsis}>...</span>
        </span>
      );

      // Show last few parts
      const visibleParts = pathParts.slice(-2); // Show last 2 parts
      visibleParts.forEach((part, index) => {
        const actualIndex = pathParts.length - 2 + index;
        const path = "/" + pathParts.slice(0, actualIndex + 1).join("/");
        breadcrumbItems.push(
          <span key={path}>
            <span className={styles.breadcrumbSeparator}>/</span>
            <button
              onClick={() => onPathChange(path)}
              className={`${styles.breadcrumbItem} ${path === currentPath ? styles.active : ""}`}
              title={part} // Show full name on hover
            >
              {part}
            </button>
          </span>
        );
      });
    }

    return breadcrumbItems;
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>{t("files.loadingFiles")}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h3>{t("files.errorLoadingFiles")}</h3>
          <p>{error}</p>
          <button onClick={onRefresh} className={styles.retryButton}>
            {t("files.retry")}
          </button>
        </div>
      </div>
    );
  }

  const isSelectionMode = selectedFiles.size > 0;

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.breadcrumb}>{renderBreadcrumb()}</div>
        <div className={styles.actions}>
          {isSelectionMode && (
            <>
              <span className={styles.selectionInfo}>
                {selectedFiles.size} {t("files.selected")}
              </span>
              <button
                onClick={onClearSelection}
                className={styles.actionButton}
              >
                {t("files.clear")}
              </button>
            </>
          )}
          <button
            onClick={onNavigateUp}
            disabled={currentPath === "/"}
            className={styles.actionButton}
          >
            {t("files.up")}
          </button>
          <button onClick={onRefresh} className={styles.actionButton}>
            {t("files.refresh")}
          </button>
        </div>
      </div>

      <div className={styles.fileList}>
        <div className={styles.fileListHeader}>
          <div className={styles.columnCheckbox}>
            <input
              type="checkbox"
              checked={selectedFiles.size === files.length && files.length > 0}
              onChange={(e) => {
                if (e.target.checked) {
                  onSelectAll();
                } else {
                  onClearSelection();
                }
              }}
              disabled={files.length === 0}
            />
          </div>
          <div className={styles.columnName}>{t("files.columns.name")}</div>
          <div className={styles.columnSize}>{t("files.columns.size")}</div>
          <div className={styles.columnDate}>{t("files.columns.modified")}</div>
        </div>

        {files.length === 0 ? (
          <div className={styles.emptyState}>
            <p>{t("files.emptyDirectory")}</p>
            {isDragOver && (
              <div className={styles.dropHint}>
                <p>{t("files.dropHint")}</p>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.fileListBody}>
            {isDragOver && (
              <div className={styles.dropOverlay}>
                <div className={styles.dropHint}>
                  <p>{t("files.dropOverlay")}</p>
                </div>
              </div>
            )}
            {files.map((file) => (
              <FileListItem
                key={file.name}
                file={file}
                isSelected={selectedFiles.has(file.name)}
                onFileClick={onFileClick}
                onContextMenu={onContextMenu}
                onFileSelect={onFileSelect}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
