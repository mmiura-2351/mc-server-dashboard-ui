"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

// Upload types
interface UploadProgress {
  filename: string;
  percentage: number;
  loaded: number;
  total: number;
}

interface UploadState {
  isUploading: boolean;
  progress: UploadProgress[];
  completed: string[];
  failed: { file: string; error: string }[];
}

// Context menu types
interface ContextMenuPosition {
  x: number;
  y: number;
}

interface ContextMenuState {
  show: boolean;
  position: ContextMenuPosition;
  file: FileSystemItem | null;
}

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

  // Context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    show: false,
    position: { x: 0, y: 0 },
    file: null,
  });

  // Upload state
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: [],
    completed: [],
    failed: [],
  });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // File input refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

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

  // Hide context menu when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.show) {
        hideContextMenu();
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [contextMenu.show]);

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

  // Context menu handlers
  const handleContextMenu = (e: React.MouseEvent, file: FileSystemItem) => {
    e.preventDefault();
    setContextMenu({
      show: true,
      position: { x: e.clientX, y: e.clientY },
      file,
    });
  };

  const hideContextMenu = () => {
    setContextMenu({
      show: false,
      position: { x: 0, y: 0 },
      file: null,
    });
  };

  const handleDeleteFile = async (file: FileSystemItem) => {
    hideContextMenu();
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
    hideContextMenu();
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

  const handleViewFileFromContext = async (file: FileSystemItem) => {
    hideContextMenu();
    if (file.is_directory) return;
    await handleViewFile(file);
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
    const filePath =
      currentPath === "/"
        ? selectedFile.name
        : `${currentPath}/${selectedFile.name}`;

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

  // Upload handlers
  const resetUploadState = () => {
    setUploadState({
      isUploading: false,
      progress: [],
      completed: [],
      failed: [],
    });
  };

  const updateUploadProgress = (
    filename: string,
    progress: Omit<UploadProgress, "filename">
  ) => {
    setUploadState((prev) => ({
      ...prev,
      progress: prev.progress.map((p) =>
        p.filename === filename ? { ...p, ...progress } : p
      ),
    }));
  };

  const handleFileUpload = async (files: File[], isFolder = false) => {
    if (files.length === 0) return;

    // Initialize upload state
    setUploadState({
      isUploading: true,
      progress: Array.from(files).map((file) => ({
        filename: isFolder
          ? (file as File & { webkitRelativePath?: string })
              .webkitRelativePath || file.name
          : file.name,
        percentage: 0,
        loaded: 0,
        total: file.size,
      })),
      completed: [],
      failed: [],
    });
    setShowUploadModal(true);

    try {
      const fileArray = Array.from(files);
      const progressCallback = (
        progress: fileService.UploadProgressCallback extends (
          arg: infer P
        ) => void
          ? P
          : never
      ) => {
        updateUploadProgress(progress.filename, {
          percentage: progress.percentage,
          loaded: progress.loaded,
          total: progress.total,
        });
      };

      let result;
      if (isFolder) {
        result = await fileService.uploadFolderStructure(
          serverId,
          currentPath,
          fileArray,
          progressCallback
        );
      } else {
        result = await fileService.uploadMultipleFiles(
          serverId,
          currentPath,
          fileArray,
          progressCallback
        );
      }

      if (result.isOk()) {
        setUploadState((prev) => ({
          ...prev,
          isUploading: false,
          completed: result.value.successful,
          failed: result.value.failed,
        }));

        // Refresh file list
        await loadFiles();

        if (result.value.failed.length === 0) {
          showToast(
            `Successfully uploaded ${result.value.successful.length} ${isFolder ? "files" : "files"}`,
            "info"
          );
        } else {
          showToast(
            `Uploaded ${result.value.successful.length} files, ${result.value.failed.length} failed`,
            result.value.successful.length > 0 ? "info" : "error"
          );
        }
      } else {
        setUploadState((prev) => ({
          ...prev,
          isUploading: false,
          failed: [{ file: "Upload process", error: result.error.message }],
        }));
        showToast(`Upload failed: ${result.error.message}`, "error");
      }
    } catch (error) {
      setUploadState((prev) => ({
        ...prev,
        isUploading: false,
        failed: [
          {
            file: "Upload process",
            error: error instanceof Error ? error.message : "Unknown error",
          },
        ],
      }));
      showToast(
        `Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error"
      );
    }
  };

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (files) {
      handleFileUpload(Array.from(files), false);
    }
    // Reset input value to allow re-selecting the same files
    event.target.value = "";
  };

  const handleFolderInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files);
      handleFileUpload(fileArray, true);
    }
    // Reset input value to allow re-selecting the same folder
    event.target.value = "";
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only set drag over to false if we're leaving the container entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const items = Array.from(e.dataTransfer.items);
    let isFolder = false;

    // Check if any items are directories
    for (const item of items) {
      if (item.webkitGetAsEntry?.()?.isDirectory) {
        isFolder = true;
        break;
      }
    }

    // Process files or folders
    if (isFolder) {
      // Handle folder drop
      const processEntry = async (entry: FileSystemEntry): Promise<File[]> => {
        if (entry.isFile) {
          return new Promise((resolve) => {
            (entry as FileSystemFileEntry).file((file: File) => {
              // The fullPath already contains the complete path from the root of the dropped folder
              // Remove the leading slash to get the relative path
              const relativePath = entry.fullPath.startsWith("/")
                ? entry.fullPath.substring(1)
                : entry.fullPath;

              // Create a new File object with the webkitRelativePath property
              const newFile = new File([file], file.name, {
                type: file.type,
                lastModified: file.lastModified,
              });

              Object.defineProperty(newFile, "webkitRelativePath", {
                value: relativePath,
                writable: false,
                enumerable: true,
                configurable: false,
              });

              resolve([newFile]);
            });
          });
        } else if (entry.isDirectory) {
          const reader = (entry as FileSystemDirectoryEntry).createReader();
          return new Promise((resolve) => {
            const readAllEntries = async () => {
              let allEntries: FileSystemEntry[] = [];

              const readBatch = () => {
                return new Promise<FileSystemEntry[]>((batchResolve) => {
                  reader.readEntries((entries) => {
                    batchResolve(entries);
                  });
                });
              };

              // Read entries in batches (directories with many files may require multiple calls)
              let entries = await readBatch();
              while (entries.length > 0) {
                allEntries = allEntries.concat(entries);
                entries = await readBatch();
              }

              // Process all entries
              const allFiles: File[] = [];
              for (const subEntry of allEntries) {
                const subFiles = await processEntry(subEntry);
                allFiles.push(...subFiles);
              }

              resolve(allFiles);
            };

            readAllEntries();
          });
        }
        return [];
      };

      Promise.all(
        items.map((item) => {
          const entry = item.webkitGetAsEntry();
          return entry ? processEntry(entry) : [];
        })
      ).then((fileArrays) => {
        const allFiles = fileArrays.flat();
        if (allFiles.length > 0) {
          handleFileUpload(allFiles, true);
        }
      });
    } else {
      // Handle file drop
      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
        handleFileUpload(droppedFiles, false);
      }
    }
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
    <div
      className={`${styles.container} ${isDragOver ? styles.dragOver : ""}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={handleFileInputChange}
      />
      <input
        ref={folderInputRef}
        type="file"
        {...({
          webkitdirectory: "",
          directory: "",
        } as React.InputHTMLAttributes<HTMLInputElement>)}
        style={{ display: "none" }}
        onChange={handleFolderInputChange}
      />

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
            onClick={() => fileInputRef.current?.click()}
            className={styles.actionButton}
            disabled={uploadState.isUploading}
          >
            📁 Upload Files
          </button>
          <button
            onClick={() => folderInputRef.current?.click()}
            className={styles.actionButton}
            disabled={uploadState.isUploading}
          >
            📂 Upload Folder
          </button>
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
        </div>

        {files.length === 0 ? (
          <div className={styles.emptyState}>
            <p>This directory is empty</p>
            {isDragOver && (
              <div className={styles.dropHint}>
                <p>Drop files or folders here to upload</p>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.fileListBody}>
            {isDragOver && (
              <div className={styles.dropOverlay}>
                <div className={styles.dropHint}>
                  <p>📁 Drop files or folders here to upload</p>
                </div>
              </div>
            )}
            {files.map((file) => (
              <div
                key={file.name}
                className={`${styles.fileItem} ${file.is_directory ? styles.directory : styles.file} ${styles.clickable}`}
                onClick={() => handleFileClick(file)}
                onContextMenu={(e) => handleContextMenu(e, file)}
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
              {isTextFile(selectedFile.name) &&
                !isImageFile(selectedFile.name) && (
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

      {/* Upload Progress Modal */}
      {showUploadModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>📤 Upload Progress</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className={styles.closeButton}
                disabled={uploadState.isUploading}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              {uploadState.isUploading && (
                <div className={styles.uploadOverallProgress}>
                  <p>Uploading files...</p>
                  <div className={styles.overallProgressBar}>
                    <div
                      className={styles.overallProgressFill}
                      style={{
                        width: `${
                          uploadState.progress.length > 0
                            ? uploadState.progress.reduce(
                                (sum, p) => sum + p.percentage,
                                0
                              ) / uploadState.progress.length
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className={styles.uploadFileList}>
                {uploadState.progress.map((progress) => (
                  <div
                    key={progress.filename}
                    className={styles.uploadFileItem}
                  >
                    <div className={styles.uploadFileName}>
                      <span>{progress.filename}</span>
                      <span className={styles.uploadFileProgress}>
                        {progress.percentage}%
                      </span>
                    </div>
                    <div className={styles.uploadProgressBar}>
                      <div
                        className={styles.uploadProgressFill}
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                    <div className={styles.uploadFileSize}>
                      {formatFileSize(progress.loaded)} /{" "}
                      {formatFileSize(progress.total)}
                    </div>
                  </div>
                ))}

                {uploadState.completed.length > 0 && (
                  <div className={styles.uploadSection}>
                    <h4 className={styles.uploadSectionTitle}>
                      ✅ Completed ({uploadState.completed.length})
                    </h4>
                    {uploadState.completed.map((filename) => (
                      <div
                        key={filename}
                        className={styles.uploadCompletedItem}
                      >
                        {filename}
                      </div>
                    ))}
                  </div>
                )}

                {uploadState.failed.length > 0 && (
                  <div className={styles.uploadSection}>
                    <h4 className={styles.uploadSectionTitle}>
                      ❌ Failed ({uploadState.failed.length})
                    </h4>
                    {uploadState.failed.map((failure) => (
                      <div
                        key={failure.file}
                        className={styles.uploadFailedItem}
                      >
                        <div className={styles.uploadFailedFile}>
                          {failure.file}
                        </div>
                        <div className={styles.uploadFailedError}>
                          {failure.error}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className={styles.modalFooter}>
              {!uploadState.isUploading && (
                <button
                  onClick={() => {
                    resetUploadState();
                    setShowUploadModal(false);
                  }}
                  className={styles.modalButton}
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu.show && contextMenu.file && (
        <div
          className={styles.contextMenu}
          style={{
            position: "fixed",
            top: contextMenu.position.y,
            left: contextMenu.position.x,
            zIndex: 1000,
          }}
        >
          {contextMenu.file.is_directory ? (
            <>
              <button
                className={styles.contextMenuItem}
                onClick={() => handleFileClick(contextMenu.file!)}
              >
                📁 Open Folder
              </button>
              <button
                className={styles.contextMenuItem}
                onClick={() => handleDeleteFile(contextMenu.file!)}
              >
                🗑️ Delete Folder
              </button>
            </>
          ) : (
            <>
              {isFileViewable(contextMenu.file.name) && (
                <button
                  className={styles.contextMenuItem}
                  onClick={() => handleViewFileFromContext(contextMenu.file!)}
                >
                  👁️ View File
                </button>
              )}
              <button
                className={styles.contextMenuItem}
                onClick={() => handleDownloadFile(contextMenu.file!)}
              >
                📥 Download
              </button>
              <hr className={styles.contextMenuSeparator} />
              <button
                className={`${styles.contextMenuItem} ${styles.danger}`}
                onClick={() => handleDeleteFile(contextMenu.file!)}
              >
                🗑️ Delete
              </button>
            </>
          )}
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
