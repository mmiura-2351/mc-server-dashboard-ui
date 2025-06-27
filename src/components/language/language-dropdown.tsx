"use client";

import { useState, useRef, useEffect } from "react";
import { useLanguage, useTranslation } from "@/contexts/language";
import type { Locale } from "@/i18n/config";
import styles from "./language-dropdown.module.css";

interface Language {
  code: Locale;
  name: string;
  nativeName: string;
  flag?: string;
}

const LANGUAGES: Language[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  // Easy to add more languages:
  // { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  // { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  // { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
];

interface LanguageDropdownProps {
  variant?: "header" | "settings";
  compact?: boolean;
}

export function LanguageDropdown({
  variant = "settings",
  compact = false,
}: LanguageDropdownProps) {
  const { locale, setLocale } = useLanguage();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage =
    LANGUAGES.find((lang) => lang.code === locale) ?? LANGUAGES[0]!;

  const handleLanguageChange = (
    event: React.MouseEvent<HTMLButtonElement>,
    newLocale: Locale
  ) => {
    event.preventDefault();
    setLocale(newLocale);
    setIsOpen(false);
  };

  const toggleDropdown = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsOpen(!isOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={dropdownRef}
      className={`${styles.container} ${styles[variant]} ${compact ? styles.compact : ""}`}
      data-testid="language-switcher"
    >
      {!compact && variant === "settings" && (
        <label className={styles.label}>{t("language.switchLanguage")}</label>
      )}

      <div className={styles.dropdown}>
        <button
          type="button"
          onClick={toggleDropdown}
          className={`${styles.trigger} ${isOpen ? styles.open : ""}`}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <div className={styles.current}>
            {compact ? (
              <>
                <span className={styles.globe}>🌐</span>
                <span className={styles.code}>
                  {currentLanguage.code.toUpperCase()}
                </span>
              </>
            ) : (
              <>
                <span className={styles.flag}>{currentLanguage.flag}</span>
                <span className={styles.name}>
                  {currentLanguage.nativeName}
                </span>
              </>
            )}
          </div>
          <span className={`${styles.arrow} ${isOpen ? styles.arrowUp : ""}`}>
            ▼
          </span>
        </button>

        {isOpen && (
          <ul className={styles.menu} role="listbox">
            {LANGUAGES.map((language) => (
              <li
                key={language.code}
                role="option"
                aria-selected={locale === language.code}
              >
                <button
                  type="button"
                  onClick={(e) => handleLanguageChange(e, language.code)}
                  className={`${styles.option} ${locale === language.code ? styles.active : ""}`}
                >
                  <span className={styles.flag}>{language.flag}</span>
                  <div className={styles.languageInfo}>
                    <span className={styles.nativeName}>
                      {language.nativeName}
                    </span>
                    {!compact && (
                      <span className={styles.englishName}>
                        {language.name}
                      </span>
                    )}
                  </div>
                  {locale === language.code && (
                    <span className={styles.checkmark}>✓</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
