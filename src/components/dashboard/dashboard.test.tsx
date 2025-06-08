import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dashboard } from "./dashboard";

// Mock functions
const mockLogout = vi.fn();
const mockPush = vi.fn();

// Create mock auth context
let mockAuthContext: any = {
  user: {
    id: 1,
    username: "testuser",
    email: "test@example.com",
    is_active: true,
    is_approved: true,
  },
  logout: mockLogout,
};

// Mock modules
vi.mock("@/contexts/auth", () => ({
  useAuth: () => mockAuthContext,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("Dashboard", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to approved user
    mockAuthContext = {
      user: {
        id: 1,
        username: "testuser",
        email: "test@example.com",
        is_active: true,
        is_approved: true,
      },
      logout: mockLogout,
    };
  });

  test("renders dashboard for approved user", () => {
    render(<Dashboard />);

    expect(screen.getByText("MC Server Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Welcome, testuser")).toBeInTheDocument();
    expect(screen.getByText("Account Status")).toBeInTheDocument();
    expect(screen.getByText("testuser")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();

    // より具体的なセレクターを使用
    const yesElements = screen.getAllByText("Yes");
    expect(yesElements).toHaveLength(2); // is_active と is_approved の両方
  });

  test("calls logout and redirects when logout button is clicked", async () => {
    render(<Dashboard />);

    const logoutButton = screen.getByRole("button", { name: "Logout" });
    await user.click(logoutButton);

    expect(mockLogout).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  test("does not show pending notice for approved user", () => {
    render(<Dashboard />);

    expect(
      screen.queryByText("Account Pending Approval")
    ).not.toBeInTheDocument();
  });

  test("shows pending approval notice for unapproved user", () => {
    // Change mock to unapproved user
    mockAuthContext.user = {
      id: 2,
      username: "unapproveduser",
      email: "unapproved@example.com",
      is_active: true,
      is_approved: false,
    };

    render(<Dashboard />);

    expect(screen.getByText("Account Pending Approval")).toBeInTheDocument();
    expect(
      screen.getByText(/Your account is currently pending approval/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/contact your system administrator/)
    ).toBeInTheDocument();
  });

  test("renders nothing when no user", () => {
    // Change mock to no user
    mockAuthContext.user = null;

    const { container } = render(<Dashboard />);

    expect(container.firstChild).toBeNull();
  });
});
