import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegisterForm } from "./register-form";
import { ok, err } from "neverthrow";

// Mock the auth context
const mockRegister = vi.fn();
const mockAuthContext = {
  user: null,
  isLoading: false,
  login: vi.fn(),
  register: mockRegister,
  logout: vi.fn(),
  isAuthenticated: false,
};

vi.mock("@/contexts/auth", () => ({
  useAuth: () => mockAuthContext,
}));

describe("RegisterForm", () => {
  const user = userEvent.setup();
  const mockOnSuccess = vi.fn();
  const mockOnSwitchToLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthContext.isLoading = false;
  });

  test("renders register form correctly", () => {
    render(
      <RegisterForm
        onSuccess={mockOnSuccess}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Register" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Register" })
    ).toBeInTheDocument();
    expect(screen.getByText("Login here")).toBeInTheDocument();
  });

  test("shows validation error for empty fields", async () => {
    render(<RegisterForm onSuccess={mockOnSuccess} />);

    // フォーム要素を直接取得してsubmitイベントを発火
    const form = document.querySelector("form");
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(screen.getByText("All fields are required")).toBeInTheDocument();
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  test("shows validation error for password mismatch", async () => {
    render(<RegisterForm onSuccess={mockOnSuccess} />);

    await user.type(screen.getByLabelText("Username"), "testuser");
    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "different");
    await user.click(screen.getByRole("button", { name: "Register" }));

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  test("shows validation error for short password", async () => {
    render(<RegisterForm onSuccess={mockOnSuccess} />);

    await user.type(screen.getByLabelText("Username"), "testuser");
    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "123");
    await user.type(screen.getByLabelText("Confirm Password"), "123");
    await user.click(screen.getByRole("button", { name: "Register" }));

    expect(
      screen.getByText("Password must be at least 6 characters long")
    ).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  test("calls register with correct data", async () => {
    const mockUser = {
      id: 1,
      username: "testuser",
      email: "test@example.com",
      is_active: true,
      is_approved: false,
    };
    mockRegister.mockResolvedValue(ok(mockUser));

    render(<RegisterForm onSuccess={mockOnSuccess} />);

    await user.type(screen.getByLabelText("Username"), "testuser");
    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Register" }));

    expect(mockRegister).toHaveBeenCalledWith({
      username: "testuser",
      email: "test@example.com",
      password: "password123",
    });
  });

  test("shows success message for approved user", async () => {
    const mockUser = {
      id: 1,
      username: "admin",
      email: "admin@example.com",
      is_active: true,
      is_approved: true,
    };
    mockRegister.mockResolvedValue(ok(mockUser));

    render(<RegisterForm onSuccess={mockOnSuccess} />);

    await user.type(screen.getByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText("Email"), "admin@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Register" }));

    await waitFor(() => {
      expect(
        screen.getByText("Registration successful! You can now log in.")
      ).toBeInTheDocument();
    });
  });

  test("shows pending approval message for unapproved user", async () => {
    const mockUser = {
      id: 2,
      username: "testuser",
      email: "test@example.com",
      is_active: true,
      is_approved: false,
    };
    mockRegister.mockResolvedValue(ok(mockUser));

    render(<RegisterForm onSuccess={mockOnSuccess} />);

    await user.type(screen.getByLabelText("Username"), "testuser");
    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Register" }));

    await waitFor(() => {
      expect(
        screen.getByText(/Your account is pending approval/)
      ).toBeInTheDocument();
    });
  });

  test("shows error message when registration fails", async () => {
    mockRegister.mockResolvedValue(
      err({ message: "Username already exists", status: 400 })
    );

    render(<RegisterForm onSuccess={mockOnSuccess} />);

    await user.type(screen.getByLabelText("Username"), "existinguser");
    await user.type(screen.getByLabelText("Email"), "existing@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Register" }));

    await waitFor(() => {
      expect(screen.getByText("Username already exists")).toBeInTheDocument();
    });
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  test("clears form after successful registration", async () => {
    const mockUser = {
      id: 1,
      username: "testuser",
      email: "test@example.com",
      is_active: true,
      is_approved: false,
    };
    mockRegister.mockResolvedValue(ok(mockUser));

    render(<RegisterForm onSuccess={mockOnSuccess} />);

    const usernameInput = screen.getByLabelText("Username");
    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const confirmPasswordInput = screen.getByLabelText("Confirm Password");

    await user.type(usernameInput, "testuser");
    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");
    await user.type(confirmPasswordInput, "password123");
    await user.click(screen.getByRole("button", { name: "Register" }));

    await waitFor(() => {
      expect(usernameInput).toHaveValue("");
      expect(emailInput).toHaveValue("");
      expect(passwordInput).toHaveValue("");
      expect(confirmPasswordInput).toHaveValue("");
    });
  });

  test("calls onSwitchToLogin when login link is clicked", async () => {
    render(
      <RegisterForm
        onSuccess={mockOnSuccess}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    );

    await user.click(screen.getByText("Login here"));

    expect(mockOnSwitchToLogin).toHaveBeenCalled();
  });

  test("shows loading state during registration", async () => {
    mockAuthContext.isLoading = true;

    render(<RegisterForm onSuccess={mockOnSuccess} />);

    expect(
      screen.getByRole("button", { name: "Registering..." })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Registering..." })
    ).toBeDisabled();
  });
});
