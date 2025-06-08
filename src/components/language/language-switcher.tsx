"use client";

import { useLanguage, useTranslation } from "@/contexts/language";
import type { Locale } from "@/i18n/config";
import styles from "./language-switcher.module.css";

interface LanguageSwitcherProps {
  variant?: "header" | "settings";
}

export function LanguageSwitcher({
  variant = "settings",
}: LanguageSwitcherProps) {
  const { locale, setLocale } = useLanguage();
  const { t } = useTranslation();

  const handleLanguageChange = (newLocale: Locale) => {
    setLocale(newLocale);
  };

  return (
    <div className={`${styles.container} ${styles[variant]}`}>
      <label className={styles.label}>{t("language.switchLanguage")}</label>
      <div className={styles.buttons}>
        <button
          onClick={() => handleLanguageChange("en")}
          className={`${styles.button} ${locale === "en" ? styles.active : ""}`}
        >
          {t("language.english")}
        </button>
        <button
          onClick={() => handleLanguageChange("ja")}
          className={`${styles.button} ${locale === "ja" ? styles.active : ""}`}
        >
          {t("language.japanese")}
        </button>
      </div>
    </div>
  );
}
