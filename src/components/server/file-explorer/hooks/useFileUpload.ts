"use client";

import { useState, useCallback } from "react";
import * as fileService from "@/services/files";
import {
  FileUploadSecurity,
  DEFAULT_UPLOAD_CONFIG,
} from "@/utils/file-upload-security";
import type {
  UploadState,
  UploadProgressItem,
} from "../FileUpload/UploadModal";

export function useFileUpload(serverId: number) {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: [],
    completed: [],
    failed: [],
  });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const resetUploadState = useCallback(() => {
    setUploadState({
      isUploading: false,
      progress: [],
      completed: [],
      failed: [],
    });
  }, []);

  const updateUploadProgress = useCallback(
    (filename: string, progress: Partial<UploadProgressItem>) => {
      setUploadState((prev) => ({
        ...prev,
        progress: prev.progress.map((p) =>
          p.filename === filename ? { ...p, ...progress } : p
        ),
      }));
    },
    []
  );

  const handleFileUpload = useCallback(
    async (files: File[], isFolder = false, currentPath: string) => {
      if (files.length === 0)
        return { success: false, warnings: [], blocked: [] };

      // Validate files for security
      const securityResult = await FileUploadSecurity.securityFilter(files, {
        ...DEFAULT_UPLOAD_CONFIG,
        maxFileSize: 50 * 1024 * 1024, // 50MB for Minecraft server files
        maxTotalSize: 200 * 1024 * 1024, // 200MB total
        maxFiles: 20, // Reasonable limit for server files
      });

      // Use only allowed files
      const allowedFiles = securityResult.allowed;
      if (allowedFiles.length === 0) {
        return {
          success: false,
          error: "No files allowed",
          warnings: securityResult.warnings,
          blocked: securityResult.blocked,
        };
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
        const progressCallback = (progress: {
          filename: string;
          percentage: number;
          loaded: number;
          total: number;
        }) => {
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
            allowedFiles,
            progressCallback
          );
        } else {
          result = await fileService.uploadMultipleFiles(
            serverId,
            currentPath,
            allowedFiles,
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

          return {
            success: true,
            successful: result.value.successful,
            failed: result.value.failed,
            warnings: securityResult.warnings,
            blocked: securityResult.blocked,
          };
        } else {
          setUploadState((prev) => ({
            ...prev,
            isUploading: false,
            failed: [{ file: "Upload process", error: result.error.message }],
          }));

          return {
            success: false,
            error: result.error.message,
            warnings: securityResult.warnings,
            blocked: securityResult.blocked,
          };
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

        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          warnings: securityResult.warnings,
          blocked: securityResult.blocked,
        };
      }
    },
    [serverId, updateUploadProgress]
  );

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only set drag over to false if we're leaving the container entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, currentPath: string) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const items = Array.from(e.dataTransfer.items);
      const files: File[] = [];

      // Process dropped items
      const processEntry = (
        entry: FileSystemEntry,
        path = ""
      ): Promise<void> => {
        return new Promise<void>((resolve) => {
          if (entry.isFile) {
            (entry as FileSystemFileEntry).file((file) => {
              // Add webkitRelativePath for folder structure
              Object.defineProperty(file, "webkitRelativePath", {
                value: path + file.name,
                writable: false,
              });
              files.push(file);
              resolve();
            });
          } else if (entry.isDirectory) {
            const dirReader = (
              entry as FileSystemDirectoryEntry
            ).createReader();
            dirReader.readEntries((entries) => {
              const promises = entries.map((childEntry) =>
                processEntry(childEntry, path + entry.name + "/")
              );
              Promise.all(promises).then(() => resolve());
            });
          } else {
            resolve();
          }
        });
      };

      const promises = items.map((item) => {
        const entry = item.webkitGetAsEntry();
        return entry ? processEntry(entry) : Promise.resolve();
      });

      Promise.all(promises).then(() => {
        if (files.length > 0) {
          const hasDirectoryStructure = files.some((f) =>
            (
              f as File & { webkitRelativePath?: string }
            ).webkitRelativePath?.includes("/")
          );
          handleFileUpload(files, hasDirectoryStructure, currentPath);
        }
      });
    },
    [handleFileUpload]
  );

  return {
    uploadState,
    showUploadModal,
    isDragOver,
    setShowUploadModal,
    resetUploadState,
    handleFileUpload,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  };
}
