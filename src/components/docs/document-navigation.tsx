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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    const loadDocuments = async () => {
      setLoading(true);

      const result = await docsService.getAllDocuments(locale);
      if (result.isOk()) {
        setDocuments(result.value);
        // Auto-expand category containing current document
        const currentDoc = result.value.find(
          (doc) => pathname === `/docs/${doc.slug}`
        );
        if (currentDoc) {
          setExpandedCategories(new Set([currentDoc.category]));
        }
      }

      setLoading(false);
    };

    loadDocuments();
  }, [locale, pathname]);

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

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

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

      {/* Document Tree as collapsible list */}
      <div className={styles.documentTree}>
        <ul className={styles.navRootList}>
          {/* All Documents Link */}
          <li className={styles.navRootItem}>
            <Link
              href="/docs"
              className={`${styles.navAllDocsLink} ${pathname === "/docs" ? styles.active : ""}`}
            >
              📋 {t("docs.allDocuments")}
            </Link>
          </li>

          {/* Categories */}
          {Object.entries(documentsByCategory).map(
            ([category, categoryDocs]) => {
              const isExpanded = expandedCategories.has(category);
              const hasActiveDoc = categoryDocs.some(
                (doc) => pathname === `/docs/${doc.slug}`
              );

              return (
                <li key={category} className={styles.navCategoryItem}>
                  <button
                    onClick={() => toggleCategory(category)}
                    className={`${styles.categoryToggle} ${hasActiveDoc ? styles.hasActive : ""}`}
                    aria-expanded={isExpanded}
                  >
                    <span className={styles.expandIcon}>
                      {isExpanded ? "▼" : "▶"}
                    </span>
                    <span className={styles.categoryIcon}>📁</span>
                    <span className={styles.categoryName}>{category}</span>
                  </button>

                  {isExpanded && (
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
                  )}
                </li>
              );
            }
          )}
        </ul>
      </div>
    </nav>
  );
}
