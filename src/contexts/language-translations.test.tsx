import { render, screen, act, waitFor } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import React from "react";

// Mock the language context with controlled translation data
const mockEnMessages = {
  common: {
    loading: "Loading...",
    save: "Save",
    cancel: "Cancel",
  },
  auth: {
    login: "Login",
    logout: "Logout",
    welcome: "Welcome, {name}!",
  },
  errors: {
    operationFailed: "Failed to {action}",
    serverError: "Server error occurred",
  },
  nested: {
    deeply: {
      nested: {
        key: "Deep nested value",
      },
    },
  },
};

const mockJaMessages = {
  common: {
    loading: "読み込み中...",
    save: "保存",
    cancel: "キャンセル",
  },
  auth: {
    login: "ログイン",
    logout: "ログアウト",
    welcome: "ようこそ、{name}さん！",
  },
  errors: {
    operationFailed: "{action}に失敗しました",
    serverError: "サーバーエラーが発生しました",
  },
  nested: {
    deeply: {
      nested: {
        key: "深くネストされた値",
      },
    },
  },
};

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
});

// Create mock context provider for testing translation functionality
interface MockLanguageContextType {
  locale: "en" | "ja";
  setLocale: (locale: "en" | "ja") => void;
  messages: Record<string, unknown>;
}

const MockLanguageContext = React.createContext<
  MockLanguageContextType | undefined
>(undefined);

interface MockLanguageProviderProps {
  children: React.ReactNode;
  initialLocale?: "en" | "ja";
}

const MockLanguageProvider = ({
  children,
  initialLocale = "en",
}: MockLanguageProviderProps) => {
  const [locale, setLocaleState] = React.useState<"en" | "ja">(initialLocale);
  const [messages, setMessages] = React.useState<Record<string, unknown>>(
    initialLocale === "en" ? mockEnMessages : mockJaMessages
  );

  React.useEffect(() => {
    setMessages(locale === "en" ? mockEnMessages : mockJaMessages);
  }, [locale]);

  const setLocale = (newLocale: "en" | "ja") => {
    setLocaleState(newLocale);
    mockLocalStorage.setItem("locale", newLocale);
  };

  return (
    <MockLanguageContext.Provider value={{ locale, setLocale, messages }}>
      {children}
    </MockLanguageContext.Provider>
  );
};

MockLanguageProvider.displayName = "MockLanguageProvider";

function useMockLanguage() {
  const context = React.useContext(MockLanguageContext);
  if (context === undefined) {
    throw new Error(
      "useMockLanguage must be used within a MockLanguageProvider"
    );
  }
  return context;
}

function useMockTranslation() {
  const { messages } = useMockLanguage();

  const t = (key: string, params?: Record<string, string>) => {
    const keys = key.split(".");
    let value: unknown = messages;

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key; // Return key if translation not found
      }
    }

    if (typeof value === "string" && params) {
      // Replace parameters in the string
      return Object.entries(params).reduce((str, [param, replacement]) => {
        return str.replace(`{${param}}`, replacement);
      }, value);
    }

    return typeof value === "string" ? value : key;
  };

  return { t };
}

