"use client";

import { useEffect, useRef } from "react";
import { useTranslation } from "@/contexts/language";
import styles from "./alert-modal.module.css";

export interface AlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: "info" | "warning" | "error" | "success";
  buttonLabel?: string;
  onClose: () => void;
}

export function AlertModal({
  isOpen,
  title,
  message,
  type = "info",
  buttonLabel,
  onClose,
}: AlertModalProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Handle keyboard navigation and focus management
  useEffect(() => {
    if (!isOpen) return;

    // Focus the close button
    const focusTarget = buttonRef.current;
    if (focusTarget) {
      focusTarget.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter") {
        event.preventDefault();
        onClose();
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Handle overlay click
  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const getTypeClass = () => {
    switch (type) {
      case "warning":
        return styles.warning;
      case "error":
        return styles.error;
      case "success":
        return styles.success;
      default:
        return styles.info;
    }
  };

  const getIcon = () => {
    switch (type) {
      case "warning":
        return "⚠️";
      case "error":
        return "❌";
      case "success":
        return "✅";
      default:
        return "ℹ️";
    }
  };

  return (
    <div
      className={styles.overlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-title"
      aria-describedby="alert-message"
    >
      <div ref={dialogRef} className={`${styles.modal} ${getTypeClass()}`}>
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <span className={styles.icon} aria-hidden="true">
              {getIcon()}
            </span>
            <h2 id="alert-title" className={styles.title}>
              {title}
            </h2>
          </div>
        </div>

        <div className={styles.body}>
          <p id="alert-message" className={styles.message}>
            {message}
          </p>
        </div>

        <div className={styles.footer}>
          <button
            ref={buttonRef}
            type="button"
            className={`${styles.closeButton} ${getTypeClass()}`}
            onClick={onClose}
          >
            {buttonLabel || t("common.ok")}
          </button>
        </div>
      </div>
    </div>
  );
}
