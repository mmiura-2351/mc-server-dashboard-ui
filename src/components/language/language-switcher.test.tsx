import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, beforeEach, afterEach, expect, vi } from "vitest";
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

  afterEach(() => {
    // Wait for any pending promises to resolve
    return new Promise((resolve) => setTimeout(resolve, 0));
  });

  test("renders language switcher with default English", async () => {
    render(
      <TestWrapper>
        <LanguageSwitcher />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Language")).toBeInTheDocument();
      expect(screen.getByText("English")).toBeInTheDocument();
      expect(screen.getByText("日本語")).toBeInTheDocument();
    });
  });

  test("switches to Japanese when Japanese button is clicked", async () => {
    render(
      <TestWrapper>
        <LanguageSwitcher />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("日本語")).toBeInTheDocument();
    });

    const japaneseButton = screen.getByText("日本語");
    fireEvent.click(japaneseButton);

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith("locale", "ja");
  });

  test("switches to English when English button is clicked", async () => {
    render(
      <TestWrapper>
        <LanguageSwitcher />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("English")).toBeInTheDocument();
    });

    const englishButton = screen.getByText("English");
    fireEvent.click(englishButton);

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith("locale", "en");
  });

  test("language buttons have type='button' to prevent form submission", async () => {
    render(
      <TestWrapper>
        <LanguageSwitcher />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("English")).toBeInTheDocument();
      expect(screen.getByText("日本語")).toBeInTheDocument();
    });

    const englishButton = screen.getByText("English");
    const japaneseButton = screen.getByText("日本語");

    expect(englishButton).toHaveAttribute("type", "button");
    expect(japaneseButton).toHaveAttribute("type", "button");
  });

  test("language change does not submit form", async () => {
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

    await waitFor(() => {
      expect(screen.getByText("日本語")).toBeInTheDocument();
    });

    const japaneseButton = screen.getByText("日本語");
    fireEvent.click(japaneseButton);

    // Form should not be submitted when language button is clicked
    expect(mockSubmit).not.toHaveBeenCalled();

    // But language should be changed
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith("locale", "ja");
  });
});