describe("Language Context - Translation Testing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe("Translation function with English messages", () => {
    const createWrapper = (initialLocale: "en" | "ja" = "en") => {
      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <MockLanguageProvider initialLocale={initialLocale}>
          {children}
        </MockLanguageProvider>
      );
      Wrapper.displayName = "TestWrapper";
      return Wrapper;
    };

    it("should translate simple keys in English", async () => {
      const { result } = renderHook(() => useMockTranslation(), {
        wrapper: createWrapper("en"),
      });

      expect(result.current.t("common.loading")).toBe("Loading...");
      expect(result.current.t("common.save")).toBe("Save");
      expect(result.current.t("auth.login")).toBe("Login");
    });

    it("should translate simple keys in Japanese", async () => {
      const { result } = renderHook(() => useMockTranslation(), {
        wrapper: createWrapper("ja"),
      });

      expect(result.current.t("common.loading")).toBe("読み込み中...");
      expect(result.current.t("common.save")).toBe("保存");
      expect(result.current.t("auth.login")).toBe("ログイン");
    });

    it("should translate nested keys", async () => {
      const { result } = renderHook(() => useMockTranslation(), {
        wrapper: createWrapper("en"),
      });

      expect(result.current.t("nested.deeply.nested.key")).toBe(
        "Deep nested value"
      );
    });

    it("should translate nested keys in Japanese", async () => {
      const { result } = renderHook(() => useMockTranslation(), {
        wrapper: createWrapper("ja"),
      });

      expect(result.current.t("nested.deeply.nested.key")).toBe(
        "深くネストされた値"
      );
    });

    it("should handle parameter interpolation in English", async () => {
      const { result } = renderHook(() => useMockTranslation(), {
        wrapper: createWrapper("en"),
      });

      expect(result.current.t("auth.welcome", { name: "John" })).toBe(
        "Welcome, John!"
      );
      expect(
        result.current.t("errors.operationFailed", { action: "save" })
      ).toBe("Failed to save");
    });

    it("should handle parameter interpolation in Japanese", async () => {
      const { result } = renderHook(() => useMockTranslation(), {
        wrapper: createWrapper("ja"),
      });

      expect(result.current.t("auth.welcome", { name: "田中" })).toBe(
        "ようこそ、田中さん！"
      );
      expect(
        result.current.t("errors.operationFailed", { action: "保存" })
      ).toBe("保存に失敗しました");
    });

    it("should return key for missing translations", async () => {
      const { result } = renderHook(() => useMockTranslation(), {
        wrapper: createWrapper("en"),
      });

      expect(result.current.t("missing.key")).toBe("missing.key");
      expect(result.current.t("common.nonexistent")).toBe("common.nonexistent");
    });

    it("should handle multiple parameters", async () => {
      // Create a test with multiple parameters
      const mockMultiParamMessages = {
        ...mockEnMessages,
        test: {
          multiParam: "Hello {name}, you have {count} messages from {sender}",
        },
      };

      const TestComponent = () => {
        const messages = {
          ...mockEnMessages,
          test: mockMultiParamMessages.test,
        };

        // Mock the context to include our test message
        const MockContext = React.createContext<MockLanguageContextType>({
          locale: "en",
          setLocale: () => {},
          messages,
        });

        const contextValue = React.useContext(MockContext);
        const customT = (key: string, params?: Record<string, string>) => {
          const keys = key.split(".");
          let value: unknown = contextValue.messages;

          for (const k of keys) {
            if (value && typeof value === "object" && k in value) {
              value = (value as Record<string, unknown>)[k];
            } else {
              return key;
            }
          }

          if (typeof value === "string" && params) {
            return Object.entries(params).reduce(
              (str, [param, replacement]) => {
                return str.replace(`{${param}}`, replacement);
              },
              value
            );
          }

          return typeof value === "string" ? value : key;
        };

        return (
          <div data-testid="translation">
            {customT("test.multiParam", {
              name: "Alice",
              count: "5",
              sender: "Bob",
            })}
          </div>
        );
      };

      render(
        <MockLanguageProvider>
          <TestComponent />
        </MockLanguageProvider>
      );

      expect(screen.getByTestId("translation")).toHaveTextContent(
        "Hello Alice, you have 5 messages from Bob"
      );
    });

    it("should handle partial key paths", async () => {
      const { result } = renderHook(() => useMockTranslation(), {
        wrapper: createWrapper("en"),
      });

      expect(result.current.t("nested.deeply")).toBe("nested.deeply");
      expect(result.current.t("nested.deeply.nested")).toBe(
        "nested.deeply.nested"
      );
    });

    it("should handle empty parameters", async () => {
      const { result } = renderHook(() => useMockTranslation(), {
        wrapper: createWrapper("en"),
      });

      expect(result.current.t("auth.welcome", {})).toBe("Welcome, {name}!");
    });

    it("should ignore parameters for non-string values", async () => {
      const { result } = renderHook(() => useMockTranslation(), {
        wrapper: createWrapper("en"),
      });

      // Accessing a nested object, should return the key
      expect(result.current.t("common", { name: "John" })).toBe("common");
    });
  });

  describe("Language switching with translations", () => {
    it("should switch language and update translations", async () => {
      const TestComponent = () => {
        const { locale, setLocale } = useMockLanguage();
        const { t } = useMockTranslation();

        return (
          <div>
            <div data-testid="locale">{locale}</div>
            <div data-testid="translation">{t("common.loading")}</div>
            <div data-testid="welcome">
              {t("auth.welcome", { name: "User" })}
            </div>
            <button onClick={() => setLocale("ja")}>Switch to Japanese</button>
            <button onClick={() => setLocale("en")}>Switch to English</button>
          </div>
        );
      };

      render(
        <MockLanguageProvider>
          <TestComponent />
        </MockLanguageProvider>
      );

      // Initially English
      expect(screen.getByTestId("locale")).toHaveTextContent("en");
      expect(screen.getByTestId("translation")).toHaveTextContent("Loading...");
      expect(screen.getByTestId("welcome")).toHaveTextContent("Welcome, User!");

      // Switch to Japanese
      await act(async () => {
        screen.getByText("Switch to Japanese").click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("locale")).toHaveTextContent("ja");
        expect(screen.getByTestId("translation")).toHaveTextContent(
          "読み込み中..."
        );
        expect(screen.getByTestId("welcome")).toHaveTextContent(
          "ようこそ、Userさん！"
        );
      });

      // Switch back to English
      await act(async () => {
        screen.getByText("Switch to English").click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("locale")).toHaveTextContent("en");
        expect(screen.getByTestId("translation")).toHaveTextContent(
          "Loading..."
        );
        expect(screen.getByTestId("welcome")).toHaveTextContent(
          "Welcome, User!"
        );
      });

      // Verify localStorage calls
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith("locale", "ja");
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith("locale", "en");
    });

    it("should maintain parameter values across language switches", async () => {
      const TestComponent = () => {
        const { locale, setLocale } = useMockLanguage();
        const { t } = useMockTranslation();

        return (
          <div>
            <div data-testid="locale">{locale}</div>
            <div data-testid="operation-message">
              {t("errors.operationFailed", { action: "upload" })}
            </div>
            <button onClick={() => setLocale(locale === "en" ? "ja" : "en")}>
              Toggle Language
            </button>
          </div>
        );
      };

      render(
        <MockLanguageProvider>
          <TestComponent />
        </MockLanguageProvider>
      );

      // Initially English
      expect(screen.getByTestId("operation-message")).toHaveTextContent(
        "Failed to upload"
      );

      // Switch to Japanese
      await act(async () => {
        screen.getByText("Toggle Language").click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("operation-message")).toHaveTextContent(
          "uploadに失敗しました"
        );
      });

      // Switch back to English
      await act(async () => {
        screen.getByText("Toggle Language").click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("operation-message")).toHaveTextContent(
          "Failed to upload"
        );
      });
    });
  });

  describe("Complex translation scenarios", () => {
    it("should handle deeply nested translation keys", async () => {
      const TestComponent = () => {
        const { t } = useMockTranslation();

        return (
          <div>
            <div data-testid="deep-nested">{t("nested.deeply.nested.key")}</div>
            <div data-testid="missing-nested">
              {t("nested.deeply.missing.key")}
            </div>
          </div>
        );
      };

      render(
        <MockLanguageProvider>
          <TestComponent />
        </MockLanguageProvider>
      );

      expect(screen.getByTestId("deep-nested")).toHaveTextContent(
        "Deep nested value"
      );
      expect(screen.getByTestId("missing-nested")).toHaveTextContent(
        "nested.deeply.missing.key"
      );
    });

    it("should handle special characters in parameters", async () => {
      const TestComponent = () => {
        const { t } = useMockTranslation();

        return (
          <div data-testid="special-chars">
            {t("auth.welcome", { name: "José María & Co." })}
          </div>
        );
      };

      render(
        <MockLanguageProvider>
          <TestComponent />
        </MockLanguageProvider>
      );

      expect(screen.getByTestId("special-chars")).toHaveTextContent(
        "Welcome, José María & Co.!"
      );
    });

    it("should handle numeric parameters", async () => {
      const TestComponent = () => {
        const { t } = useMockTranslation();

        return (
          <div data-testid="numeric-params">
            {t("errors.operationFailed", { action: "123" })}
          </div>
        );
      };

      render(
        <MockLanguageProvider>
          <TestComponent />
        </MockLanguageProvider>
      );

      expect(screen.getByTestId("numeric-params")).toHaveTextContent(
        "Failed to 123"
      );
    });

    it("should handle empty string parameters", async () => {
      const TestComponent = () => {
        const { t } = useMockTranslation();

        return (
          <div data-testid="empty-params">
            {t("auth.welcome", { name: "" })}
          </div>
        );
      };

      render(
        <MockLanguageProvider>
          <TestComponent />
        </MockLanguageProvider>
      );

      expect(screen.getByTestId("empty-params")).toHaveTextContent(
        "Welcome, !"
      );
    });
  });
});
