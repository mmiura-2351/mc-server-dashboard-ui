"use client";

import React from "react";
import { Document } from "@/services/docs";
import { useTranslation } from "@/contexts/language";
import styles from "./docs.module.css";

interface DocumentRendererProps {
  document: Document;
  className?: string;
}

export function DocumentRenderer({
  document,
  className,
}: DocumentRendererProps) {
  const { t } = useTranslation();

  return (
    <article className={`${styles.documentRenderer} ${className || ""}`}>
      <header className={styles.documentHeader}>
        <h1 className={styles.documentTitle}>{document.metadata.title}</h1>
        <p className={styles.documentDescription}>
          {document.metadata.description}
        </p>
        <div className={styles.documentMeta}>
          <span className={styles.category}>{document.metadata.category}</span>
          <span className={styles.lastUpdated}>
            {t("docs.lastUpdated")}:{" "}
            {new Date(document.metadata.lastUpdated).toLocaleDateString()}
          </span>
        </div>
      </header>

      <div
        className={styles.documentContent}
        dangerouslySetInnerHTML={{ __html: document.htmlContent }}
      />
    </article>
  );
}
