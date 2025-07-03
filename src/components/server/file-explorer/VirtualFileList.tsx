/**
 * Virtual File List Component for Performance Optimization
 *
 * This component uses react-window for virtual scrolling to efficiently
 * handle large lists of files without performance degradation.
 *
 * Performance benefits:
 * - Only renders visible items (typically 10-20 instead of thousands)
 * - Constant rendering time regardless of list size
 * - Reduced memory usage for large directories
 * - Smooth scrolling performance
 */

"use client";

import React, { useMemo } from "react";
import { FixedSizeList as List } from "react-window";
import { useTranslation } from "@/contexts/language";
import type { FileSystemItem } from "@/types/files";
import { FileListItem } from "./FileListItem";
import styles from "../file-explorer.module.css";

interface VirtualFileListProps {
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

interface VirtualItemData {
  files: FileSystemItem[];
  selectedFiles: Set<string>;
  onFileClick: (file: FileSystemItem) => void;
  onContextMenu: (e: React.MouseEvent, file: FileSystemItem) => void;
  onFileSelect: (fileName: string) => void;
}

interface VirtualItemProps {
  index: number;
  style: React.CSSProperties;
  data: VirtualItemData;
}

/**
 * Individual virtual list item renderer
 * This component is called by react-window for each visible item
 */
const VirtualItem = React.memo<VirtualItemProps>(function VirtualItem({
  index,
  style,
  data,
}) {
  const file = data.files[index];

  if (!file) {
    return <div style={style}></div>;
  }

  return (
    <div style={style}>
      <FileListItem
        file={file}
        isSelected={data.selectedFiles.has(file.name)}
        onFileClick={data.onFileClick}
        onContextMenu={data.onContextMenu}
        onFileSelect={data.onFileSelect}
      />
    </div>
  );
});

/**
 * Virtual File List Component
 *
 * Efficiently renders large lists of files using virtual scrolling
 */
export const VirtualFileList = React.memo<VirtualFileListProps>(
  function VirtualFileList({
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
  }) {
    const { t } = useTranslation();

    // Memoize item data to prevent unnecessary re-renders
    const itemData = useMemo<VirtualItemData>(
      () => ({
        files,
        selectedFiles,
        onFileClick,
        onContextMenu,
        onFileSelect,
      }),
      [files, selectedFiles, onFileClick, onContextMenu, onFileSelect]
    );

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
                checked={
                  selectedFiles.size === files.length && files.length > 0
                }
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
            <div className={styles.columnDate}>
              {t("files.columns.modified")}
            </div>
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
            <div
              className={styles.fileListBody}
              style={{ position: "relative" }}
            >
              {isDragOver && (
                <div className={styles.dropOverlay}>
                  <div className={styles.dropHint}>
                    <p>{t("files.dropOverlay")}</p>
                  </div>
                </div>
              )}

              {/* Virtual List Container */}
              <List
                height={400} // Fixed height for virtual scrolling
                width="100%" // Full width of container
                itemCount={files.length}
                itemSize={48} // Height of each file item
                itemData={itemData}
                overscanCount={5} // Render 5 extra items outside viewport
              >
                {VirtualItem}
              </List>
            </div>
          )}
        </div>
      </>
    );
  }
);
