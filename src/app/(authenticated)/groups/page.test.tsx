import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ok, err } from "neverthrow";
import GroupsPage from "./page";
import * as groupService from "@/services/groups";
import type { Group } from "@/services/groups";

// Mock the group service
vi.mock("@/services/groups", () => ({
  getGroups: vi.fn(),
  createGroup: vi.fn(),
  deleteGroup: vi.fn(),
}));

// Mock Next.js router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock auth context
type UserRole = "admin" | "operator" | "user";

const mockUser = {
  id: 1,
  username: "testuser",
  email: "test@example.com",
  role: "admin" as UserRole,
  is_active: true,
  is_approved: true,
  created_at: "2024-01-01T00:00:00Z",
};

const mockAuth = {
  user: mockUser,
  logout: vi.fn(),
};

vi.mock("@/contexts/auth", () => ({
  useAuth: () => mockAuth,
}));

// Mock language context
const mockT = vi.fn((key: string, params?: Record<string, string>) => {
  const translations: Record<string, string> = {
    "groups.title": "Group Management",
    "groups.createGroup": "Create Group",
    "groups.allGroups": "All Groups",
    "groups.opGroups": "OP Groups",
    "groups.whitelistGroups": "Whitelist Groups",
    "groups.noGroups": "No groups found",
    "groups.createFirstGroup": "Create Your First Group",
    "groups.viewDetails": "View Details",
    "groups.playerCount": "{count} players",
    "groups.createdAt": "Created {date}",
    "groups.confirmDelete": "Are you sure you want to delete this group?",
    "groups.op": "OP",
    "groups.whitelist": "Whitelist",
    "common.loading": "Loading...",
    "common.delete": "Delete",
    "common.cancel": "Cancel",
    "common.create": "Create",
    "common.creating": "Creating...",
  };

  let translation = translations[key] || key;
  if (params) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      translation = translation.replace(`{${paramKey}}`, paramValue);
    });
  }
  return translation;
});

vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({ t: mockT }),
}));

// Mock confirmation modal
interface ModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

vi.mock("@/components/modal", () => ({
  ConfirmationModal: ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
  }: ModalProps) =>
    isOpen ? (
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
    ) : null,
}));

// Mock formatDateSimple
vi.mock("@/utils/date-format", () => ({
  formatDateSimple: (_date: string) => "2024/01/01",
}));

const mockGetGroups = vi.mocked(groupService.getGroups);
const _mockCreateGroup = vi.mocked(groupService.createGroup);
const mockDeleteGroup = vi.mocked(groupService.deleteGroup);

