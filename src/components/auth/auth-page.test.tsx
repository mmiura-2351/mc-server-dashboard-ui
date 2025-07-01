import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthPage } from "./auth-page";

// Mock the translation function
const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    "auth.appTitle": "MC Server Dashboard",
    "auth.signInSubtitle": "Sign in to your account",
    "auth.createAccountSubtitle": "Create a new account",
  };
  return translations[key] || key;
});

vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({ t: mockT, locale: "en" }),
  useLanguage: () => ({ locale: "en", setLocale: vi.fn() }),
}));

// Mock auth context
vi.mock("@/contexts/auth", () => ({
  useAuth: () => ({
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    updateUserInfo: vi.fn(),
    updatePassword: vi.fn(),
    deleteAccount: vi.fn(),
    isLoading: false,
    isAuthenticated: false,
  }),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
  }),
}));

describe("AuthPage Translation", () => {
  it("uses translations for app title and subtitles", () => {
    render(<AuthPage initialMode="login" />);

    // Check that translated strings are used instead of hardcoded ones
    expect(screen.getByText("MC Server Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Sign in to your account")).toBeInTheDocument();

    // Verify translation function was called with correct keys
    expect(mockT).toHaveBeenCalledWith("auth.appTitle");
    expect(mockT).toHaveBeenCalledWith("auth.signInSubtitle");
  });

  it("uses create account subtitle in register mode", () => {
    render(<AuthPage initialMode="register" />);

    expect(screen.getByText("Create a new account")).toBeInTheDocument();
    expect(mockT).toHaveBeenCalledWith("auth.createAccountSubtitle");
  });
});
