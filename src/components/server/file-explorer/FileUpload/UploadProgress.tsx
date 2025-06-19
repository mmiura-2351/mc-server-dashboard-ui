"use client";

import { formatFileSize } from "@/utils/format";
import type { UploadProgressItem } from "./UploadModal";
import styles from "../../file-explorer.module.css";

interface UploadProgressProps {
  progress: UploadProgressItem;
}

export function UploadProgress({ progress }: UploadProgressProps) {
  return (
    <div className={styles.uploadFileItem}>
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
        {formatFileSize(progress.loaded)} / {formatFileSize(progress.total)}
      </div>
    </div>
  );
}
