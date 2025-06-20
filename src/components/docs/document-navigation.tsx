"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { docsService, DocMetadata } from "@/services/docs";
import { useLanguage, useTranslation } from "@/contexts/language";
import styles from "./docs.module.css";

interface DocumentNavigationProps {
  className?: string;
}

export function DocumentNavigation({ className }: DocumentNavigationProps) {
  const { locale } = useLanguage();
  const { t } = useTranslation();
  const pathname = usePathname();
  const [documents, setDocuments] = useState<DocMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDocuments = async () => {
      setLoading(true);

      const result = await docsService.getAllDocuments(locale);
      if (result.isOk()) {
        setDocuments(result.value);
      }

      setLoading(false);
    };

    loadDocuments();
  }, [locale]);

  // Group documents by category
  const documentsByCategory = (documents || []).reduce(
    (acc, doc) => {
      if (!acc[doc.category]) {
        acc[doc.category] = [];
      }
      acc[doc.category]!.push(doc);
      return acc;
    },
    {} as Record<string, DocMetadata[]>
  );

  if (loading) {
    return (
      <nav className={`${styles.documentNav} ${className || ""}`}>
        <h3 className={styles.documentNavTitle}>{t("docs.navigation")}</h3>
        <p className={styles.navLoading}>{t("common.loading")}</p>
      </nav>
    );
  }

  return (
    <nav className={`${styles.documentNav} ${className || ""}`}>
      <h3 className={styles.documentNavTitle}>{t("docs.navigation")}</h3>

      {/* All Documents Link */}
      <Link
        href="/docs"
        className={`${styles.navAllDocsLink} ${pathname === "/docs" ? styles.active : ""}`}
      >
        📚 {t("docs.allDocuments")}
      </Link>

      {/* Document Tree */}
      <div className={styles.documentTree}>
        {Object.entries(documentsByCategory).map(([category, categoryDocs]) => (
          <div key={category} className={styles.categoryGroup}>
            <div className={styles.categoryHeader}>
              <span className={styles.categoryIcon}>📁</span>
              <span className={styles.categoryName}>{category}</span>
            </div>

            <ul className={styles.navDocumentList}>
              {categoryDocs.map((doc) => {
                const isActive = pathname === `/docs/${doc.slug}`;
                return (
                  <li key={doc.slug} className={styles.documentItem}>
                    <Link
                      href={`/docs/${doc.slug}`}
                      className={`${styles.documentLink} ${isActive ? styles.active : ""}`}
                    >
                      <span className={styles.documentIcon}>📄</span>
                      <span className={styles.navDocumentTitle}>
                        {doc.title}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
