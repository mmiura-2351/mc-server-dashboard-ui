"use client";

import { useEffect, useRef } from "react";
import { useTranslation } from "@/contexts/language";
import styles from "./confirmation-modal.module.css";

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Handle keyboard navigation and focus trapping
  useEffect(() => {
    if (!isOpen) return;

    // Focus the cancel button initially for safer default
    const focusTarget = cancelButtonRef.current;
    if (focusTarget) {
      focusTarget.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();
        // Simple focus cycling between cancel and confirm buttons
        if (document.activeElement === cancelButtonRef.current) {
          confirmButtonRef.current?.focus();
        } else {
          cancelButtonRef.current?.focus();
        }
      }

      if (event.key === "Enter") {
        event.preventDefault();
        if (document.activeElement === confirmButtonRef.current) {
          onConfirm();
        } else {
          onCancel();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onConfirm, onCancel]);

  // Handle overlay click
  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onCancel();
    }
  };

  if (!isOpen) return null;

  const getVariantClass = () => {
    switch (variant) {
      case "danger":
        return styles.danger;
      case "warning":
        return styles.warning;
      default:
        return styles.default;
    }
  };

  return (
    <div
      className={styles.overlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-title"
      aria-describedby="confirmation-message"
    >
      <div ref={dialogRef} className={`${styles.modal} ${getVariantClass()}`}>
        <div className={styles.header}>
          <h2 id="confirmation-title" className={styles.title}>
            {title}
          </h2>
        </div>

        <div className={styles.body}>
          <p id="confirmation-message" className={styles.message}>
            {message}
          </p>
        </div>

        <div className={styles.footer}>
          <button
            ref={cancelButtonRef}
            type="button"
            className={styles.cancelButton}
            onClick={onCancel}
          >
            {cancelLabel || t("common.cancel")}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            className={`${styles.confirmButton} ${getVariantClass()}`}
            onClick={onConfirm}
          >
            {confirmLabel || t("common.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
