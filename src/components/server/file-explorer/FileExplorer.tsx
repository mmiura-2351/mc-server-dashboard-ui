"use client";

import { useEffect, useCallback, useState } from "react";
import * as fileService from "@/services/files";
import type { FileSystemItem } from "@/types/files";
import { useTranslation } from "@/contexts/language";
import { useAuth } from "@/contexts/auth";
import { ConfirmationModal, AlertModal } from "@/components/modal";

// Components
import { VirtualFileList } from "./VirtualFileList";
import { FileViewer } from "./FileViewer/FileViewer";
import { UploadModal } from "./FileUpload/UploadModal";
import { DragDropZone, useDragDropZone } from "./FileUpload/DragDropZone";
import { ContextMenu, type ContextMenuState } from "./FileActions/ContextMenu";
import { RenameModal } from "./FileActions/RenameModal";
import { ZipProgressModal } from "./FileActions/ZipProgressModal";

// Hooks
import { useFileNavigation } from "./hooks/useFileNavigation";
import { useFileOperations } from "./hooks/useFileOperations";
import { useFileUpload } from "./hooks/useFileUpload";
import { useFileViewer } from "./hooks/useFileViewer";
import { useStableTranslation } from "./hooks/useStableTranslation";

import styles from "../file-explorer.module.css";

interface FileExplorerProps {
  serverId: number;
}

