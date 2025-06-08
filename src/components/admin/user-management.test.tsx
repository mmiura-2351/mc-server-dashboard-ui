import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ok, err } from "neverthrow";
import { UserManagement } from "./user-management";
import { useAuth } from "@/contexts/auth";
import { LanguageProvider } from "@/contexts/language";
import * as authService from "@/services/auth";
import { Role } from "@/types/auth";
import type { User } from "@/types/auth";

// Mock the auth context
vi.mock("@/contexts/auth");

// Mock the auth service
vi.mock("@/services/auth");

const mockAdminUser: User = {
  id: 1,
  username: "admin",
  email: "admin@example.com",
  is_active: true,
  is_approved: true,
  role: Role.ADMIN,
};

const mockRegularUser: User = {
  id: 2,
  username: "user",
  email: "user@example.com",
  is_active: true,
  is_approved: false,
  role: Role.USER,
};

const mockUsers: User[] = [mockAdminUser, mockRegularUser];

const mockAuthContext = {
  user: mockAdminUser,
  updateUserInfo: vi.fn(),
  updatePassword: vi.fn(),
  deleteAccount: vi.fn(),
  isLoading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  isAuthenticated: true,
  refreshUser: vi.fn(),
};

// Mock localStorage
Object.defineProperty(window, "localStorage", {
  value: {
    getItem: vi.fn(() => "mock-token"),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
  writable: true,
});

// Mock window.confirm
Object.defineProperty(window, "confirm", {
  value: vi.fn(),
  writable: true,
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <LanguageProvider>{children}</LanguageProvider>
);

describe("UserManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(mockAuthContext);
    (authService.getAllUsers as ReturnType<typeof vi.fn>).mockResolvedValue(
      ok(mockUsers)
    );
  });

  it("renders user management for admin users", async () => {
    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("userManagement.title")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("admin")).toBeInTheDocument();
      expect(screen.getByText("user")).toBeInTheDocument();
    });
  });

  it("shows access denied for non-admin users", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockAuthContext,
      user: { ...mockAdminUser, role: Role.USER },
    });

    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );

    expect(screen.getByText("userManagement.accessDenied")).toBeInTheDocument();
    expect(
      screen.getByText("userManagement.needAdministratorPrivileges")
    ).toBeInTheDocument();
  });

  it("displays user information in table", async () => {
    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("admin")).toBeInTheDocument();
      expect(screen.getByText("admin@example.com")).toBeInTheDocument();
      expect(screen.getByText("user")).toBeInTheDocument();
      expect(screen.getByText("user@example.com")).toBeInTheDocument();
    });

    // Check status badges
    expect(screen.getAllByText("Active")).toHaveLength(2);

    // Use more specific selectors to avoid header/content conflicts
    const approvedSpans = screen.getAllByText("Approved");
    const pendingSpans = screen.getAllByText("Pending");
    expect(approvedSpans.length).toBeGreaterThanOrEqual(1);
    expect(pendingSpans.length).toBeGreaterThanOrEqual(1);
  });

  it("approves user successfully", async () => {
    (authService.approveUser as ReturnType<typeof vi.fn>).mockResolvedValue(
      ok(mockRegularUser)
    );

    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Approve")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Approve"));

    await waitFor(() => {
      expect(authService.approveUser).toHaveBeenCalledWith("mock-token", 2);
    });
  });

  it("changes user role successfully", async () => {
    (authService.updateUserRole as ReturnType<typeof vi.fn>).mockResolvedValue(
      ok(mockRegularUser)
    );

    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );

    await waitFor(() => {
      const roleSelects = screen.getAllByRole("combobox");
      expect(roleSelects).toHaveLength(2);
    });

    const roleSelects = screen.getAllByRole("combobox");
    const userRoleSelect = roleSelects.find(
      (select) => !(select as HTMLSelectElement).disabled
    );
    expect(userRoleSelect).toBeDefined();

    fireEvent.change(userRoleSelect!, { target: { value: "admin" } });

    await waitFor(() => {
      expect(authService.updateUserRole).toHaveBeenCalledWith("mock-token", 2, {
        role: "admin",
      });
    });
  });

  it("deletes user successfully after confirmation", async () => {
    (window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (
      authService.deleteUserByAdmin as ReturnType<typeof vi.fn>
    ).mockResolvedValue(ok({ message: "User deleted" }));

    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );

    await waitFor(() => {
      const deleteButtons = screen.getAllByText("Delete");
      expect(deleteButtons).toHaveLength(1); // Only one delete button (can't delete self)
    });

    fireEvent.click(screen.getByText("Delete"));

    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete user "user"? This action cannot be undone.'
    );

    await waitFor(() => {
      expect(authService.deleteUserByAdmin).toHaveBeenCalledWith(
        "mock-token",
        2
      );
    });
  });

  it("does not delete user when confirmation is cancelled", async () => {
    (window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(false);

    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Delete"));

    expect(window.confirm).toHaveBeenCalled();
    expect(authService.deleteUserByAdmin).not.toHaveBeenCalled();
  });

  it("refreshes user list when refresh button is clicked", async () => {
    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Refresh")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Refresh"));

    // getAllUsers should be called twice: once on mount, once on refresh
    await waitFor(() => {
      expect(authService.getAllUsers).toHaveBeenCalledTimes(2);
    });
  });

  it("shows error message when API call fails", async () => {
    (authService.getAllUsers as ReturnType<typeof vi.fn>).mockResolvedValue(
      err({ message: "Failed to load users" })
    );

    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Failed to load users")).toBeInTheDocument();
    });
  });

  it("handles object error messages gracefully", async () => {
    // Mock an error that returns an object instead of a string
    (authService.updateUserRole as ReturnType<typeof vi.fn>).mockResolvedValue(
      err({
        message: {
          type: "validation_error",
          loc: ["role"],
          msg: "Invalid role",
          input: "invalid",
        },
      })
    );

    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );

    await waitFor(() => {
      const roleSelects = screen.getAllByRole("combobox");
      expect(roleSelects).toHaveLength(2);
    });

    const roleSelects = screen.getAllByRole("combobox");
    const userRoleSelect = roleSelects.find(
      (select) => !(select as HTMLSelectElement).disabled
    );

    fireEvent.change(userRoleSelect!, { target: { value: "invalid" } });

    await waitFor(() => {
      expect(
        screen.getByText("An error occurred while updating user role")
      ).toBeInTheDocument();
    });
  });

  it("shows loading state", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockAuthContext,
      isLoading: true,
    });

    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );

    expect(screen.getByText("userManagement.loadingUsers")).toBeInTheDocument();
  });

  it("shows no users message when list is empty", async () => {
    (authService.getAllUsers as ReturnType<typeof vi.fn>).mockResolvedValue(
      ok([])
    );

    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("No users found.")).toBeInTheDocument();
    });
  });

  it("disables role select for current user", async () => {
    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );

    await waitFor(() => {
      const roleSelects = screen.getAllByRole("combobox");
      const adminRoleSelect = roleSelects[0]; // First select should be admin's (disabled)
      expect(adminRoleSelect).toBeDisabled();
    });
  });

  it("does not show delete button for current user", async () => {
    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );

    await waitFor(() => {
      // Should only have one delete button (for the other user, not admin)
      const deleteButtons = screen.getAllByText("Delete");
      expect(deleteButtons).toHaveLength(1);
    });
  });

  it("shows approve button only for unapproved users", async () => {
    render(
      <TestWrapper>
        <UserManagement />
      </TestWrapper>
    );

    await waitFor(() => {
      // Should only have one approve button (for the unapproved user)
      const approveButtons = screen.getAllByText("Approve");
      expect(approveButtons).toHaveLength(1);
    });
  });
});
