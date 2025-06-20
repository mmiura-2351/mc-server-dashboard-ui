"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { docsService, DocMetadata } from "@/services/docs";
import { useLanguage, useTranslation } from "@/contexts/language";
import styles from "@/components/docs/docs.module.css";

export default function DocsPage() {
  const { locale } = useLanguage();
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<DocMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadDocuments = async () => {
      setLoading(true);
      setError(null);

      const result = await docsService.getAllDocuments(locale);
      if (result.isErr()) {
        setError(result.error);
      } else {
        setDocuments(result.value);
      }

      setLoading(false);
    };

    loadDocuments();
  }, [locale]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      const result = await docsService.getAllDocuments(locale);
      if (result.isOk()) {
        setDocuments(result.value);
      }
      return;
    }

    const result = await docsService.searchDocuments(query, locale);
    if (result.isOk()) {
      setDocuments(result.value);
    }
  };

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
      <div className={styles.documentList}>
        <div className={styles.documentListHeader}>
          <h1 className={styles.documentListTitle}>{t("docs.title")}</h1>
          <p className={styles.documentListDescription}>
            {t("docs.description")}
          </p>
        </div>
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.documentList}>
        <div className={styles.documentListHeader}>
          <h1 className={styles.documentListTitle}>{t("docs.title")}</h1>
          <p className={styles.documentListDescription}>
            {t("docs.description")}
          </p>
        </div>
        <p>
          {t("docs.loadError")}: {error}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.documentList}>
      <div className={styles.documentListHeader}>
        <h1 className={styles.documentListTitle}>{t("docs.title")}</h1>
        <p className={styles.documentListDescription}>
          {t("docs.description")}
        </p>
      </div>

      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder={t("docs.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {Object.entries(documentsByCategory).map(([category, categoryDocs]) => (
        <section key={category} className={styles.categorySection}>
          <h2 className={styles.categoryTitle}>{category}</h2>
          {categoryDocs.map((doc) => (
            <Link
              key={doc.slug}
              href={`/docs/${doc.slug}`}
              className={styles.documentCard}
            >
              <h3 className={styles.documentCardTitle}>{doc.title}</h3>
              <p className={styles.documentCardDescription}>
                {doc.description}
              </p>
              <div className={styles.documentCardMeta}>
                <span>
                  {t("docs.lastUpdated")}:{" "}
                  {new Date(doc.lastUpdated).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </section>
      ))}

      {documents.length === 0 && searchQuery && <p>{t("docs.noResults")}</p>}
    </div>
  );
}
