"use client";

import { useState, useCallback } from "react";
import { err, ok, Result } from "neverthrow";
import * as fileService from "@/services/files";
import type { FileSystemItem } from "@/types/files";

export function useFileOperations(serverId: number) {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [renamingFile, setRenamingFile] = useState<FileSystemItem | null>(null);
  const [newName, setNewName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  // File selection operations
  const toggleFileSelection = useCallback((fileName: string) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(fileName)) {
        newSet.delete(fileName);
      } else {
        newSet.add(fileName);
      }
      return newSet;
    });
  }, []);

  const selectAllFiles = useCallback((files: FileSystemItem[]) => {
    setSelectedFiles(new Set(files.map((f) => f.name)));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedFiles(new Set());
  }, []);

  // Rename operations
  const startRename = useCallback((file: FileSystemItem) => {
    setRenamingFile(file);
    setNewName(file.name);
  }, []);

  const cancelRename = useCallback(() => {
    setRenamingFile(null);
    setNewName("");
    setIsRenaming(false);
  }, []);

  const confirmRename = useCallback(
    async (currentPath: string): Promise<Result<void, string>> => {
      if (!renamingFile || !newName.trim() || newName === renamingFile.name) {
        return err("Invalid rename parameters");
      }

      setIsRenaming(true);

      const oldPath =
        currentPath === "/"
          ? renamingFile.name
          : `${currentPath}/${renamingFile.name}`;
      const newPath =
        currentPath === "/" ? newName : `${currentPath}/${newName}`;

      const result = await fileService.renameFile(serverId, oldPath, newPath);

      setIsRenaming(false);

      if (result.isOk()) {
        setRenamingFile(null);
        setNewName("");
        return ok(undefined);
      } else {
        return err(result.error.message);
      }
    },
    [serverId, renamingFile, newName]
  );

  // Delete operations
  const deleteFile = useCallback(
    async (file: FileSystemItem, currentPath: string) => {
      const filePath =
        currentPath === "/" ? file.name : `${currentPath}/${file.name}`;

      return await fileService.deleteFile(serverId, filePath);
    },
    [serverId]
  );

  const deleteBulkFiles = useCallback(
    async (
      files: FileSystemItem[],
      currentPath: string
    ): Promise<
      Result<
        { successCount: number; failCount: number; deletedFileNames: string[] },
        string
      >
    > => {
      const selected = files.filter((f) => selectedFiles.has(f.name));
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

      // Clear selection of successfully deleted files
      if (deletedFileNames.length > 0) {
        setSelectedFiles((prev) => {
          const newSet = new Set(prev);
          deletedFileNames.forEach((name) => newSet.delete(name));
          return newSet;
        });
      }

      return ok({ successCount, failCount, deletedFileNames });
    },
    [serverId, selectedFiles]
  );

  // Download operations
  const downloadFile = useCallback(
    async (file: FileSystemItem, currentPath: string) => {
      if (file.is_directory) {
        return err({ message: "Cannot download directory" });
      }

      const filePath =
        currentPath === "/" ? file.name : `${currentPath}/${file.name}`;

      return await fileService.downloadFile(serverId, filePath);
    },
    [serverId]
  );

  const downloadBulkFiles = useCallback(
    async (
      _files: FileSystemItem[],
      _currentPath: string
    ): Promise<Result<void, string>> => {
      // TODO: Implement bulk download functionality
      return err("Bulk download not yet implemented");
    },
    []
  );

  return {
    // Selection state
    selectedFiles,
    toggleFileSelection,
    selectAllFiles,
    clearSelection,

    // Rename state and operations
    renamingFile,
    newName,
    isRenaming,
    setNewName,
    startRename,
    cancelRename,
    confirmRename,

    // File operations
    deleteFile,
    deleteBulkFiles,
    downloadFile,
    downloadBulkFiles,
  };
}
