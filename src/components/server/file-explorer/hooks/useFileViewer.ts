"use client";

import { useState, useCallback } from "react";
import { ok, err, Result } from "neverthrow";
import * as fileService from "@/services/files";
import type { FileSystemItem } from "@/types/files";

// Helper functions
const isImageFile = (fileName: string): boolean => {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  return ["png", "jpg", "jpeg", "gif", "bmp", "webp", "svg"].includes(
    extension
  );
};

const isTextFile = (fileName: string): boolean => {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  return [
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
  ].includes(extension);
};

const isFileViewable = (fileName: string): boolean => {
  return isImageFile(fileName) || isTextFile(fileName);
};

export function useFileViewer(serverId: number) {
  const [selectedFile, setSelectedFile] = useState<FileSystemItem | null>(null);
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [fileContent, setFileContent] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const openFileViewer = useCallback(
    async (file: FileSystemItem, currentPath: string) => {
      if (!isFileViewable(file.name)) return;

      setSelectedFile(file);
      setShowFileViewer(true);
      setIsLoadingFile(true);
      setFileContent("");
      setImageUrl("");

      const filePath =
        currentPath === "/" ? file.name : `${currentPath}/${file.name}`;

      try {
        if (isImageFile(file.name)) {
          const result = await fileService.downloadFile(serverId, filePath);
          if (result.isOk()) {
            const url = URL.createObjectURL(result.value);
            setImageUrl(url);
          } else {
            console.error("Error loading image file:", result.error);
          }
        } else if (isTextFile(file.name)) {
          const result = await fileService.readTextFile(serverId, filePath);
          if (result.isOk()) {
            setFileContent(result.value.content);
          } else {
            console.error("Error loading text file:", result.error);
          }
        }
      } catch (error) {
        console.error("Error loading file:", error);
      } finally {
        setIsLoadingFile(false);
      }
    },
    [serverId]
  );

  const closeFileViewer = useCallback(() => {
    setShowFileViewer(false);
    setSelectedFile(null);
    setFileContent("");
    setEditedContent("");
    setIsEditing(false);
    setIsSaving(false);

    // Clean up image URL to prevent memory leaks
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
      setImageUrl("");
    }
  }, [imageUrl]);

  const startEdit = useCallback(() => {
    setIsEditing(true);
    setEditedContent(fileContent);
  }, [fileContent]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditedContent("");
  }, []);

  const saveFile = useCallback(
    async (currentPath: string): Promise<Result<void, string>> => {
      if (!selectedFile || !isEditing)
        return err("No file selected or not in editing mode");

      setIsSaving(true);

      const filePath =
        currentPath === "/"
          ? selectedFile.name
          : `${currentPath}/${selectedFile.name}`;

      try {
        const result = await fileService.writeFile(serverId, filePath, {
          content: editedContent,
          encoding: "utf-8",
          create_backup: true,
        });

        if (result.isOk()) {
          setFileContent(editedContent);
          setIsEditing(false);
          setEditedContent("");
          return ok(undefined);
        } else {
          return err(result.error.message);
        }
      } catch (error) {
        return err(error instanceof Error ? error.message : "Unknown error");
      } finally {
        setIsSaving(false);
      }
    },
    [serverId, selectedFile, isEditing, editedContent]
  );

  const downloadCurrentFile = useCallback(
    async (currentPath: string): Promise<Result<void, string>> => {
      if (!selectedFile) return err("No file selected");

      const filePath =
        currentPath === "/"
          ? selectedFile.name
          : `${currentPath}/${selectedFile.name}`;

      const result = await fileService.downloadFile(serverId, filePath);

      if (result.isOk()) {
        // Create download link
        const url = URL.createObjectURL(result.value);
        const a = document.createElement("a");
        a.href = url;
        a.download = selectedFile.name;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();

        // Cleanup
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        URL.revokeObjectURL(url);

        return ok(undefined);
      } else {
        return err(result.error.message);
      }
    },
    [serverId, selectedFile]
  );

  return {
    // State
    selectedFile,
    showFileViewer,
    fileContent,
    imageUrl,
    isLoadingFile,
    isEditing,
    editedContent,
    isSaving,

    // Actions
    openFileViewer,
    closeFileViewer,
    startEdit,
    cancelEdit,
    saveFile,
    downloadCurrentFile,
    setEditedContent,

    // Utilities
    isFileViewable,
    isImageFile,
    isTextFile,
  };
}
