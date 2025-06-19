"use client";

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

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3>
            {t("files.rename")}{" "}
            {file.is_directory ? t("files.folder") : t("files.file")}
          </h3>
          <button onClick={onCancel} className={styles.closeButton}>
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.renameForm}>
            <label htmlFor="newName">
              {t("files.newNameFor")} &ldquo;{file.name}&rdquo;:
            </label>
            <input
              id="newName"
              type="text"
              value={newName}
              onChange={handleNameChange}
              onKeyDown={handleKeyDown}
              disabled={isRenaming}
              autoFocus
              className={styles.renameInput}
            />
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            onClick={onConfirm}
            className={`${styles.modalButton} ${styles.primaryButton}`}
            disabled={isRenaming || !newName.trim() || newName === file.name}
          >
            {isRenaming ? t("files.renaming") : t("files.rename")}
          </button>
          <button
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
