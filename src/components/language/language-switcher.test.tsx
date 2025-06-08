import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, beforeEach, expect, vi } from "vitest";
import { LanguageProvider } from "@/contexts/language";
import { LanguageSwitcher } from "./language-switcher";

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

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <LanguageProvider>{children}</LanguageProvider>
);

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
  });

  test("renders language switcher with default English", () => {
    render(
      <TestWrapper>
        <LanguageSwitcher />
      </TestWrapper>
    );

    expect(screen.getByText("language.switchLanguage")).toBeInTheDocument();
    expect(screen.getByText("language.english")).toBeInTheDocument();
    expect(screen.getByText("language.japanese")).toBeInTheDocument();
  });

  test("switches to Japanese when Japanese button is clicked", () => {
    render(
      <TestWrapper>
        <LanguageSwitcher />
      </TestWrapper>
    );

    const japaneseButton = screen.getByText("language.japanese");
    fireEvent.click(japaneseButton);

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith("locale", "ja");
  });

  test("switches to English when English button is clicked", () => {
    render(
      <TestWrapper>
        <LanguageSwitcher />
      </TestWrapper>
    );

    const englishButton = screen.getByText("language.english");
    fireEvent.click(englishButton);

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith("locale", "en");
  });
});
