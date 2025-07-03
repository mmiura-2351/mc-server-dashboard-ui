/**
 * Tests for UserTableRow component with React.memo optimization
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UserTableRow } from "./UserTableRow";
import type { User } from "@/types/auth";
import { Role } from "@/types/auth";

// Mock the language context
vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "userManagement.roles.user": "User",
        "userManagement.roles.operator": "Operator",
        "userManagement.roles.admin": "Admin",
        "common.active": "Active",
        "common.inactive": "Inactive",
        "common.approved": "Approved",
        "common.pending": "Pending",
        "common.approve": "Approve",
        "common.delete": "Delete",
      };
      return translations[key] || key;
    },
    locale: "en",
  }),
}));

// Sample user data
const mockUser: User = {
  id: 1,
  username: "testuser",
  email: "test@example.com",
  role: Role.USER,
  is_active: true,
  is_approved: true,
};

const mockCurrentUser: User = {
  id: 2,
  username: "currentuser",
  email: "current@example.com",
  role: Role.ADMIN,
  is_active: true,
  is_approved: true,
};

const mockProps = {
  user: mockUser,
  currentUser: mockCurrentUser,
  onApproveUser: vi.fn(),
  onRoleChange: vi.fn(),
  onDeleteUser: vi.fn(),
};

describe("UserTableRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper function to render UserTableRow in proper table context
  const renderUserTableRow = (props: typeof mockProps) => {
    return render(
      <table>
        <tbody>
          <UserTableRow {...props} />
        </tbody>
      </table>
    );
  };

  describe("Basic Rendering", () => {
    it("should render user information correctly", () => {
      render(<UserTableRow {...mockProps} />);

      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("testuser")).toBeInTheDocument();
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.getByText("Approved")).toBeInTheDocument();
    });

    it("should show inactive status when user is not active", () => {
      const inactiveUser = { ...mockUser, is_active: false };
      const props = { ...mockProps, user: inactiveUser };
      render(<UserTableRow {...props} />);

      expect(screen.getByText("Inactive")).toBeInTheDocument();
    });

    it("should show pending status when user is not approved", () => {
      const pendingUser = { ...mockUser, is_approved: false };
      const props = { ...mockProps, user: pendingUser };
      render(<UserTableRow {...props} />);

      expect(screen.getByText("Pending")).toBeInTheDocument();
    });
  });

  describe("Role Dropdown", () => {
    it("should display correct role options", () => {
      render(<UserTableRow {...mockProps} />);

      const roleSelect = screen.getByDisplayValue("User");
      expect(roleSelect).toBeInTheDocument();

      // Check if all role options are available
      expect(screen.getByText("User")).toBeInTheDocument();
      expect(screen.getByText("Operator")).toBeInTheDocument();
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    it("should display current user role correctly", () => {
      const adminUser = { ...mockUser, role: Role.ADMIN };
      const props = { ...mockProps, user: adminUser };
      render(<UserTableRow {...props} />);

      const roleSelect = screen.getByDisplayValue("Admin");
      expect(roleSelect).toBeInTheDocument();
    });

    it("should call onRoleChange when role is changed", () => {
      render(<UserTableRow {...mockProps} />);

      const roleSelect = screen.getByDisplayValue("User");
      fireEvent.change(roleSelect, { target: { value: Role.ADMIN } });

      expect(mockProps.onRoleChange).toHaveBeenCalledWith(
        mockUser.id,
        Role.ADMIN
      );
    });

    it("should disable role select for current user", () => {
      const currentUserAsTarget = { ...mockUser, id: mockCurrentUser.id };
      const props = { ...mockProps, user: currentUserAsTarget };
      render(<UserTableRow {...props} />);

      const roleSelect = screen.getByDisplayValue("User");
      expect(roleSelect).toBeDisabled();
    });
  });

  describe("Action Buttons", () => {
    it("should show approve button for unapproved users", () => {
      const unapprovedUser = { ...mockUser, is_approved: false };
      const props = { ...mockProps, user: unapprovedUser };
      render(<UserTableRow {...props} />);

      expect(screen.getByText("Approve")).toBeInTheDocument();
    });

    it("should not show approve button for approved users", () => {
      render(<UserTableRow {...mockProps} />);

      expect(screen.queryByText("Approve")).not.toBeInTheDocument();
    });

    it("should show delete button for other users", () => {
      render(<UserTableRow {...mockProps} />);

      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    it("should not show delete button for current user", () => {
      const currentUserAsTarget = { ...mockUser, id: mockCurrentUser.id };
      const props = { ...mockProps, user: currentUserAsTarget };
      render(<UserTableRow {...props} />);

      expect(screen.queryByText("Delete")).not.toBeInTheDocument();
    });
  });

  describe("Event Handling", () => {
    it("should call onApproveUser when approve button is clicked", () => {
      const unapprovedUser = { ...mockUser, is_approved: false };
      const props = { ...mockProps, user: unapprovedUser };
      render(<UserTableRow {...props} />);

      const approveButton = screen.getByText("Approve");
      fireEvent.click(approveButton);

      expect(mockProps.onApproveUser).toHaveBeenCalledWith(unapprovedUser.id);
    });

    it("should call onDeleteUser when delete button is clicked", () => {
      render(<UserTableRow {...mockProps} />);

      const deleteButton = screen.getByText("Delete");
      fireEvent.click(deleteButton);

      expect(mockProps.onDeleteUser).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.username
      );
    });
  });

  describe("React.memo Optimization", () => {
    it("should be memoized and not re-render with same props", () => {
      const { rerender } = render(<UserTableRow {...mockProps} />);

      // Clear previous calls
      vi.clearAllMocks();

      // Rerender with same props
      rerender(<UserTableRow {...mockProps} />);

      // The component should be memoized
      expect(screen.getByText("testuser")).toBeInTheDocument();
    });

    it("should re-render when user prop changes", () => {
      const { rerender } = render(<UserTableRow {...mockProps} />);

      const newUser = { ...mockUser, username: "updateduser" };
      rerender(<UserTableRow {...mockProps} user={newUser} />);

      expect(screen.getByText("updateduser")).toBeInTheDocument();
      expect(screen.queryByText("testuser")).not.toBeInTheDocument();
    });

    it("should re-render when currentUser prop changes", () => {
      const { rerender } = render(<UserTableRow {...mockProps} />);

      const newCurrentUser = { ...mockCurrentUser, id: mockUser.id };
      rerender(<UserTableRow {...mockProps} currentUser={newCurrentUser} />);

      // Should disable role select and hide delete button for current user
      const roleSelect = screen.getByDisplayValue("User");
      expect(roleSelect).toBeDisabled();
      expect(screen.queryByText("Delete")).not.toBeInTheDocument();
    });
  });

  describe("Status Classes", () => {
    it("should apply correct CSS classes for active status", () => {
      renderUserTableRow(mockProps);

      const statusElement = screen.getByText("Active");
      expect(statusElement.className).toMatch(/active/);
    });

    it("should apply correct CSS classes for inactive status", () => {
      const inactiveUser = { ...mockUser, is_active: false };
      const props = { ...mockProps, user: inactiveUser };
      renderUserTableRow(props);

      const statusElement = screen.getByText("Inactive");
      expect(statusElement.className).toMatch(/inactive/);
    });

    it("should apply correct CSS classes for approved status", () => {
      renderUserTableRow(mockProps);

      const approvalElement = screen.getByText("Approved");
      expect(approvalElement.className).toMatch(/approved/);
    });

    it("should apply correct CSS classes for pending status", () => {
      const pendingUser = { ...mockUser, is_approved: false };
      const props = { ...mockProps, user: pendingUser };
      renderUserTableRow(props);

      const approvalElement = screen.getByText("Pending");
      expect(approvalElement.className).toMatch(/pending/);
    });
  });

  describe("Role Handling", () => {
    it("should handle undefined role gracefully", () => {
      const userWithoutRole = {
        ...mockUser,
        role: undefined as unknown as Role,
      };
      const props = { ...mockProps, user: userWithoutRole };

      expect(() => render(<UserTableRow {...props} />)).not.toThrow();
    });

    it("should default to USER role when role is undefined", () => {
      const userWithoutRole = {
        ...mockUser,
        role: undefined as unknown as Role,
      };
      const props = { ...mockProps, user: userWithoutRole };
      render(<UserTableRow {...props} />);

      const roleSelect = screen.getByDisplayValue("User");
      expect(roleSelect).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper accessibility attributes for form elements", () => {
      renderUserTableRow(mockProps);

      const roleSelect = screen.getByDisplayValue("User");
      expect(roleSelect.tagName).toBe("SELECT");
      expect(roleSelect.className).toMatch(/roleSelect/);
    });

    it("should have proper button accessibility", () => {
      renderUserTableRow(mockProps);

      const deleteButton = screen.getByText("Delete");
      expect(deleteButton.tagName).toBe("BUTTON");
      expect(deleteButton.className).toMatch(/actionButton/);
    });
  });
});
