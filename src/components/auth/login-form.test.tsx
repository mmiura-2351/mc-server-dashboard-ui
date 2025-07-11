import { describe, test, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./login-form";
import "@/contexts/auth";
import { ok, err } from "neverthrow";

// Mock the auth context
const mockLogin = vi.fn();
const mockAuthContext = {
  user: null,
  isLoading: false,
  login: mockLogin,
  register: vi.fn(),
  logout: vi.fn(),
  isAuthenticated: false,
};

vi.mock("@/contexts/auth", () => ({
  useAuth: () => mockAuthContext,
}));

// Mock the language context
const translations: Record<string, string> = {
  "auth.login": "Login",
  "auth.username": "Username",
  "auth.password": "Password",
  "auth.loggingIn": "Logging in...",
  "auth.dontHaveAccount": "Don't have an account?",
  "auth.registerHere": "Register here",
  "auth.usernameTooltip":
    "Username must contain only letters, numbers, underscores, and hyphens",
  "auth.errors.usernameRequired":
    "Username is required and must contain only valid characters",
  "auth.errors.passwordRequired": "Password is required",
  "auth.errors.usernameMinLength":
    "Username must be at least 3 characters long",
  "auth.errors.passwordMinLength":
    "Password must be at least 6 characters long",
  "auth.errors.pendingApproval":
    "Your account is pending approval. Please wait for an administrator to approve your account before you can log in.",
  "auth.errors.invalidCredentials": "Invalid username or password",
  "auth.errors.tooManyAttempts":
    "Too many login attempts. Please try again later.",
  "auth.errors.loginFailed": "Login failed. Please try again.",
  "errors.invalidCredentials": "Invalid username or password",
  "errors.pendingApproval": "Your account is pending approval",
  "errors.generic": "An error occurred",
};

const mockT = vi.fn((key: string) => translations[key] || key);

vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({ t: mockT }),
  useLanguage: () => ({ locale: "en", setLocale: vi.fn() }),
}));

// Mock the LanguageSwitcher component
vi.mock("@/components/language/language-switcher", () => ({
  LanguageSwitcher: () => (
    <div data-testid="language-switcher">Language Switcher</div>
  ),
}));

describe("LoginForm", () => {
  const user = userEvent.setup();
  const mockOnSuccess = vi.fn();
  const mockOnSwitchToRegister = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthContext.isLoading = false;
  });

  test("renders login form correctly", () => {
    render(
      <LoginForm
        onSuccess={mockOnSuccess}
        onSwitchToRegister={mockOnSwitchToRegister}
      />
    );

    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByText("Register here")).toBeInTheDocument();
    expect(screen.getByTestId("language-switcher")).toBeInTheDocument();
  });

  test("shows validation error for empty fields", async () => {
    render(<LoginForm onSuccess={mockOnSuccess} />);

    // フォーム要素を直接取得してsubmitイベントを発火
    const form = document.querySelector("form");
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(
        screen.getByText(
          "Username is required and must contain only valid characters"
        )
      ).toBeInTheDocument();
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  test("calls login with correct credentials", async () => {
    mockLogin.mockResolvedValue(ok(undefined));

    render(<LoginForm onSuccess={mockOnSuccess} />);

    await user.type(screen.getByLabelText("Username"), "testuser");
    await user.type(screen.getByLabelText("Password"), "testpass");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(mockLogin).toHaveBeenCalledWith({
      username: "testuser",
      password: "testpass",
    });
  });

  test("calls onSuccess when login succeeds", async () => {
    mockLogin.mockResolvedValue(ok(undefined));

    render(<LoginForm onSuccess={mockOnSuccess} />);

    await user.type(screen.getByLabelText("Username"), "testuser");
    await user.type(screen.getByLabelText("Password"), "testpass");
    await user.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  test("shows error message when login fails", async () => {
    mockLogin.mockResolvedValue(
      err({ message: "Invalid credentials", status: 401 })
    );

    render(<LoginForm onSuccess={mockOnSuccess} />);

    await user.type(screen.getByLabelText("Username"), "wronguser");
    await user.type(screen.getByLabelText("Password"), "wrongpass");
    await user.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(
        screen.getByText("Invalid username or password")
      ).toBeInTheDocument();
    });
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  test("shows special message for pending approval error", async () => {
    mockLogin.mockResolvedValue(
      err({
        message:
          "Account pending approval. Please wait for an administrator to approve your account.",
        status: 403,
      })
    );

    render(<LoginForm onSuccess={mockOnSuccess} />);

    await user.type(screen.getByLabelText("Username"), "unapproved");
    await user.type(screen.getByLabelText("Password"), "password");
    await user.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(
        screen.getByText(/Your account is pending approval/)
      ).toBeInTheDocument();
    });
  });

  test("shows loading state during login", async () => {
    // Mock login to return a promise that we can control
    let resolveLogin: (value: unknown) => void;
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });
    mockLogin.mockReturnValue(loginPromise);

    render(<LoginForm onSuccess={mockOnSuccess} />);

    // Fill in the form
    await user.type(screen.getByLabelText("Username"), "testuser");
    await user.type(screen.getByLabelText("Password"), "testpass");

    // Submit the form to trigger loading state
    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Login" }));
    });

    // Check loading state
    expect(
      screen.getByRole("button", { name: "Logging in..." })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Logging in..." })
    ).toBeDisabled();

    // Resolve the login promise to clean up
    await act(async () => {
      resolveLogin!(ok(undefined));
    });
  });

  test("calls onSwitchToRegister when register link is clicked", async () => {
    render(
      <LoginForm
        onSuccess={mockOnSuccess}
        onSwitchToRegister={mockOnSwitchToRegister}
      />
    );

    await user.click(screen.getByText("Register here"));

    expect(mockOnSwitchToRegister).toHaveBeenCalled();
  });

  test("disables form when loading", async () => {
    // Mock login to return a promise that we can control
    let resolveLogin: (value: unknown) => void;
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });
    mockLogin.mockReturnValue(loginPromise);

    render(
      <LoginForm
        onSuccess={mockOnSuccess}
        onSwitchToRegister={mockOnSwitchToRegister}
      />
    );

    // Fill in the form
    await user.type(screen.getByLabelText("Username"), "testuser");
    await user.type(screen.getByLabelText("Password"), "testpass");

    // Submit the form to trigger loading state
    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Login" }));
    });

    // Check that form elements are disabled during loading
    expect(screen.getByLabelText("Username")).toBeDisabled();
    expect(screen.getByLabelText("Password")).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Logging in..." })
    ).toBeDisabled();
    expect(screen.getByText("Register here")).toBeDisabled();

    // Resolve the login promise to clean up
    await act(async () => {
      resolveLogin!(ok(undefined));
    });
  });
});
