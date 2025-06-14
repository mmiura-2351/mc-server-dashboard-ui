"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import * as fileService from "@/services/files";
import type { FileSystemItem } from "@/types/files";
import {
  FileUploadSecurity,
  DEFAULT_UPLOAD_CONFIG,
} from "@/utils/file-upload-security";
import { InputSanitizer } from "@/utils/input-sanitizer";
import { formatFileSize } from "@/utils/format";
import { ConfirmationModal, AlertModal } from "@/components/modal";
import { useTranslation } from "@/contexts/language";
import styles from "./file-explorer.module.css";
import JSZip from "jszip";

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
  const { t } = useTranslation();
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

  // Multi-select state
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Rename state
  const [renamingFile, setRenamingFile] = useState<FileSystemItem | null>(null);
  const [newName, setNewName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  // Upload state
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: [],
    completed: [],
    failed: [],
  });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Modal states
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant?: "default" | "danger" | "warning";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: "info" | "warning" | "error" | "success";
  }>({
    isOpen: false,
    title: "",
    message: "",
  });

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

  // Multi-select handlers
  const toggleFileSelection = (fileName: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileName)) {
      newSelection.delete(fileName);
    } else {
      newSelection.add(fileName);
    }
    setSelectedFiles(newSelection);

    // Enable selection mode when files are selected
    setIsSelectionMode(newSelection.size > 0);
  };

  const selectAllFiles = () => {
    const allFileNames = files.map((file) => file.name);
    setSelectedFiles(new Set(allFileNames));
    setIsSelectionMode(true);
  };

  const clearSelection = () => {
    setSelectedFiles(new Set());
    setIsSelectionMode(false);
  };

  const getSelectedFileObjects = (): FileSystemItem[] => {
    return files.filter((file) => selectedFiles.has(file.name));
  };

  // Recursively get all files in a directory
  const getAllFilesInDirectory = async (
    dirPath: string,
    basePath: string = ""
  ): Promise<{ path: string; file: FileSystemItem }[]> => {
    const result = await fileService.listFiles(serverId, dirPath);
    if (result.isErr()) {
      console.error(`Failed to list files in ${dirPath}:`, result.error);
      return [];
    }

    const allFiles: { path: string; file: FileSystemItem }[] = [];
    const items = result.value;

    for (const item of items) {
      const itemPath = basePath ? `${basePath}/${item.name}` : item.name;

      if (item.is_directory) {
        // Recursively get files from subdirectory
        const subDirPath =
          dirPath === "/" ? `/${item.name}` : `${dirPath}/${item.name}`;
        const subFiles = await getAllFilesInDirectory(subDirPath, itemPath);
        allFiles.push(...subFiles);
      } else {
        // Add file with its relative path
        allFiles.push({ path: itemPath, file: item });
      }
    }

    return allFiles;
  };

  const handleDeleteFile = async (file: FileSystemItem) => {
    hideContextMenu();

    const confirmDelete = async () => {
      const filePath =
        currentPath === "/" ? file.name : `${currentPath}/${file.name}`;
      const result = await fileService.deleteFile(serverId, filePath);

      if (result.isOk()) {
        // Update file list by removing the deleted file
        setFiles((prevFiles) => prevFiles.filter((f) => f.name !== file.name));
        showToast(`Successfully deleted ${file.name}`, "info");
      } else {
        showToast(`Failed to delete file: ${result.error.message}`, "error");
      }

      setConfirmModal({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => {},
      });
    };

    setConfirmModal({
      isOpen: true,
      title: t("files.deleteFile"),
      message: t("files.deleteFileConfirmation", { name: file.name }),
      variant: "danger",
      onConfirm: confirmDelete,
    });
  };

  const handleBulkDelete = async () => {
    const selected = getSelectedFileObjects();
    if (selected.length === 0) return;

    const confirmBulkDelete = async () => {
      let successCount = 0;
      let failCount = 0;
      const deletedFileNames: string[] = [];

      for (const file of selected) {
        const filePath =
          currentPath === "/" ? file.name : `${currentPath}/${file.name}`;
        const result = await fileService.deleteFile(serverId, filePath);

        if (result.isOk()) {
          successCount++;
          deletedFileNames.push(file.name);
        } else {
          failCount++;
        }
      }

      // Update file list by removing successfully deleted files
      if (deletedFileNames.length > 0) {
        setFiles((prevFiles) =>
          prevFiles.filter((f) => !deletedFileNames.includes(f.name))
        );
      }

      if (failCount === 0) {
        showToast(`Successfully deleted ${successCount} file(s)`, "info");
      } else {
        showToast(
          `Deleted ${successCount} file(s), failed ${failCount}`,
          "error"
        );
      }

      clearSelection();
      setConfirmModal({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => {},
      });
    };

    const message =
      selected.length === 1
        ? t("files.deleteFileConfirmation", {
            name: selected[0]?.name || "Unknown",
          })
        : t("files.deleteBulkConfirmation", {
            count: selected.length.toString(),
          });

    setConfirmModal({
      isOpen: true,
      title: t("files.deleteFiles"),
      message,
      variant: "danger",
      onConfirm: confirmBulkDelete,
    });
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
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();

      // Immediate cleanup for single file downloads
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(url);
      showToast(`Successfully downloaded ${file.name}`, "info");
    } else {
      showToast(`Failed to download file: ${result.error.message}`, "error");
    }
  };

  const handleBulkDownload = async () => {
    const selected = getSelectedFileObjects();
    if (selected.length === 0) return;

    // If only one file is selected and it's not a directory, download it directly
    if (selected.length === 1 && selected[0] && !selected[0].is_directory) {
      await handleDownloadFile(selected[0]);
      clearSelection();
      return;
    }

    // For multiple items or directories, create a ZIP
    showToast(`Preparing download...`, "info");

    const zip = new JSZip();
    let successCount = 0;
    let failCount = 0;
    let totalFiles = 0;

    // Collect all files to download (including from directories)
    const filesToDownload: { path: string; actualPath: string }[] = [];

    for (const item of selected) {
      if (item.is_directory) {
        // Get all files in directory recursively
        const itemPath =
          currentPath === "/" ? `/${item.name}` : `${currentPath}/${item.name}`;
        const dirFiles = await getAllFilesInDirectory(itemPath, item.name);

        for (const dirFile of dirFiles) {
          const actualPath =
            currentPath === "/"
              ? `/${dirFile.path}`
              : `${currentPath}/${dirFile.path}`;
          filesToDownload.push({
            path: dirFile.path,
            actualPath: actualPath,
          });
        }
      } else {
        // Regular file
        const actualPath =
          currentPath === "/" ? item.name : `${currentPath}/${item.name}`;
        filesToDownload.push({
          path: item.name,
          actualPath: actualPath,
        });
      }
    }

    totalFiles = filesToDownload.length;

    if (totalFiles === 0) {
      showToast("No files found to download", "error");
      clearSelection();
      return;
    }

    showToast(`Creating ZIP file with ${totalFiles} file(s)...`, "info");

    // Download and add each file to ZIP
    for (let i = 0; i < filesToDownload.length; i++) {
      const fileInfo = filesToDownload[i];

      // Update progress
      if (i % 5 === 0 || i === filesToDownload.length - 1) {
        showToast(`Processing ${i + 1}/${totalFiles} files...`, "info");
      }

      if (!fileInfo) {
        showToast(`File information missing for item ${i + 1}`, "error");
        continue;
      }

      const result = await fileService.downloadFile(
        serverId,
        fileInfo.actualPath
      );

      if (result.isOk()) {
        // Add file to ZIP with its directory structure
        zip.file(fileInfo.path, result.value);
        successCount++;
      } else {
        console.error(`Failed to download ${fileInfo.path}:`, result.error);
        failCount++;
      }
    }

    if (successCount > 0) {
      try {
        showToast("Generating ZIP file...", "info");

        // Generate ZIP file
        const zipBlob = await zip.generateAsync({
          type: "blob",
          compression: "DEFLATE",
          compressionOptions: { level: 6 },
        });

        // Create download link for ZIP
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = url;

        // Generate a meaningful filename
        const selectedNames = selected.map((item) => item.name);
        const zipName =
          selected.length === 1
            ? `${selectedNames[0]}_${new Date().toISOString().split("T")[0]}.zip`
            : `files_${new Date().toISOString().split("T")[0]}.zip`;

        a.download = zipName;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();

        // Cleanup
        setTimeout(() => {
          try {
            if (a && a.parentNode) {
              a.parentNode.removeChild(a);
            }
            URL.revokeObjectURL(url);
          } catch {
            // Ignore cleanup errors in test environment
            // Development debug: cleanup error occurred
          }
        }, 100);

        if (failCount === 0) {
          showToast(
            `Successfully created ZIP with ${successCount} file(s)`,
            "info"
          );
        } else {
          showToast(
            `Created ZIP with ${successCount} file(s), failed ${failCount}`,
            "error"
          );
        }
      } catch (error) {
        console.error("ZIP generation error:", error);
        showToast("Failed to create ZIP file", "error");
      }
    } else {
      showToast("No files could be downloaded", "error");
    }

    clearSelection();
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

  // Rename handlers
  const handleRenameFile = (file: FileSystemItem) => {
    hideContextMenu();
    setRenamingFile(file);
    setNewName(file.name);
  };

  const handleRenameConfirm = async () => {
    if (!renamingFile || !newName.trim() || newName === renamingFile.name) {
      handleRenameCancel();
      return;
    }

    setIsRenaming(true);
    const filePath =
      currentPath === "/"
        ? renamingFile.name
        : `${currentPath}/${renamingFile.name}`;

    const result = await fileService.renameFile(
      serverId,
      filePath,
      newName.trim()
    );

    if (result.isOk()) {
      // Update file list by modifying the renamed file
      setFiles((prevFiles) =>
        prevFiles.map((f) =>
          f.name === renamingFile.name ? { ...f, name: newName.trim() } : f
        )
      );
      showToast(
        `Successfully renamed "${renamingFile.name}" to "${newName.trim()}"`,
        "info"
      );
      handleRenameCancel();
    } else {
      showToast(`Failed to rename file: ${result.error.message}`, "error");
    }

    setIsRenaming(false);
  };

  const handleRenameCancel = () => {
    setRenamingFile(null);
    setNewName("");
    setIsRenaming(false);
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

    // Validate files for security
    const securityResult = await FileUploadSecurity.securityFilter(files, {
      ...DEFAULT_UPLOAD_CONFIG,
      maxFileSize: 50 * 1024 * 1024, // 50MB for Minecraft server files
      maxTotalSize: 200 * 1024 * 1024, // 200MB total
      maxFiles: 20, // Reasonable limit for server files
    });

    // Show warnings if any
    if (securityResult.warnings.length > 0) {
      console.warn("File upload warnings:", securityResult.warnings);
    }

    // Show blocked files
    if (securityResult.blocked.length > 0) {
      const blockedMessage = securityResult.blocked
        .map((b) => `${b.file.name}: ${b.reason}`)
        .join("\n");
      setAlertModal({
        isOpen: true,
        title: t("files.securityWarning"),
        message: t("files.blockedFilesMessage") + "\n" + blockedMessage,
        type: "warning",
      });
    }

    // Use only allowed files
    const allowedFiles = securityResult.allowed;
    if (allowedFiles.length === 0) {
      setAlertModal({
        isOpen: true,
        title: t("files.uploadError"),
        message: t("files.noFilesAllowed"),
        type: "error",
      });
      return;
    }

    // Initialize upload state with allowed files
    setUploadState({
      isUploading: true,
      progress: allowedFiles.map((file) => ({
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
      const fileArray = allowedFiles;
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

        // Refresh file list without showing loading state
        const refreshResult = await fileService.listFiles(
          serverId,
          currentPath
        );
        if (refreshResult.isOk()) {
          setFiles(refreshResult.value);
        }

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Helper function to render breadcrumb with truncation for long paths
  const renderBreadcrumb = () => {
    if (currentPath === "/") {
      return (
        <button
          onClick={() => setCurrentPath("/")}
          className={`${styles.breadcrumbItem} ${styles.active}`}
        >
          🏠 Root
        </button>
      );
    }

    const pathParts = currentPath.split("/").filter(Boolean);
    const maxVisibleParts = 3; // Show root + max 3 parts

    // Always show root
    const breadcrumbItems = [
      <button
        key="root"
        onClick={() => setCurrentPath("/")}
        className={styles.breadcrumbItem}
      >
        🏠 Root
      </button>,
    ];

    if (pathParts.length <= maxVisibleParts) {
      // Show all parts if within limit
      pathParts.forEach((part, index) => {
        const path = "/" + pathParts.slice(0, index + 1).join("/");
        breadcrumbItems.push(
          <span key={path}>
            <span className={styles.breadcrumbSeparator}>/</span>
            <button
              onClick={() => setCurrentPath(path)}
              className={`${styles.breadcrumbItem} ${path === currentPath ? styles.active : ""}`}
              title={part} // Show full name on hover
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
              onClick={() => setCurrentPath(path)}
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
        <div className={styles.breadcrumb}>{renderBreadcrumb()}</div>
        <div className={styles.actions}>
          {isSelectionMode && (
            <>
              <span className={styles.selectionInfo}>
                {selectedFiles.size} selected
              </span>
              <button onClick={clearSelection} className={styles.actionButton}>
                ✖️ Clear
              </button>
            </>
          )}
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
          <div className={styles.columnCheckbox}>
            <input
              type="checkbox"
              checked={selectedFiles.size === files.length && files.length > 0}
              onChange={(e) => {
                if (e.target.checked) {
                  selectAllFiles();
                } else {
                  clearSelection();
                }
              }}
              disabled={files.length === 0}
            />
          </div>
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
                className={`${styles.fileItem} ${file.is_directory ? styles.directory : styles.file} ${styles.clickable} ${selectedFiles.has(file.name) ? styles.selected : ""}`}
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    toggleFileSelection(file.name);
                  } else {
                    handleFileClick(file);
                  }
                }}
                onContextMenu={(e) => handleContextMenu(e, file)}
                style={{ cursor: "pointer" }}
              >
                <div className={styles.columnCheckbox}>
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.name)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleFileSelection(file.name);
                    }}
                    onClick={(e) => e.stopPropagation()}
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

      {/* Rename Modal */}
      {renamingFile && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>✏️ Rename {renamingFile.is_directory ? "Folder" : "File"}</h3>
              <button
                onClick={handleRenameCancel}
                className={styles.closeButton}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.renameForm}>
                <label htmlFor="newName">
                  New name for &ldquo;{renamingFile.name}&rdquo;:
                </label>
                <input
                  id="newName"
                  type="text"
                  value={newName}
                  onChange={(e) => {
                    const sanitized = InputSanitizer.sanitizeFilePath(
                      e.target.value
                    );
                    setNewName(sanitized);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleRenameConfirm();
                    } else if (e.key === "Escape") {
                      handleRenameCancel();
                    }
                  }}
                  disabled={isRenaming}
                  autoFocus
                  className={styles.renameInput}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                onClick={handleRenameConfirm}
                className={`${styles.modalButton} ${styles.primaryButton}`}
                disabled={
                  isRenaming || !newName.trim() || newName === renamingFile.name
                }
              >
                {isRenaming ? "✏️ Renaming..." : "✏️ Rename"}
              </button>
              <button
                onClick={handleRenameCancel}
                className={styles.modalButton}
                disabled={isRenaming}
              >
                Cancel
              </button>
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
          {/* Show bulk actions if multiple items are selected or if any folder is selected */}
          {selectedFiles.size > 1 ||
          (selectedFiles.size > 0 &&
            selectedFiles.has(contextMenu.file.name)) ? (
            <>
              <div className={styles.contextMenuHeader}>
                {selectedFiles.size} item(s) selected
              </div>
              <button
                className={styles.contextMenuItem}
                onClick={() => {
                  hideContextMenu();
                  handleBulkDownload();
                }}
              >
                📥 Download as ZIP ({selectedFiles.size})
              </button>
              <hr className={styles.contextMenuSeparator} />
              <button
                className={`${styles.contextMenuItem} ${styles.danger}`}
                onClick={() => {
                  hideContextMenu();
                  handleBulkDelete();
                }}
              >
                🗑️ Delete Selected ({selectedFiles.size})
              </button>
            </>
          ) : contextMenu.file.is_directory ? (
            <>
              <button
                className={styles.contextMenuItem}
                onClick={() => handleFileClick(contextMenu.file!)}
              >
                📁 Open Folder
              </button>
              <button
                className={styles.contextMenuItem}
                onClick={() => handleRenameFile(contextMenu.file!)}
              >
                ✏️ Rename Folder
              </button>
              <hr className={styles.contextMenuSeparator} />
              <button
                className={`${styles.contextMenuItem} ${styles.danger}`}
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
              <button
                className={styles.contextMenuItem}
                onClick={() => handleRenameFile(contextMenu.file!)}
              >
                ✏️ Rename
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

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() =>
          setConfirmModal({
            isOpen: false,
            title: "",
            message: "",
            onConfirm: () => {},
          })
        }
      />

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal({ isOpen: false, title: "", message: "" })}
      />
    </div>
  );
}
