"use client";

import React from "react";
import DOMPurify from "dompurify";
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

  // Sanitize HTML content to prevent XSS attacks
  const sanitizedContent = React.useMemo(() => {
    if (typeof window === "undefined") {
      // Server-side rendering: return content as-is for now
      // In production, consider using a server-side sanitizer
      return document.htmlContent;
    }

    // Client-side: use DOMPurify to sanitize HTML
    return DOMPurify.sanitize(document.htmlContent, {
      // Allow common HTML tags for documentation
      ALLOWED_TAGS: [
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "p",
        "br",
        "span",
        "div",
        "strong",
        "em",
        "b",
        "i",
        "u",
        "ul",
        "ol",
        "li",
        "blockquote",
        "pre",
        "code",
        "a",
        "img",
        "table",
        "thead",
        "tbody",
        "tr",
        "th",
        "td",
        "hr",
      ],
      // Allow safe attributes
      ALLOWED_ATTR: [
        "href",
        "src",
        "alt",
        "title",
        "class",
        "id",
        "target",
        "rel",
        "width",
        "height",
      ],
      // Allow only safe protocols for links and images
      ALLOWED_URI_REGEXP:
        /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
      // Remove scripts and other dangerous content
      FORBID_TAGS: ["script", "object", "embed", "iframe", "form", "input"],
      FORBID_ATTR: [
        "onerror",
        "onload",
        "onclick",
        "onmouseover",
        "onfocus",
        "onblur",
        "style",
      ],
      // Keep whitespace formatting
      KEEP_CONTENT: true,
    });
  }, [document.htmlContent]);

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
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />
    </article>
  );
}
