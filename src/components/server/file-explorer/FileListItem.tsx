/**
 * Optimized file list item component with React.memo
 * Renders individual file/directory items in the file explorer
 */

"use client";

import React from "react";
import type { FileSystemItem } from "@/types/files";
import { formatFileSize, formatDateTime } from "@/utils/format";
import styles from "../file-explorer.module.css";

interface FileListItemProps {
  file: FileSystemItem;
  isSelected: boolean;
  onFileClick: (file: FileSystemItem) => void;
  onContextMenu: (e: React.MouseEvent, file: FileSystemItem) => void;
  onFileSelect: (fileName: string) => void;
}

/**
 * Get appropriate file icon based on file type and extension
 */
const getFileIcon = (file: FileSystemItem): string => {
  if (file.is_directory) return "📁";

  const extension = file.name.split(".").pop()?.toLowerCase() || "";

  // Image files
  if (["png", "jpg", "jpeg", "gif", "bmp", "webp", "svg"].includes(extension)) {
    return "🖼️";
  }

  // Text/config files
  if (
    [
      "txt",
      "properties",
      "yml",
      "yaml",
      "json",
      "log",
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
    ].includes(extension)
  ) {
    return "📄";
  }

  // Archive files
  if (["zip", "rar", "7z", "tar", "gz"].includes(extension)) {
    return "📦";
  }

  // Executable files
  if (["jar", "exe", "sh", "bat"].includes(extension)) {
    return "⚙️";
  }

  return "📄"; // Default file icon
};

/**
 * FileListItem Component - Memoized for performance optimization
 *
 * This component renders individual file/directory items in the file explorer.
 * It's wrapped with React.memo to prevent unnecessary re-renders when parent
 * component updates but this item's props haven't changed.
 */
export const FileListItem = React.memo<FileListItemProps>(
  function FileListItem({
    file,
    isSelected,
    onFileClick,
    onContextMenu,
    onFileSelect,
  }) {
    const handleClick = (e: React.MouseEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        onFileSelect(file.name);
      } else {
        onFileClick(file);
      }
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      onFileSelect(file.name);
    };

    const handleCheckboxClick = (e: React.MouseEvent) => {
      e.stopPropagation();
    };

    return (
      <div
        role="row"
        className={`${styles.fileItem} ${
          file.is_directory ? styles.directory : styles.file
        } ${styles.clickable} ${isSelected ? styles.selected : ""}`}
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu(e, file)}
        style={{ cursor: "pointer" }}
      >
        <div className={styles.columnCheckbox}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxChange}
            onClick={handleCheckboxClick}
          />
        </div>
        <div className={styles.fileName}>
          <span className={styles.fileIcon}>{getFileIcon(file)}</span>
          <span className={styles.fileNameText}>{file.name}</span>
        </div>
        <div className={styles.fileSize}>
          {!file.is_directory ? formatFileSize(file.size || 0) : "—"}
        </div>
        <div className={styles.fileDate}>
          {file.modified && file.modified.trim()
            ? formatDateTime(file.modified)
            : "—"}
        </div>
      </div>
    );
  }
);

/**
 * Custom comparison function for React.memo
 * Only re-render if these specific props change
 */
FileListItem.displayName = "FileListItem";
