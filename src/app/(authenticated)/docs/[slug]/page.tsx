"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { docsService, Document } from "@/services/docs";
import { DocumentRenderer } from "@/components/docs/document-renderer";
import { useLanguage, useTranslation } from "@/contexts/language";
import styles from "@/components/docs/docs.module.css";

export default function DocumentPage() {
  const { locale } = useLanguage();
  const { t } = useTranslation();
  const params = useParams();
  const slug = params.slug as string;

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDocument = async () => {
      if (!slug) return;

      setLoading(true);
      setError(null);

      const result = await docsService.loadDocument(slug, locale);
      if (result.isErr()) {
        setError(result.error);
      } else {
        setDocument(result.value);
      }

      setLoading(false);
    };

    loadDocument();
  }, [slug, locale]);

  if (loading) {
    return (
      <div className={styles.documentRenderer}>
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.documentRenderer}>
        <h1>{t("docs.documentNotFound")}</h1>
        <p>{error}</p>
        <Link href="/docs" className="text-primary hover:underline">
          {t("docs.backToList")}
        </Link>
      </div>
    );
  }

  if (!document) {
    return (
      <div className={styles.documentRenderer}>
        <h1>{t("docs.documentNotFound")}</h1>
        <Link href="/docs" className="text-primary hover:underline">
          {t("docs.backToList")}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <nav style={{ marginBottom: "1rem" }}>
        <Link href="/docs" className="text-primary hover:underline">
          ← {t("docs.backToList")}
        </Link>
      </nav>
      <DocumentRenderer document={document} />
    </div>
  );
}
