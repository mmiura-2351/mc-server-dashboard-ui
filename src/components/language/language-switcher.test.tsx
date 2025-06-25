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

  test("language buttons have type='button' to prevent form submission", () => {
    render(
      <TestWrapper>
        <LanguageSwitcher />
      </TestWrapper>
    );

    const englishButton = screen.getByText("language.english");
    const japaneseButton = screen.getByText("language.japanese");

    expect(englishButton).toHaveAttribute("type", "button");
    expect(japaneseButton).toHaveAttribute("type", "button");
  });

  test("language change does not submit form", () => {
    const mockSubmit = vi.fn();

    render(
      <TestWrapper>
        <form onSubmit={mockSubmit}>
          <LanguageSwitcher />
          <input type="text" name="test" defaultValue="test" />
          <button type="submit">Submit</button>
        </form>
      </TestWrapper>
    );

    const japaneseButton = screen.getByText("language.japanese");
    fireEvent.click(japaneseButton);

    // Form should not be submitted when language button is clicked
    expect(mockSubmit).not.toHaveBeenCalled();

    // But language should be changed
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith("locale", "ja");
  });
});
