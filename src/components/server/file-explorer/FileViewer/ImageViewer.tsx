"use client";

import { useTranslation } from "@/contexts/language";
import styles from "../../file-explorer.module.css";

interface ImageViewerProps {
  fileName: string;
  imageUrl: string;
  onError: () => void;
}

export function ImageViewer({ fileName, imageUrl, onError }: ImageViewerProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.imageContainer}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={fileName}
          className={styles.imageDisplay}
          onError={onError}
        />
      ) : (
        <div className={styles.fileLoading}>{t("files.loadingImage")}</div>
      )}
    </div>
  );
}
