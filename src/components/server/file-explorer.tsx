"use client";

import { useState, useEffect, useCallback } from "react";
import * as fileService from "@/services/files";
import type { FileSystemItem } from "@/types/files";
import styles from "./file-explorer.module.css";

interface FileExplorerProps {
  serverId: number;
}

// Viewable file extensions (text files)
const VIEWABLE_TEXT_EXTENSIONS = [
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
];

// Viewable image extensions
const VIEWABLE_IMAGE_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "bmp",
  "webp",
  "svg",
];

// All viewable extensions
const VIEWABLE_EXTENSIONS = [
  ...VIEWABLE_TEXT_EXTENSIONS,
  ...VIEWABLE_IMAGE_EXTENSIONS,
];

export function FileExplorer({ serverId }: FileExplorerProps) {
  const [currentPath, setCurrentPath] = useState("/");
  const [files, setFiles] = useState<FileSystemItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileSystemItem | null>(null);
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [fileContent, setFileContent] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [toast, setToast] = useState<{
    message: string;
    type: "error" | "info";
  } | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadFiles = useCallback(
    async (path: string = currentPath) => {
      setIsLoading(true);
      setError(null);

      const result = await fileService.listFiles(serverId, path);

      if (result.isOk()) {
        setFiles(result.value);
      } else {
        setError(result.error.message || "Failed to load files");
      }

      setIsLoading(false);
    },
    [serverId, currentPath]
  );

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const isFileViewable = (fileName: string): boolean => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    return extension ? VIEWABLE_EXTENSIONS.includes(extension) : false;
  };

  const isImageFile = (fileName: string): boolean => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    return extension ? VIEWABLE_IMAGE_EXTENSIONS.includes(extension) : false;
  };

  const isTextFile = (fileName: string): boolean => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    return extension ? VIEWABLE_TEXT_EXTENSIONS.includes(extension) : false;
  };

  const closeFileViewer = () => {
    // Clean up state
    setImageUrl("");
    setShowFileViewer(false);
    setSelectedFile(null);
    setFileContent("");
    setIsLoadingFile(false);
    setIsEditing(false);
    setEditedContent("");
    setIsSaving(false);
  };

  const showToast = (message: string, type: "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000); // Auto-hide after 3 seconds
  };

  const handleFileClick = async (file: FileSystemItem) => {
    if (file.is_directory) {
      const newPath =
        currentPath === "/" ? `/${file.name}` : `${currentPath}/${file.name}`;
      setCurrentPath(newPath);
    } else if (isFileViewable(file.name)) {
      // View file content if it's a viewable file type
      await handleViewFile(file);
    } else {
      // Show toast for non-viewable files
      const extension = file.name.split(".").pop()?.toLowerCase() || "unknown";
      showToast(
        `Cannot preview ${extension.toUpperCase()} files. Use download to save the file.`,
        "info"
      );
    }
  };

  const handleViewFile = async (file: FileSystemItem) => {
    if (file.is_directory) return;

    // Immediately show modal with loading state
    setSelectedFile(file);
    setIsLoadingFile(true);
    setFileContent("");
    setImageUrl("");
    setShowFileViewer(true);

    const filePath =
      currentPath === "/" ? file.name : `${currentPath}/${file.name}`;
    const isImage = isImageFile(file.name);

    // Use new API with image flag
    const result = await fileService.readFile(serverId, filePath, isImage);

    if (result.isOk()) {
      if (isImage && result.value.is_image && result.value.image_data) {
        // For image files, create data URL from base64 data
        const imageDataUrl = `data:image/jpeg;base64,${result.value.image_data}`;
        setImageUrl(imageDataUrl);
      } else {
        // For text files, use content
        setFileContent(result.value.content);
        setEditedContent(result.value.content);
      }
    } else {
      showToast(`Failed to load file: ${result.error.message}`, "error");
      setShowFileViewer(false);
      setSelectedFile(null);
    }
    setIsLoadingFile(false);
  };

  const handleDeleteFile = async (file: FileSystemItem) => {
    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) {
      return;
    }

    const filePath =
      currentPath === "/" ? file.name : `${currentPath}/${file.name}`;
    const result = await fileService.deleteFile(serverId, filePath);

    if (result.isOk()) {
      // Reload files to update the list
      loadFiles();
      showToast(`Successfully deleted ${file.name}`, "info");
    } else {
      showToast(`Failed to delete file: ${result.error.message}`, "error");
    }
  };

  const handleDownloadFile = async (file: FileSystemItem) => {
    if (file.is_directory) return;

    const filePath =
      currentPath === "/" ? file.name : `${currentPath}/${file.name}`;
    const result = await fileService.downloadFile(serverId, filePath);

    if (result.isOk()) {
      // Create download link
      const url = URL.createObjectURL(result.value);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Successfully downloaded ${file.name}`, "info");
    } else {
      showToast(`Failed to download file: ${result.error.message}`, "error");
    }
  };

  const handleEditFile = () => {
    if (!selectedFile || !isTextFile(selectedFile.name)) return;
    setIsEditing(true);
    setEditedContent(fileContent);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(fileContent);
  };

  const handleSaveFile = async () => {
    if (!selectedFile || !isTextFile(selectedFile.name)) return;
    
    setIsSaving(true);
    const filePath = currentPath === "/" ? selectedFile.name : `${currentPath}/${selectedFile.name}`;
    
    const result = await fileService.writeFile(serverId, filePath, {
      content: editedContent,
      encoding: "utf-8",
      create_backup: true,
    });

    if (result.isOk()) {
      setFileContent(editedContent);
      setIsEditing(false);
      showToast(`Successfully saved ${selectedFile.name}`, "info");
    } else {
      showToast(`Failed to save file: ${result.error.message}`, "error");
    }
    
    setIsSaving(false);
  };

  const navigateUp = () => {
    if (currentPath === "/") return;
    const pathParts = currentPath.split("/").filter(Boolean);
    pathParts.pop();
    const newPath = pathParts.length === 0 ? "/" : "/" + pathParts.join("/");
    setCurrentPath(newPath);
  };

  const getFileIcon = (file: FileSystemItem) => {
    if (file.is_directory) {
      return "📁";
    }

    switch (file.type) {
      case "text":
        return "📝";
      case "binary":
        return "💾";
      case "other":
        return "📄";
      default:
        // Enhanced icon detection based on file extension
        const extension = file.name.split(".").pop()?.toLowerCase();
        switch (extension) {
          case "properties":
            return "⚙️";
          case "yml":
          case "yaml":
            return "📄";
          case "json":
            return "📋";
          case "txt":
          case "log":
            return "📝";
          case "jar":
            return "☕";
          case "zip":
          case "tar":
          case "gz":
            return "📦";
          case "png":
          case "jpg":
          case "jpeg":
          case "gif":
            return "🖼️";
          case "dat":
          case "nbt":
            return "🌍";
          default:
            return "📄";
        }
    }
  };

  const formatFileSize = (size: number) => {
    const units = ["B", "KB", "MB", "GB"];
    let unitIndex = 0;
    let fileSize = size;

    while (fileSize >= 1024 && unitIndex < units.length - 1) {
      fileSize /= 1024;
      unitIndex++;
    }

    return `${fileSize.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading files...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h3>Error loading files</h3>
          <p>{error}</p>
          <button onClick={() => loadFiles()} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.breadcrumb}>
          <button
            onClick={() => setCurrentPath("/")}
            className={`${styles.breadcrumbItem} ${currentPath === "/" ? styles.active : ""}`}
          >
            🏠 Root
          </button>
          {currentPath !== "/" &&
            currentPath
              .split("/")
              .filter(Boolean)
              .map((part, index, parts) => {
                const path = "/" + parts.slice(0, index + 1).join("/");
                return (
                  <span key={path}>
                    <span className={styles.breadcrumbSeparator}>/</span>
                    <button
                      onClick={() => setCurrentPath(path)}
                      className={`${styles.breadcrumbItem} ${path === currentPath ? styles.active : ""}`}
                    >
                      {part}
                    </button>
                  </span>
                );
              })}
        </div>
        <div className={styles.actions}>
          <button
            onClick={navigateUp}
            disabled={currentPath === "/"}
            className={styles.actionButton}
          >
            ⬆️ Up
          </button>
          <button onClick={() => loadFiles()} className={styles.actionButton}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className={styles.fileList}>
        <div className={styles.fileListHeader}>
          <div className={styles.columnName}>Name</div>
          <div className={styles.columnSize}>Size</div>
          <div className={styles.columnDate}>Modified</div>
          <div className={styles.columnActions}>Actions</div>
        </div>

        {files.length === 0 ? (
          <div className={styles.emptyState}>
            <p>This directory is empty</p>
          </div>
        ) : (
          <div className={styles.fileListBody}>
            {files.map((file) => (
              <div
                key={file.name}
                className={`${styles.fileItem} ${file.is_directory ? styles.directory : styles.file} ${styles.clickable}`}
                onClick={() => handleFileClick(file)}
                style={{ cursor: "pointer" }}
              >
                <div className={styles.fileName}>
                  <span className={styles.fileIcon}>{getFileIcon(file)}</span>
                  <span className={styles.fileNameText}>{file.name}</span>
                </div>
                <div className={styles.fileSize}>
                  {!file.is_directory ? formatFileSize(file.size || 0) : "—"}
                </div>
                <div className={styles.fileDate}>
                  {file.modified ? formatDate(file.modified) : "—"}
                </div>
                <div className={styles.fileActions}>
                  {!file.is_directory && (
                    <>
                      <button
                        className={styles.actionBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadFile(file);
                        }}
                        title="Download file"
                      >
                        📥
                      </button>
                      <button
                        className={styles.actionBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFile(file);
                        }}
                        title="Delete file"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* File Viewer Modal */}
      {(showFileViewer || isLoadingFile) && selectedFile && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>
                {isImageFile(selectedFile.name) ? "🖼️" : "📄"}{" "}
                {selectedFile.name}
              </h3>
              <button onClick={closeFileViewer} className={styles.closeButton}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              {isLoadingFile ? (
                <div className={styles.fileLoading}>
                  Loading file content...
                </div>
              ) : isImageFile(selectedFile.name) ? (
                <div className={styles.imageContainer}>
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt={selectedFile.name}
                      className={styles.imageDisplay}
                      onError={() => {
                        showToast(
                          `Failed to display image: ${selectedFile.name}`,
                          "error"
                        );
                      }}
                    />
                  ) : (
                    <div className={styles.fileLoading}>Loading image...</div>
                  )}
                </div>
              ) : isEditing ? (
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className={styles.fileEditor}
                  disabled={isSaving}
                />
              ) : (
                <pre className={styles.fileContentDisplay}>{fileContent}</pre>
              )}
            </div>
            <div className={styles.modalFooter}>
              {isTextFile(selectedFile.name) && !isImageFile(selectedFile.name) && (
                <>
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSaveFile}
                        className={`${styles.modalButton} ${styles.primaryButton}`}
                        disabled={isSaving || isLoadingFile}
                      >
                        {isSaving ? "💾 Saving..." : "💾 Save"}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className={styles.modalButton}
                        disabled={isSaving}
                      >
                        ❌ Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleEditFile}
                      className={styles.modalButton}
                      disabled={isLoadingFile}
                    >
                      ✏️ Edit
                    </button>
                  )}
                </>
              )}
              <button
                onClick={() => handleDownloadFile(selectedFile)}
                className={styles.modalButton}
                disabled={isLoadingFile || isSaving}
              >
                📥 Download
              </button>
              <button 
                onClick={closeFileViewer} 
                className={styles.modalButton}
                disabled={isSaving}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={
            toast.type === "info"
              ? `${styles.toast} ${styles.toastInfo}`
              : `${styles.toast} ${styles.toastError}`
          }
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
