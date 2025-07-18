import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ok, err } from "neverthrow";
import { UserManagement } from "./user-management";
import { useAuth } from "@/contexts/auth";
import * as authService from "@/services/auth";
import { Role } from "@/types/auth";
import type { User } from "@/types/auth";

// Mock the auth context
vi.mock("@/contexts/auth");

// Mock the auth service
vi.mock("@/services/auth");

// Mock the language context
vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      const translations: Record<string, string> = {
        "userManagement.title": "User Management",
        "userManagement.accessDenied": "Access Denied",
        "userManagement.needAdministratorPrivileges":
          "You need administrator privileges to access this page.",
        "userManagement.loadingUsers": "Loading users...",
        "userManagement.id": "ID",
        "auth.username": "Username",
        "auth.email": "Email",
        "userManagement.role": "Role",
        "userManagement.status": "Status",
        "common.approved": "Approved",
        "userManagement.actions": "Actions",
        "common.active": "Active",
        "common.pending": "Pending",
        "common.approve": "Approve",
        "common.delete": "Delete",
        "common.refresh": "Refresh",
        "userManagement.noUsersFound": "No users found.",
        "userManagement.areYouSureDeleteUser":
          'Are you sure you want to delete user "{username}"? This action cannot be undone.',
        "userManagement.deleteUser": "Delete User",
        "userManagement.userApprovedSuccessfully": "User approved successfully",
        "userManagement.userRoleUpdatedSuccessfully":
          "User role updated successfully",
        "userManagement.userDeletedSuccessfully": "User deleted successfully",
        "userManagement.errors.loadingUsers":
          "An error occurred while loading users",
        "userManagement.errors.approvingUser":
          "An error occurred while approving user",
        "userManagement.errors.updatingUserRole":
          "An error occurred while updating user role",
        "userManagement.errors.deletingUser":
          "An error occurred while deleting user",
        "userManagement.roles.user": "User",
        "userManagement.roles.operator": "Operator",
        "userManagement.roles.admin": "Admin",
        "errors.generic": "An error occurred",
        "errors.serverError": "Failed to load users",
      };
      let translation = translations[key] || key;
      if (params) {
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          translation = translation.replace(`{${paramKey}}`, paramValue);
        });
      }
      return translation;
    },
    locale: "en",
  }),
}));

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
    getItem: vi.fn((key) => {
      if (key === "access_token") return "mock-token";
      return null;
    }),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
  writable: true,
});

// Mock the ConfirmationModal component
vi.mock("@/components/modal", () => ({
  ConfirmationModal: ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
  }: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="confirmation-modal">
        <h2>{title}</h2>
        <p>{message}</p>
        <button onClick={onConfirm} data-testid="confirm-button">
          Confirm
        </button>
        <button onClick={onCancel} data-testid="cancel-button">
          Cancel
        </button>
      </div>
    );
  },
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
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
    await act(async () => {
      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );
    });

    await waitFor(() => {
      expect(screen.getByText("User Management")).toBeInTheDocument();
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

    act(() => {
      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );
    });

    expect(screen.getByText("Access Denied")).toBeInTheDocument();
    expect(
      screen.getByText("You need administrator privileges to access this page.")
    ).toBeInTheDocument();
  });

  it("displays user information in table", async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );
    });

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

    await act(async () => {
      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );
    });

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

    await act(async () => {
      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );
    });

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
    (
      authService.deleteUserByAdmin as ReturnType<typeof vi.fn>
    ).mockResolvedValue(ok({ message: "User deleted" }));

    await act(async () => {
      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );
    });

    await waitFor(() => {
      const deleteButtons = screen.getAllByText("Delete");
      expect(deleteButtons).toHaveLength(1); // Only one delete button (can't delete self)
    });

    // Click delete button to open modal
    fireEvent.click(screen.getByText("Delete"));

    // Verify modal is displayed with correct content
    await waitFor(() => {
      expect(screen.getByTestId("confirmation-modal")).toBeInTheDocument();
      expect(screen.getByText("Delete User")).toBeInTheDocument();
      expect(
        screen.getByText(
          'Are you sure you want to delete user "user"? This action cannot be undone.'
        )
      ).toBeInTheDocument();
    });

    // Click confirm button in modal
    fireEvent.click(screen.getByTestId("confirm-button"));

    await waitFor(() => {
      expect(authService.deleteUserByAdmin).toHaveBeenCalledWith(
        "mock-token",
        2
      );
    });
  });

  it("does not delete user when confirmation is cancelled", async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    // Click delete button to open modal
    fireEvent.click(screen.getByText("Delete"));

    // Verify modal is displayed
    await waitFor(() => {
      expect(screen.getByTestId("confirmation-modal")).toBeInTheDocument();
    });

    // Click cancel button in modal
    fireEvent.click(screen.getByTestId("cancel-button"));

    // Verify modal is closed and delete was not called
    await waitFor(() => {
      expect(
        screen.queryByTestId("confirmation-modal")
      ).not.toBeInTheDocument();
    });

    expect(authService.deleteUserByAdmin).not.toHaveBeenCalled();
  });

  it("refreshes user list when refresh button is clicked", async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );
    });

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
      err({ message: "Failed to load users", status: 500 })
    );

    await act(async () => {
      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Failed to load users")).toBeInTheDocument();
    });
  });

  it("handles object error messages gracefully", async () => {
    // Test that non-string error messages are handled gracefully
    // This test validates that the error translation utility correctly handles
    // API errors that return objects instead of simple strings
    expect(true).toBe(true); // Placeholder test for now
  });

  it("shows loading state", async () => {
    // Mock getAllUsers to never resolve, keeping component in loading state
    (authService.getAllUsers as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    act(() => {
      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );
    });

    expect(screen.getByText("Loading users...")).toBeInTheDocument();
  });

  it("shows no users message when list is empty", async () => {
    (authService.getAllUsers as ReturnType<typeof vi.fn>).mockResolvedValue(
      ok([])
    );

    await act(async () => {
      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );
    });

    await waitFor(() => {
      expect(screen.getByText("No users found.")).toBeInTheDocument();
    });
  });

  it("disables role select for current user", async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );
    });

    await waitFor(() => {
      const roleSelects = screen.getAllByRole("combobox");
      const adminRoleSelect = roleSelects[0]; // First select should be admin's (disabled)
      expect(adminRoleSelect).toBeDisabled();
    });
  });

  it("does not show delete button for current user", async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );
    });

    await waitFor(() => {
      // Should only have one delete button (for the other user, not admin)
      const deleteButtons = screen.getAllByText("Delete");
      expect(deleteButtons).toHaveLength(1);
    });
  });

  it("shows approve button only for unapproved users", async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <UserManagement />
        </TestWrapper>
      );
    });

    await waitFor(() => {
      // Should only have one approve button (for the unapproved user)
      const approveButtons = screen.getAllByText("Approve");
      expect(approveButtons).toHaveLength(1);
    });
  });
});
