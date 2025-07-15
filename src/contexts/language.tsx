"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Locale } from "@/i18n/config";
import { defaultLocale } from "@/i18n/config";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  messages: Record<string, unknown>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [messages, setMessages] = useState<Record<string, unknown>>({});

  useEffect(() => {
    // Load saved locale from localStorage
    const savedLocale = localStorage.getItem("locale") as Locale;
    if (savedLocale && (savedLocale === "en" || savedLocale === "ja")) {
      setLocaleState(savedLocale);
    }
  }, []);

  useEffect(() => {
    // Load messages for current locale
    let isCancelled = false;

    const loadMessages = async () => {
      try {
        const messageModule = await import(`@/i18n/messages/${locale}.json`);
        if (!isCancelled) {
          setMessages(messageModule.default);
        }
      } catch {
        // Silently fallback to English on message loading error
        const fallbackModule = await import(`@/i18n/messages/en.json`);
        if (!isCancelled) {
          setMessages(fallbackModule.default);
        }
      }
    };

    loadMessages();

    return () => {
      isCancelled = true;
    };
  }, [locale]);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("locale", newLocale);
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, messages }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

// Type guard to check if value is a valid nested object
const isNestedObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

// Safe function to get nested translation value
const getNestedValue = (
  obj: Record<string, unknown>,
  path: string[]
): string => {
  let value: unknown = obj;

  for (const key of path) {
    // More robust checking for Node.js version compatibility
    if (!isNestedObject(value)) {
      return path.join("."); // Fallback to key path
    }

    // Use Object.prototype.hasOwnProperty.call for more reliable property checking
    // This avoids potential issues with 'in' operator across different Node.js versions
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      return path.join("."); // Fallback to key path
    }

    value = value[key];

    // If we encounter null or undefined at any level, return the path as fallback
    if (value === null || value === undefined) {
      return path.join(".");
    }
  }

  return typeof value === "string" ? value : path.join(".");
};

// Helper function to get nested translation
export function useTranslation() {
  const { messages } = useLanguage();

  const t = useCallback(
    (key: string, params?: Record<string, string>) => {
      const keys = key.split(".");

      // Use the safe nested value getter
      const value = getNestedValue(messages, keys);

      if (params && typeof value === "string") {
        // Replace parameters in the string
        return Object.entries(params).reduce((str, [param, replacement]) => {
          return str.replace(`{${param}}`, replacement);
        }, value);
      }

      return value;
    },
    [messages]
  );

  return { t };
}
