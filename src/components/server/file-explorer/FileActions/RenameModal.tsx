"use client";

import { useEffect, useRef } from "react";
import { useTranslation } from "@/contexts/language";
import type { FileSystemItem } from "@/types/files";
import { InputSanitizer } from "@/utils/input-sanitizer";
import styles from "../../file-explorer.module.css";

interface RenameModalProps {
  file: FileSystemItem | null;
  newName: string;
  isRenaming: boolean;
  onNameChange: (name: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RenameModal({
  file,
  newName,
  isRenaming,
  onNameChange,
  onConfirm,
  onCancel,
}: RenameModalProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Handle focus management and keyboard navigation
  useEffect(() => {
    if (!file) return;

    // Focus the input field when modal opens
    const inputElement = inputRef.current;
    if (inputElement) {
      inputElement.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }

      // Focus trap implementation
      if (event.key === "Tab") {
        const focusableElements = [
          inputRef.current,
          confirmButtonRef.current,
          cancelButtonRef.current,
          dialogRef.current?.querySelector("button[class*='closeButton']"),
        ].filter(Boolean);

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          (lastElement as HTMLElement)?.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          (firstElement as HTMLElement)?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [file, onCancel]);

  if (!file) return null;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = InputSanitizer.sanitizeFilePath(e.target.value);
    onNameChange(sanitized);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onConfirm();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  // Handle overlay click
  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onCancel();
    }
  };

  // Create safe IDs by encoding the file name
  const safeFileName = encodeURIComponent(file.name).replace(/[.]/g, "_");
  const titleId = `rename-modal-title-${safeFileName}`;
  const descriptionId = `rename-modal-description-${safeFileName}`;

  return (
    <div
      className={styles.modal}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <div ref={dialogRef} className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3 id={titleId}>
            {t("files.rename")}{" "}
            {file.is_directory ? t("files.folder") : t("files.file")}
          </h3>
          <button
            onClick={onCancel}
            className={styles.closeButton}
            aria-label={t("common.close")}
          >
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.renameForm}>
            <label htmlFor="newName">
              {t("files.newNameFor")} &ldquo;{file.name}&rdquo;:
            </label>
            <input
              ref={inputRef}
              id="newName"
              type="text"
              value={newName}
              onChange={handleNameChange}
              onKeyDown={handleKeyDown}
              disabled={isRenaming}
              className={styles.renameInput}
              aria-describedby={descriptionId}
            />
            <div id={descriptionId} className="sr-only">
              {t("files.renameInstructions")}
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            ref={confirmButtonRef}
            onClick={onConfirm}
            className={`${styles.modalButton} ${styles.primaryButton}`}
            disabled={isRenaming || !newName.trim() || newName === file.name}
          >
            {isRenaming ? t("files.renaming") : t("files.rename")}
          </button>
          <button
            ref={cancelButtonRef}
            onClick={onCancel}
            className={styles.modalButton}
            disabled={isRenaming}
          >
            {t("files.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