export function FileExplorer({ serverId }: FileExplorerProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const translations = useStableTranslation();
  const {
    fileInputRef,
    folderInputRef,
    triggerFileUpload,
    triggerFolderUpload,
  } = useDragDropZone();

  // Custom hooks
  const navigation = useFileNavigation();
  const { setIsLoading, setError, setFiles, currentPath } = navigation;
  const operations = useFileOperations(serverId);
  const upload = useFileUpload(serverId);
  const viewer = useFileViewer(serverId);

  // Local state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    show: false,
    position: { x: 0, y: 0 },
    file: null,
  });

  const [toast, setToast] = useState<{
    message: string;
    type: "error" | "info";
  } | null>(null);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    variant: "default" as "default" | "danger",
    onConfirm: () => {},
  });

  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info" as "info" | "warning" | "error",
  });

  interface ZipProgressState {
    current: number;
    total: number;
    percentage: number;
    currentFile: string;
    stage: "downloading" | "zipping" | "finalizing";
  }

  const [zipProgress, setZipProgress] = useState<{
    isOpen: boolean;
    progress: ZipProgressState | null;
  }>({
    isOpen: false,
    progress: null,
  });

  // Load files function (shared between manual refresh and automatic loading)
  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await fileService.listFiles(serverId, currentPath);

    if (result.isOk()) {
      setFiles(result.value);
    } else {
      setError(result.error.message);
    }

    setIsLoading(false);
  }, [serverId, currentPath, setIsLoading, setError, setFiles]);

  // Load files when path changes
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Alias for manual refresh (for backward compatibility)
  const refreshFiles = loadFiles;

  // Toast utility
  const showToast = useCallback((message: string, type: "error" | "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Context menu handlers
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, file: FileSystemItem) => {
      e.preventDefault();
      setContextMenu({
        show: true,
        position: { x: e.clientX, y: e.clientY },
        file,
      });
    },
    []
  );

  const hideContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, show: false }));
  }, []);

  // Click outside to hide context menu
  useEffect(() => {
    const handleClickOutside = () => hideContextMenu();
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [hideContextMenu]);

  // File operations
  const handleFileClick = useCallback(
    (file: FileSystemItem) => {
      if (file.is_directory) {
        navigation.navigateToFile(file);
      } else if (viewer.isFileViewable(file.name)) {
        viewer.openFileViewer(file, navigation.currentPath);
      }
    },
    [navigation, viewer]
  );

  const handleViewFileFromContext = useCallback(
    (file: FileSystemItem) => {
      hideContextMenu();
      viewer.openFileViewer(file, navigation.currentPath);
    },
    [hideContextMenu, viewer, navigation.currentPath]
  );

  const handleDownloadFile = useCallback(
    async (file: FileSystemItem) => {
      hideContextMenu();
      const result = await operations.downloadFile(
        file,
        navigation.currentPath
      );

      if (result.isOk()) {
        const url = URL.createObjectURL(result.value);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();

        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        URL.revokeObjectURL(url);
        showToast(translations.downloadSuccess(file.name), "info");
      } else {
        showToast(translations.downloadFailed(file.name), "error");
      }
    },
    [
      hideContextMenu,
      operations,
      navigation.currentPath,
      showToast,
      translations,
    ]
  );

  const handleRenameFile = useCallback(
    (file: FileSystemItem) => {
      hideContextMenu();
      operations.startRename(file);
    },
    [hideContextMenu, operations]
  );

  const handleRenameConfirm = useCallback(async () => {
    const result = await operations.confirmRename(navigation.currentPath);

    if (result.isOk()) {
      await refreshFiles();
      showToast(translations.renameSuccess(), "info");
    } else {
      showToast(translations.renameFailed() + ": " + result.error, "error");
    }
  }, [
    operations,
    navigation.currentPath,
    refreshFiles,
    showToast,
    translations,
  ]);

  const handleDeleteFile = useCallback(
    (file: FileSystemItem) => {
      hideContextMenu();

      const confirmDelete = async () => {
        const result = await operations.deleteFile(
          file,
          navigation.currentPath
        );

        if (result.isOk()) {
          await refreshFiles();
          showToast(translations.deleteSuccess(file.name), "info");
        } else {
          showToast(translations.deleteFailed(file.name), "error");
        }

        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      };

      setConfirmModal({
        isOpen: true,
        title: translations.deleteFile(),
        message: translations.deleteFileConfirmation(file.name),
        variant: "danger",
        onConfirm: confirmDelete,
      });
    },
    [
      hideContextMenu,
      operations,
      navigation.currentPath,
      refreshFiles,
      showToast,
      translations,
    ]
  );

  const zipProgressCallback = useCallback(
    (progress: Parameters<fileService.ZipProgressCallback>[0]) => {
      setZipProgress({
        isOpen: true,
        progress,
      });
    },
    []
  );

  const handleDownloadFolderAsZip = useCallback(
    async (folder: FileSystemItem) => {
      hideContextMenu();
      setZipProgress({ isOpen: true, progress: null });

      const result = await operations.downloadBulkFiles(
        [folder],
        navigation.currentPath,
        zipProgressCallback
      );

      if (result.isOk()) {
        // Keep modal open to show completion message
        setTimeout(() => {
          setZipProgress({ isOpen: false, progress: null });
        }, 2000);
      } else {
        setZipProgress({ isOpen: false, progress: null });
        showToast(t("files.zipCreationFailed") + ": " + result.error, "error");
      }
    },
    [
      hideContextMenu,
      operations,
      navigation.currentPath,
      zipProgressCallback,
      showToast,
      t,
    ]
  );

  const handleBulkDownload = useCallback(async () => {
    setZipProgress({ isOpen: true, progress: null });

    const result = await operations.downloadBulkFiles(
      navigation.files,
      navigation.currentPath,
      zipProgressCallback
    );

    if (result.isOk()) {
      // Keep modal open to show completion message
      setTimeout(() => {
        setZipProgress({ isOpen: false, progress: null });
      }, 2000);
    } else {
      setZipProgress({ isOpen: false, progress: null });
      showToast(t("files.zipCreationFailed") + ": " + result.error, "error");
    }
  }, [
    operations,
    navigation.files,
    navigation.currentPath,
    zipProgressCallback,
    showToast,
    t,
  ]);

  const handleBulkDelete = useCallback(async () => {
    const confirmBulkDelete = async () => {
      const result = await operations.deleteBulkFiles(
        navigation.files,
        navigation.currentPath
      );

      if (result.isOk()) {
        if (result.value.deletedFileNames.length > 0) {
          // Update file list by removing successfully deleted files
          navigation.setFiles((prevFiles) =>
            prevFiles.filter(
              (f) => !result.value.deletedFileNames.includes(f.name)
            )
          );
        }

        if (result.value.failCount === 0) {
          showToast(
            translations.deleteMultipleSuccess(
              result.value.successCount.toString()
            ),
            "info"
          );
        } else {
          showToast(
            translations.deletePartialSuccess(
              result.value.successCount.toString(),
              result.value.failCount.toString()
            ),
            "error"
          );
        }
      } else {
        showToast(result.error, "error");
      }

      operations.clearSelection();
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    };

    const message =
      operations.selectedFiles.size === 1
        ? translations.deleteFileConfirmation(
            Array.from(operations.selectedFiles)[0] || "Unknown"
          )
        : translations.deleteBulkConfirmation(
            operations.selectedFiles.size.toString()
          );

    setConfirmModal({
      isOpen: true,
      title: translations.deleteFiles(),
      message,
      variant: "danger",
      onConfirm: confirmBulkDelete,
    });
  }, [operations, navigation, showToast, translations]);

  // Upload handlers
  const handleFileUpload = useCallback(
    async (files: File[], isFolder = false) => {
      // Force refresh regardless of upload result as a test
      const result = await upload.handleFileUpload(
        files,
        isFolder,
        navigation.currentPath
      );

      // Handle blocked files warning
      if (result.blocked && result.blocked.length > 0) {
        const blockedMessage = result.blocked
          .map((b) => `${b.file.name}: ${b.reason}`)
          .join("\n");
        setAlertModal({
          isOpen: true,
          title: translations.securityWarning(),
          message: translations.blockedFilesMessage() + "\n" + blockedMessage,
          type: "warning",
        });
      }

      if (result.error) {
        if (result.error === "NO_FILES_ALLOWED") {
          setAlertModal({
            isOpen: true,
            title: translations.uploadError(),
            message: translations.noFilesAllowed(),
            type: "error",
          });
        } else {
          showToast(translations.uploadFailedWithReason(result.error), "error");
        }
        return;
      }

      // Check if any files were successfully uploaded
      const successCount = result.successful?.length || 0;
      const failedCount = result.failed?.length || 0;
      const hasAnySuccess = successCount > 0;

      // Refresh after any upload attempt
      try {
        await refreshFiles();
      } catch {
        // Silently handle refresh failure
      }

      // Always refresh if there are any successful uploads, regardless of result.success flag
      if (hasAnySuccess || result.success) {
        // Show appropriate success/partial success message
        if (failedCount === 0 && successCount > 0) {
          showToast(
            `Successfully uploaded ${successCount} ${isFolder ? "files" : "file(s)"}`,
            "info"
          );
        } else if (successCount > 0) {
          showToast(
            `Uploaded ${successCount} files, ${failedCount} failed`,
            "info"
          );
        }
      } else if (result.error) {
        // Only show error if no files were uploaded successfully
        showToast(translations.uploadFailed(), "error");
      }
    },
    [upload, navigation.currentPath, refreshFiles, showToast, translations]
  );

  return (
    <DragDropZone
      isDragOver={upload.isDragOver}
      onDragEnter={upload.handleDragEnter}
      onDragLeave={upload.handleDragLeave}
      onDragOver={upload.handleDragOver}
      onDrop={(e) =>
        upload.handleDrop(e, navigation.currentPath, handleFileUpload)
      }
      onFileUpload={handleFileUpload}
      disabled={upload.uploadState.isUploading}
    >
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          const files = e.target.files;
          if (files) {
            handleFileUpload(Array.from(files), false);
          }
          e.target.value = "";
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        {...({
          webkitdirectory: "",
          directory: "",
        } as React.InputHTMLAttributes<HTMLInputElement>)}
        style={{ display: "none" }}
        onChange={(e) => {
          const files = e.target.files;
          if (files) {
            handleFileUpload(Array.from(files), true);
          }
          e.target.value = "";
        }}
      />

      <div className={styles.toolbar}>
        <div className={styles.actions}>
          <button
            onClick={triggerFileUpload}
            className={styles.actionButton}
            disabled={upload.uploadState.isUploading}
          >
            {t("files.uploadFiles")}
          </button>
          <button
            onClick={triggerFolderUpload}
            className={styles.actionButton}
            disabled={upload.uploadState.isUploading}
          >
            {t("files.uploadFolder")}
          </button>
        </div>
      </div>

      <VirtualFileList
        files={navigation.files}
        currentPath={navigation.currentPath}
        selectedFiles={operations.selectedFiles}
        isDragOver={upload.isDragOver}
        isLoading={navigation.isLoading}
        error={navigation.error}
        onPathChange={navigation.navigateToPath}
        onFileClick={handleFileClick}
        onContextMenu={handleContextMenu}
        onFileSelect={operations.toggleFileSelection}
        onSelectAll={() => operations.selectAllFiles(navigation.files)}
        onClearSelection={operations.clearSelection}
        onRefresh={refreshFiles}
        onNavigateUp={navigation.navigateUp}
      />

      {/* File Viewer Modal */}
      {(viewer.showFileViewer || viewer.isLoadingFile) &&
        viewer.selectedFile && (
          <FileViewer
            file={viewer.selectedFile}
            fileContent={viewer.fileContent}
            imageUrl={viewer.imageUrl}
            isLoading={viewer.isLoadingFile}
            isEditing={viewer.isEditing}
            isSaving={viewer.isSaving}
            editedContent={viewer.editedContent}
            serverId={serverId}
            currentPath={navigation.currentPath}
            onClose={viewer.closeFileViewer}
            onEdit={viewer.startEdit}
            onSave={async () => {
              const result = await viewer.saveFile(navigation.currentPath);
              if (result.isErr()) {
                showToast(`Save failed: ${result.error}`, "error");
              }
            }}
            onCancelEdit={viewer.cancelEdit}
            onDownload={async () => {
              const result = await viewer.downloadCurrentFile(
                navigation.currentPath
              );
              if (result.isErr()) {
                showToast(`Download failed: ${result.error}`, "error");
              }
            }}
            onContentChange={viewer.setEditedContent}
            onReloadFile={() => {
              if (viewer.selectedFile) {
                viewer.openFileViewer(
                  viewer.selectedFile,
                  navigation.currentPath
                );
              }
            }}
            isAdmin={user?.role === "admin"}
          />
        )}

      {/* Upload Progress Modal */}
      <UploadModal
        isOpen={upload.showUploadModal}
        uploadState={upload.uploadState}
        onClose={() => upload.setShowUploadModal(false)}
        onReset={upload.resetUploadState}
      />

      {/* Rename Modal */}
      <RenameModal
        file={operations.renamingFile}
        newName={operations.newName}
        isRenaming={operations.isRenaming}
        onNameChange={operations.setNewName}
        onConfirm={handleRenameConfirm}
        onCancel={operations.cancelRename}
      />

      {/* Context Menu */}
      <ContextMenu
        contextMenu={contextMenu}
        selectedFiles={operations.selectedFiles}
        onClose={hideContextMenu}
        onOpenFolder={handleFileClick}
        onViewFile={handleViewFileFromContext}
        onDownloadFile={handleDownloadFile}
        onDownloadFolderAsZip={handleDownloadFolderAsZip}
        onRenameFile={handleRenameFile}
        onDeleteFile={handleDeleteFile}
        onBulkDownload={handleBulkDownload}
        onBulkDelete={handleBulkDelete}
      />

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
            variant: "default",
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
        onClose={() =>
          setAlertModal({ isOpen: false, title: "", message: "", type: "info" })
        }
      />

      {/* ZIP Progress Modal */}
      <ZipProgressModal
        isOpen={zipProgress.isOpen}
        progress={zipProgress.progress}
        onClose={() => setZipProgress({ isOpen: false, progress: null })}
      />
    </DragDropZone>
  );
}
