import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ok, err } from "neverthrow";
import GroupDetailPage from "./page";
import * as groupService from "@/services/groups";
import type { Group, UpdateGroupRequest } from "@/services/groups";

// Mock the group service
vi.mock("@/services/groups", () => ({
  getGroup: vi.fn(),
  updateGroup: vi.fn(),
  deleteGroup: vi.fn(),
  addPlayerToGroup: vi.fn(),
  removePlayerFromGroup: vi.fn(),
}));

// Mock Next.js router and params
const mockPush = vi.fn();
const mockParams = { id: "1" };

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useParams: () => mockParams,
}));

// Mock auth context
const mockUser = {
  id: 1,
  username: "testuser",
  email: "test@example.com",
  role: "admin" as const,
  is_active: true,
  is_approved: true,
  created_at: "2024-01-01T00:00:00Z",
};

vi.mock("@/contexts/auth", () => ({
  useAuth: () => ({
    user: mockUser,
    logout: vi.fn(),
  }),
}));

// Mock language context
const mockT = vi.fn((key: string, params?: Record<string, string>) => {
  const translations: Record<string, string> = {
    "groups.notFound": "Group not found.",
    "groups.players.title": "Players",
    "groups.players.addPlayer": "Add Player",
    "groups.players.removePlayer": "Remove Player",
    "groups.players.noPlayers": "No players in this group yet.",
    "groups.players.addedAt": "Added {date}",
    "groups.players.confirmRemove":
      "Are you sure you want to remove {player} from this group?",
    "groups.players.playerName": "Player Name/UUID",
    "groups.players.playerNamePlaceholder": "Enter player name or UUID...",
    "groups.players.playerNameHint": "Enter a Minecraft player name or UUID",
    "groups.confirmDelete": "Are you sure you want to delete this group?",
    "groups.editGroup": "Edit Group",
    "groups.name": "Group Name",
    "groups.description": "Description",
    "groups.playerCount": "{count} players",
    "groups.op": "OP",
    "groups.whitelist": "Whitelist",
    "common.loading": "Loading...",
    "common.back": "Back",
    "common.edit": "Edit",
    "common.delete": "Delete",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.saving": "Saving...",
    "common.add": "Add",
    "common.adding": "Adding...",
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

const mockGetGroup = vi.mocked(groupService.getGroup);
const mockUpdateGroup = vi.mocked(groupService.updateGroup);
const mockDeleteGroup = vi.mocked(groupService.deleteGroup);
const mockAddPlayerToGroup = vi.mocked(groupService.addPlayerToGroup);
const mockRemovePlayerFromGroup = vi.mocked(groupService.removePlayerFromGroup);

describe("GroupDetailPage", () => {
  const mockGroup: Group = {
    id: 1,
    name: "Test Group",
    description: "A test group",
    type: "whitelist",
    owner_id: 1,
    is_template: false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    players: [
      {
        uuid: "550e8400-e29b-41d4-a716-446655440000",
        username: "TestPlayer",
        added_at: "2024-01-01T00:00:00Z",
      },
      {
        uuid: "123e4567-e89b-12d3-a456-426614174000",
        username: "AnotherPlayer",
        added_at: "2024-01-02T00:00:00Z",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGroup.mockResolvedValue(ok(mockGroup));
  });

  describe("Page Loading", () => {
    it("should show loading state initially", () => {
      render(<GroupDetailPage />);
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("should load and display group data", async () => {
      render(<GroupDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Test Group")).toBeInTheDocument();
        expect(screen.getByText("A test group")).toBeInTheDocument();
        expect(screen.getByText("Whitelist")).toBeInTheDocument();
      });

      expect(mockGetGroup).toHaveBeenCalledWith(1);
    });

    it("should handle group not found", async () => {
      const apiError = { status: 404, message: "Group not found" };
      mockGetGroup.mockResolvedValue(err(apiError));

      render(<GroupDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Group not found")).toBeInTheDocument();
      });
    });

    it("should handle network errors", async () => {
      const apiError = { status: 500, message: "Server error" };
      mockGetGroup.mockResolvedValue(err(apiError));

      render(<GroupDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Server error")).toBeInTheDocument();
      });
    });
  });

  describe("Group Information Display", () => {
    it("should display group header with name and type", async () => {
      render(<GroupDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Test Group")).toBeInTheDocument();
        expect(screen.getByText("Whitelist")).toBeInTheDocument();
      });
    });

    it("should display group description", async () => {
      render(<GroupDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("A test group")).toBeInTheDocument();
      });
    });

    it("should handle groups without description", async () => {
      const groupWithoutDesc = { ...mockGroup, description: null };
      mockGetGroup.mockResolvedValue(ok(groupWithoutDesc));

      render(<GroupDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Test Group")).toBeInTheDocument();
        // Description section should not be rendered
        expect(screen.queryByText("A test group")).not.toBeInTheDocument();
      });
    });

    it("should show back button and navigate correctly", async () => {
      render(<GroupDetailPage />);

      await waitFor(() => {
        const backButton = screen.getByText("← Back");
        fireEvent.click(backButton);
      });

      expect(mockPush).toHaveBeenCalledWith("/groups");
    });
  });

  describe("Player Management", () => {
    it("should display players list", async () => {
      render(<GroupDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Players")).toBeInTheDocument();
        expect(screen.getByText("2 players")).toBeInTheDocument();
        expect(screen.getByText("TestPlayer")).toBeInTheDocument();
        expect(screen.getByText("AnotherPlayer")).toBeInTheDocument();
      });
    });

    it("should display player UUIDs and added dates", async () => {
      render(<GroupDetailPage />);

      await waitFor(() => {
        expect(
          screen.getByText("550e8400-e29b-41d4-a716-446655440000")
        ).toBeInTheDocument();
        expect(screen.getAllByText("Added 2024/01/01")).toHaveLength(2);
      });
    });

    it("should show empty state when no players exist", async () => {
      const emptyGroup = { ...mockGroup, players: [] };
      mockGetGroup.mockResolvedValue(ok(emptyGroup));

      render(<GroupDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("0 players")).toBeInTheDocument();
        expect(
          screen.getByText("No players in this group yet.")
        ).toBeInTheDocument();
      });
    });

    it("should show add player button for group owner", async () => {
      render(<GroupDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Add Player")).toBeInTheDocument();
      });
    });

    it("should hide action buttons for non-owners", async () => {
      const nonOwnerGroup = { ...mockGroup, owner_id: 999 };
      mockGetGroup.mockResolvedValue(ok(nonOwnerGroup));

      render(<GroupDetailPage />);

      await waitFor(() => {
        expect(screen.queryByText("Add Player")).not.toBeInTheDocument();
        expect(screen.queryByText("Edit")).not.toBeInTheDocument();
        expect(screen.queryByText("Delete")).not.toBeInTheDocument();
      });
    });
  });

  describe("Player Addition", () => {
    it("should open add player modal", async () => {
      render(<GroupDetailPage />);

      await waitFor(() => {
        const addButton = screen.getByText("Add Player");
        fireEvent.click(addButton);
      });

      await waitFor(() => {
        expect(screen.getByText("Player Name/UUID")).toBeInTheDocument();
        expect(
          screen.getByPlaceholderText("Enter player name or UUID...")
        ).toBeInTheDocument();
      });
    });

    it("should add player by username", async () => {
      const updatedGroup: Group = {
        ...mockGroup,
        players: [
          ...mockGroup.players,
          {
            uuid: "new-uuid",
            username: "NewPlayer",
            added_at: "2024-01-03T00:00:00Z",
          },
        ],
      };

      mockAddPlayerToGroup.mockResolvedValue(ok(updatedGroup));
      mockGetGroup
        .mockResolvedValueOnce(ok(mockGroup))
        .mockResolvedValueOnce(ok(updatedGroup));

      render(<GroupDetailPage />);

      await waitFor(() => {
        const addButton = screen.getByText("Add Player");
        fireEvent.click(addButton);
      });

      await waitFor(() => {
        const input = screen.getByPlaceholderText(
          "Enter player name or UUID..."
        );
        fireEvent.change(input, { target: { value: "NewPlayer" } });

        const submitButton = screen.getByText("Add");
        fireEvent.click(submitButton);
      });

      expect(mockAddPlayerToGroup).toHaveBeenCalledWith(1, {
        username: "NewPlayer",
      });
    });

    it("should add player by UUID", async () => {
      const newUuid = "123e4567-e89b-12d3-a456-426614174111";
      mockAddPlayerToGroup.mockResolvedValue(ok(mockGroup));

      render(<GroupDetailPage />);

      await waitFor(() => {
        const addButton = screen.getByText("Add Player");
        fireEvent.click(addButton);
      });

      await waitFor(() => {
        const input = screen.getByPlaceholderText(
          "Enter player name or UUID..."
        );
        fireEvent.change(input, { target: { value: newUuid } });

        const submitButton = screen.getByText("Add");
        fireEvent.click(submitButton);
      });

      expect(mockAddPlayerToGroup).toHaveBeenCalledWith(1, { uuid: newUuid });
    });

    it("should handle add player errors", async () => {
      const apiError = { status: 409, message: "Player already exists" };
      mockAddPlayerToGroup.mockResolvedValue(err(apiError));

      render(<GroupDetailPage />);

      await waitFor(() => {
        const addButton = screen.getByText("Add Player");
        fireEvent.click(addButton);
      });

      await waitFor(() => {
        const input = screen.getByPlaceholderText(
          "Enter player name or UUID..."
        );
        fireEvent.change(input, { target: { value: "TestPlayer" } });

        const submitButton = screen.getByText("Add");
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText("Player already exists")).toBeInTheDocument();
      });
    });
  });

  describe("Player Removal", () => {
    it("should show remove button for each player", async () => {
      render(<GroupDetailPage />);

      await waitFor(() => {
        const removeButtons = screen.getAllByText("Remove Player");
        expect(removeButtons).toHaveLength(2);
      });
    });

    it("should open confirmation modal for player removal", async () => {
      render(<GroupDetailPage />);

      await waitFor(() => {
        const removeButtons = screen.getAllByText("Remove Player");
        fireEvent.click(removeButtons[0]!);
      });

      await waitFor(() => {
        expect(screen.getByTestId("confirmation-modal")).toBeInTheDocument();
        expect(
          screen.getByText(
            "Are you sure you want to remove TestPlayer from this group?"
          )
        ).toBeInTheDocument();
      });
    });

    it("should remove player when confirmed", async () => {
      const updatedGroup: Group = {
        ...mockGroup,
        players: [mockGroup.players[1]!], // Remove first player
      };

      mockRemovePlayerFromGroup.mockResolvedValue(ok(updatedGroup));
      mockGetGroup
        .mockResolvedValueOnce(ok(mockGroup))
        .mockResolvedValueOnce(ok(updatedGroup));

      render(<GroupDetailPage />);

      await waitFor(() => {
        const removeButtons = screen.getAllByText("Remove Player");
        fireEvent.click(removeButtons[0]!);
      });

      await waitFor(() => {
        const confirmButton = screen.getByTestId("confirm-button");
        fireEvent.click(confirmButton);
      });

      expect(mockRemovePlayerFromGroup).toHaveBeenCalledWith(
        1,
        "550e8400-e29b-41d4-a716-446655440000"
      );
    });

    it("should cancel player removal", async () => {
      render(<GroupDetailPage />);

      await waitFor(() => {
        const removeButtons = screen.getAllByText("Remove Player");
        fireEvent.click(removeButtons[0]!);
      });

      await waitFor(() => {
        const cancelButton = screen.getByTestId("cancel-button");
        fireEvent.click(cancelButton);
      });

      expect(mockRemovePlayerFromGroup).not.toHaveBeenCalled();
      expect(
        screen.queryByTestId("confirmation-modal")
      ).not.toBeInTheDocument();
    });

    it("should handle remove player errors", async () => {
      const apiError = { status: 404, message: "Player not found" };
      mockRemovePlayerFromGroup.mockResolvedValue(err(apiError));

      render(<GroupDetailPage />);

      await waitFor(() => {
        const removeButtons = screen.getAllByText("Remove Player");
        fireEvent.click(removeButtons[0]!);
      });

      await waitFor(() => {
        const confirmButton = screen.getByTestId("confirm-button");
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(screen.getByText("Player not found")).toBeInTheDocument();
      });
    });
  });

  describe("Group Editing", () => {
    it("should show edit button for group owner", async () => {
      render(<GroupDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Edit")).toBeInTheDocument();
      });
    });

    it("should open edit modal", async () => {
      render(<GroupDetailPage />);

      await waitFor(() => {
        const editButton = screen.getByText("Edit");
        fireEvent.click(editButton);
      });

      await waitFor(() => {
        expect(screen.getByText("Edit Group")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Test Group")).toBeInTheDocument();
        expect(screen.getByDisplayValue("A test group")).toBeInTheDocument();
      });
    });

    it("should update group when edit form is submitted", async () => {
      const updateRequest: UpdateGroupRequest = {
        name: "Updated Group",
        description: "Updated description",
      };

      const updatedGroup = { ...mockGroup, ...updateRequest };
      mockUpdateGroup.mockResolvedValue(ok(updatedGroup));
      mockGetGroup
        .mockResolvedValueOnce(ok(mockGroup))
        .mockResolvedValueOnce(ok(updatedGroup));

      render(<GroupDetailPage />);

      await waitFor(() => {
        const editButton = screen.getByText("Edit");
        fireEvent.click(editButton);
      });

      await waitFor(() => {
        const nameInput = screen.getByDisplayValue("Test Group");
        fireEvent.change(nameInput, { target: { value: "Updated Group" } });

        const descInput = screen.getByDisplayValue("A test group");
        fireEvent.change(descInput, {
          target: { value: "Updated description" },
        });

        const saveButton = screen.getByText("Save");
        fireEvent.click(saveButton);
      });

      expect(mockUpdateGroup).toHaveBeenCalledWith(1, updateRequest);
    });

    it("should handle edit errors", async () => {
      const apiError = { status: 400, message: "Invalid name" };
      mockUpdateGroup.mockResolvedValue(err(apiError));

      render(<GroupDetailPage />);

      await waitFor(() => {
        const editButton = screen.getByText("Edit");
        fireEvent.click(editButton);
      });

      await waitFor(() => {
        const saveButton = screen.getByText("Save");
        fireEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(screen.getByText("Invalid name")).toBeInTheDocument();
      });
    });
  });

  describe("Group Deletion", () => {
    it("should show delete button for group owner", async () => {
      render(<GroupDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Delete")).toBeInTheDocument();
      });
    });

    it("should open confirmation modal for group deletion", async () => {
      render(<GroupDetailPage />);

      await waitFor(() => {
        const deleteButton = screen.getByText("Delete");
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId("confirmation-modal")).toBeInTheDocument();
        expect(
          screen.getByText("Are you sure you want to delete this group?")
        ).toBeInTheDocument();
      });
    });

    it("should delete group and navigate to groups page", async () => {
      mockDeleteGroup.mockResolvedValue(ok(undefined));

      render(<GroupDetailPage />);

      await waitFor(() => {
        const deleteButton = screen.getByText("Delete");
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        const confirmButton = screen.getByTestId("confirm-button");
        fireEvent.click(confirmButton);
      });

      expect(mockDeleteGroup).toHaveBeenCalledWith(1);
      expect(mockPush).toHaveBeenCalledWith("/groups");
    });

    it("should handle delete errors", async () => {
      const apiError = { status: 403, message: "Not authorized" };
      mockDeleteGroup.mockResolvedValue(err(apiError));

      render(<GroupDetailPage />);

      await waitFor(() => {
        const deleteButton = screen.getByText("Delete");
        fireEvent.click(deleteButton);
      });

      await waitFor(() => {
        const confirmButton = screen.getByTestId("confirm-button");
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(screen.getByText("Not authorized")).toBeInTheDocument();
      });

      // Should not navigate on error
      expect(mockPush).not.toHaveBeenCalledWith("/groups");
    });
  });

  describe("URL Parameter Handling", () => {
    it("should handle invalid group ID", async () => {
      mockParams.id = "invalid";

      render(<GroupDetailPage />);

      // parseInt("invalid") returns NaN
      expect(mockGetGroup).toHaveBeenCalledWith(NaN);
    });

    it("should handle numeric string group ID", async () => {
      mockParams.id = "123";

      render(<GroupDetailPage />);

      expect(mockGetGroup).toHaveBeenCalledWith(123);
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading structure", async () => {
      render(<GroupDetailPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: "Test Group" })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("heading", { name: "Players" })
        ).toBeInTheDocument();
      });
    });

    it("should have accessible buttons", async () => {
      render(<GroupDetailPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "← Back" })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: "Edit" })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: "Delete" })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: "Add Player" })
        ).toBeInTheDocument();
      });
    });
  });

  describe("Loading States", () => {
    it("should show loading during operations", async () => {
      // Mock a slow API call
      mockAddPlayerToGroup.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<GroupDetailPage />);

      await waitFor(() => {
        const addButton = screen.getByText("Add Player");
        fireEvent.click(addButton);
      });

      await waitFor(() => {
        const input = screen.getByPlaceholderText(
          "Enter player name or UUID..."
        );
        fireEvent.change(input, { target: { value: "TestPlayer" } });

        const submitButton = screen.getByText("Add");
        fireEvent.click(submitButton);
      });

      // Should show loading state
      expect(screen.getByText("Adding...")).toBeInTheDocument();
    });
  });
});
