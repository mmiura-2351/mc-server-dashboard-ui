"use client";

import { useRef, ReactNode } from "react";
import styles from "../../file-explorer.module.css";

interface DragDropZoneProps {
  children: ReactNode;
  isDragOver: boolean;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileUpload: (files: File[], isFolder?: boolean) => void;
  disabled?: boolean;
}

export function DragDropZone({
  children,
  isDragOver,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onFileUpload,
  disabled = false,
}: DragDropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (files) {
      onFileUpload(Array.from(files), false);
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
      onFileUpload(fileArray, true);
    }
    // Reset input value to allow re-selecting the same folder
    event.target.value = "";
  };

  const triggerFileUpload = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const triggerFolderUpload = () => {
    if (!disabled) {
      folderInputRef.current?.click();
    }
  };

  return (
    <div
      className={`${styles.container} ${isDragOver ? styles.dragOver : ""}`}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
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

      {children}

      {/* Expose upload functions */}
      <div style={{ display: "none" }}>
        <button onClick={triggerFileUpload} data-testid="trigger-file-upload" />
        <button
          onClick={triggerFolderUpload}
          data-testid="trigger-folder-upload"
        />
      </div>
    </div>
  );
}

// Export refs for parent access
export const useDragDropZone = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  return {
    fileInputRef,
    folderInputRef,
    triggerFileUpload: () => fileInputRef.current?.click(),
    triggerFolderUpload: () => folderInputRef.current?.click(),
  };
};