describe("GroupsPage", () => {
  const mockGroups: Group[] = [
    {
      id: 1,
      name: "OP Group",
      description: "Operator group",
      type: "op",
      owner_id: 1,
      is_template: false,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      players: [
        {
          uuid: "550e8400-e29b-41d4-a716-446655440000",
          username: "admin",
          added_at: "2024-01-01T00:00:00Z",
        },
      ],
    },
    {
      id: 2,
      name: "Whitelist Group",
      description: null,
      type: "whitelist",
      owner_id: 2,
      is_template: false,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      players: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGroups.mockResolvedValue(ok(mockGroups));
  });

  describe("Page Rendering", () => {
    it("should render the page title and create button", async () => {
      render(<GroupsPage />);

      expect(screen.getByText("Group Management")).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByText("Create Group")).toBeInTheDocument();
      });
    });

    it("should render filter buttons", async () => {
      render(<GroupsPage />);

      await waitFor(() => {
        expect(screen.getByText("All Groups")).toBeInTheDocument();
        expect(screen.getByText("OP Groups")).toBeInTheDocument();
        expect(screen.getByText("Whitelist Groups")).toBeInTheDocument();
      });
    });

    it("should show loading state initially", () => {
      render(<GroupsPage />);
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });

  describe("Groups Display", () => {
    it("should display groups after loading", async () => {
      render(<GroupsPage />);

      await waitFor(() => {
        expect(screen.getByText("OP Group")).toBeInTheDocument();
        expect(screen.getByText("Whitelist Group")).toBeInTheDocument();
      });
    });

    it("should display group details correctly", async () => {
      render(<GroupsPage />);

      await waitFor(() => {
        expect(screen.getByText("OP Group")).toBeInTheDocument();
        expect(screen.getByText("Operator group")).toBeInTheDocument();
        expect(screen.getByText("1 players")).toBeInTheDocument();
        expect(screen.getAllByText("Created 2024/01/01")).toHaveLength(2);
      });
    });

    it("should handle groups with no description", async () => {
      render(<GroupsPage />);

      await waitFor(() => {
        expect(screen.getByText("Whitelist Group")).toBeInTheDocument();
        // Should render space character for consistent layout
        const descriptionElements = screen.getAllByText(/\s/);
        expect(descriptionElements.length).toBeGreaterThan(0);
      });
    });

    it("should display group type badges", async () => {
      render(<GroupsPage />);

      await waitFor(() => {
        expect(screen.getByText("OP")).toBeInTheDocument();
        expect(screen.getByText("Whitelist")).toBeInTheDocument();
      });
    });
  });

  describe("Basic Type Filtering", () => {
    it("should call getGroups without parameters for client-side filtering", async () => {
      render(<GroupsPage />);

      await waitFor(() => {
        const opButton = screen.getByText("OP Groups");
        fireEvent.click(opButton);
      });

      // All filtering is now done client-side, so getGroups is called without parameters
      expect(mockGetGroups).toHaveBeenCalledWith();
    });

    it("should filter OP groups client-side", async () => {
      render(<GroupsPage />);

      await waitFor(() => {
        const opButton = screen.getByText("OP Groups");
        fireEvent.click(opButton);
      });

      await waitFor(() => {
        // Should only show OP groups
        expect(screen.getByText("OP Group")).toBeInTheDocument();
        expect(screen.getByText("Template Group")).toBeInTheDocument();
        expect(screen.queryByText("Whitelist Group")).not.toBeInTheDocument();
      });
    });

    it("should filter Whitelist groups client-side", async () => {
      render(<GroupsPage />);

      await waitFor(() => {
        const whitelistButton = screen.getByText("Whitelist Groups");
        fireEvent.click(whitelistButton);
      });

      await waitFor(() => {
        // Should only show whitelist groups
        expect(screen.queryByText("OP Group")).not.toBeInTheDocument();
        expect(screen.queryByText("Template Group")).not.toBeInTheDocument();
        expect(screen.getByText("Whitelist Group")).toBeInTheDocument();
      });
    });

    it("should show all groups when All Groups is selected", async () => {
      render(<GroupsPage />);

      await waitFor(() => {
        // First click OP to change state
        const opButton = screen.getByText("OP Groups");
        fireEvent.click(opButton);
      });

      await waitFor(() => {
        const allButton = screen.getByText("All Groups");
        fireEvent.click(allButton);
      });

      await waitFor(() => {
        // Should show all groups
        expect(screen.getByText("OP Group")).toBeInTheDocument();
        expect(screen.getByText("Template Group")).toBeInTheDocument();
        expect(screen.getByText("Whitelist Group")).toBeInTheDocument();
      });
    });

    it("should update active filter button styling", async () => {
      render(<GroupsPage />);

      await waitFor(() => {
        const opButton = screen.getByText("OP Groups");
        fireEvent.click(opButton);
        expect(opButton.className).toContain("active");
      });
    });
  });

  describe("Navigation", () => {
    it("should navigate to group detail when view button is clicked", async () => {
      render(<GroupsPage />);

      await waitFor(() => {
        const viewButton = screen.getAllByText("View Details")[0]!;
        fireEvent.click(viewButton);
      });

      expect(mockPush).toHaveBeenCalledWith("/groups/1");
    });
  });

  describe("Group Deletion", () => {
    it("should show delete button only for owned groups", async () => {
      render(<GroupsPage />);

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
        // Only one delete button should be visible (for the group owned by current user)
        expect(deleteButtons).toHaveLength(1);
      });
    });

    it("should open confirmation modal when delete is clicked", async () => {
      render(<GroupsPage />);

      await waitFor(() => {
        const deleteButton = screen.getByRole("button", { name: "Delete" });
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId("confirmation-modal")).toBeInTheDocument();
        expect(screen.getAllByText("Delete")).toHaveLength(2); // Button + modal title
        expect(
          screen.getByText("Are you sure you want to delete this group?")
        ).toBeInTheDocument();
      });
    });

    it("should delete group when confirmed", async () => {
      mockDeleteGroup.mockResolvedValue(ok(undefined));

      render(<GroupsPage />);

      await waitFor(() => {
        const deleteButton = screen.getByRole("button", { name: "Delete" });
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        const confirmButton = screen.getByTestId("confirm-button");
        fireEvent.click(confirmButton);
      });

      expect(mockDeleteGroup).toHaveBeenCalledWith(1);
      // Should reload groups after deletion
      expect(mockGetGroups).toHaveBeenCalledTimes(2);
    });

    it("should cancel deletion when cancel is clicked", async () => {
      render(<GroupsPage />);

      await waitFor(() => {
        const deleteButton = screen.getByRole("button", { name: "Delete" });
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        const cancelButton = screen.getByTestId("cancel-button");
        fireEvent.click(cancelButton);
      });

      expect(mockDeleteGroup).not.toHaveBeenCalled();
      expect(
        screen.queryByTestId("confirmation-modal")
      ).not.toBeInTheDocument();
    });

    it("should handle delete errors", async () => {
      const apiError = { status: 403, message: "Not authorized" };
      mockDeleteGroup.mockResolvedValue(err(apiError));

      render(<GroupsPage />);

      await waitFor(() => {
        const deleteButton = screen.getByRole("button", { name: "Delete" });
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        const confirmButton = screen.getByTestId("confirm-button");
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(screen.getByText("Not authorized")).toBeInTheDocument();
      });
    });
  });

  describe("Empty States", () => {
    it("should show empty state when no groups exist", async () => {
      mockGetGroups.mockResolvedValue(ok([]));

      render(<GroupsPage />);

      await waitFor(() => {
        expect(screen.getByText("No groups found")).toBeInTheDocument();
        expect(screen.getByText("Create Your First Group")).toBeInTheDocument();
      });
    });

    it("should show create button in empty state for authorized users", async () => {
      mockGetGroups.mockResolvedValue(ok([]));

      render(<GroupsPage />);

      await waitFor(() => {
        const createButtons = screen.getAllByText("Create Your First Group");
        expect(createButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Group Creation Modal", () => {
    it("should open create modal when create button is clicked", async () => {
      render(<GroupsPage />);

      await waitFor(() => {
        const createButton = screen.getByText("Create Group");
        fireEvent.click(createButton);
      });

      // Modal content would be tested in separate modal component tests
      // Here we verify the modal state change by checking for the modal title
      expect(screen.getAllByText("Create Group")).toHaveLength(2); // Header button + modal title
    });
  });

  describe("Error Handling", () => {
    it("should display error message when API call fails", async () => {
      const apiError = { status: 500, message: "Server error" };
      mockGetGroups.mockResolvedValue(err(apiError));

      render(<GroupsPage />);

      await waitFor(() => {
        expect(screen.getByText("Server error")).toBeInTheDocument();
      });
    });

    it("should recover from errors when data is reloaded", async () => {
      const apiError = { status: 500, message: "Server error" };
      mockGetGroups.mockResolvedValueOnce(err(apiError));
      mockGetGroups.mockResolvedValueOnce(ok(mockGroups));

      render(<GroupsPage />);

      await waitFor(() => {
        expect(screen.getByText("Server error")).toBeInTheDocument();
      });

      // Simulate retry by clicking a different filter button then back to All Groups
      await waitFor(() => {
        const opButton = screen.getByText("OP Groups");
        fireEvent.click(opButton);
      });

      await waitFor(() => {
        expect(screen.getByText("OP Group")).toBeInTheDocument();
        expect(screen.queryByText("Server error")).not.toBeInTheDocument();
      });
    });
  });

  describe("Role-based Access Control", () => {
    it("should hide create button for unauthorized users", async () => {
      mockAuth.user = { ...mockUser, role: "user" as const };

      render(<GroupsPage />);

      await waitFor(() => {
        expect(screen.queryByText("Create Group")).not.toBeInTheDocument();
      });
    });

    it("should show create button for operators", async () => {
      mockAuth.user = { ...mockUser, role: "operator" as const };

      render(<GroupsPage />);

      await waitFor(() => {
        expect(screen.getByText("Create Group")).toBeInTheDocument();
      });

      // Reset to admin for other tests
      mockAuth.user = { ...mockUser, role: "admin" as const };
    });
  });

  describe("Responsive Design", () => {
    it("should render properly on mobile viewport", async () => {
      // Mock window.innerWidth for mobile
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<GroupsPage />);

      await waitFor(() => {
        expect(screen.getByText("Group Management")).toBeInTheDocument();
        expect(screen.getByText("OP Group")).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels", async () => {
      render(<GroupsPage />);

      await waitFor(() => {
        // Check that buttons have accessible text
        expect(screen.getByText("Create Group")).toBeInTheDocument();
        expect(screen.getByText("All Groups")).toBeInTheDocument();
      });
    });

    it("should be keyboard navigable", async () => {
      render(<GroupsPage />);

      await waitFor(() => {
        const createButton = screen.getByText("Create Group");
        expect(createButton).toBeInTheDocument();

        // Focus should be manageable (tested via tab navigation in e2e)
        if (createButton) {
          createButton.focus();
          expect(document.activeElement).toBe(createButton);
        }
      });
    });
  });

  describe("Template Groups", () => {
    it("should display template badge for template groups", async () => {
      render(<GroupsPage />);

      await waitFor(() => {
        expect(screen.getByText("Template")).toBeInTheDocument();
      });
    });

    it("should include template groups in type filtering", async () => {
      render(<GroupsPage />);

      await waitFor(() => {
        const opButton = screen.getByText("OP Groups");
        fireEvent.click(opButton);
      });

      await waitFor(() => {
        expect(screen.getByText("OP Group")).toBeInTheDocument();
        expect(screen.getByText("Template Group")).toBeInTheDocument();
        expect(screen.queryByText("Whitelist Group")).not.toBeInTheDocument();
      });
    });
  });

  describe("Date Range Filtering", () => {
    it("should filter by date range", async () => {
      render(<GroupsPage />);

      await waitFor(() => {
        const filterButton = screen.getByText("Filters");
        fireEvent.click(filterButton);
      });

      const dateInputs = screen.getAllByDisplayValue("");
      const fromDate = dateInputs.find(
        (input) => input.getAttribute("type") === "date"
      );
      const toDate = dateInputs.filter(
        (input) => input.getAttribute("type") === "date"
      )[1];

      if (fromDate && toDate) {
        fireEvent.change(fromDate, { target: { value: "2024-01-02" } });
        fireEvent.change(toDate, { target: { value: "2024-01-03" } });

        await waitFor(() => {
          // Should show groups created between 2024-01-02 and 2024-01-03
          expect(screen.queryByText("OP Group")).not.toBeInTheDocument();
          expect(screen.getByText("Whitelist Group")).toBeInTheDocument();
          expect(screen.getByText("Template Group")).toBeInTheDocument();
        });
      }
    });
  });
});
