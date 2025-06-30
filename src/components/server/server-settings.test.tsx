import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ok, err } from "neverthrow";
import { ServerType, ServerStatus } from "@/types/server";

// Mock the auth context
const mockLogout = vi.fn();
const mockAuthContext = {
  user: { id: 1, username: "admin", email: "admin@example.com" },
  isLoading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: mockLogout,
  isAuthenticated: true,
};

vi.mock("@/contexts/auth", () => ({
  useAuth: () => mockAuthContext,
}));

// Mock the language context with actual translations
const translations: Record<string, string> = {
  "servers.settings.title": "Server Settings",
  "servers.settings.updated": "Server settings updated successfully",
  "servers.settings.validation.nameRequired": "Server name is required",
  "servers.settings.validation.memoryMinimum": "Memory must be at least 512MB",
  "servers.settings.validation.playersRange":
    "Max players must be between 1 and 200",
  "servers.settings.resetChanges": "Reset Changes",
  "servers.settings.saveSettings": "Save Settings",
  "servers.settings.saving": "Saving...",
  "servers.description": "Description",
  "servers.settings.associatedGroups": "Associated Groups",
  "servers.settings.loadingGroups": "Loading groups...",
  "groups.servers.attachedGroups": "attached groups",
  "groups.servers.attachToServer": "Attach Group",
  "groups.servers.noGroupsAttached": "No groups are attached to this server",
  "groups.servers.detach": "Detach",
  "groups.servers.detachServer": "Detach Group",
  "groups.servers.confirmDetach": "Are you sure you want to detach {server}?",
  "groups.servers.selectGroup": "Select Group",
  "groups.servers.chooseGroup": "Choose a group",
  "groups.servers.priority": "Priority",
  "groups.servers.attach": "Attach",
  "groups.types.whitelist": "Whitelist",
  "groups.types.operators": "Operators",
  "common.cancel": "Cancel",
  "common.close": "Close",
  "servers.settings.description": "Configure your server settings",
  "servers.settings.groupsDescription": "Manage groups attached to this server",
  "groups.servers.priorityHint": "Higher values have higher priority",
  "servers.settings.basicInformation": "Basic Information",
  "servers.settings.serverName": "Server Name",
  "servers.settings.enterDescription": "Enter a description for your server",
  "servers.settings.serverResources": "Server Resources",
  "servers.settings.memoryLimit": "Memory Limit (MB)",
  "servers.settings.memoryHint": "Minimum 512MB recommended",
  "servers.fields.maxPlayers": "Max Players",
  "servers.settings.maxPlayersHint": "1-200 players supported",
  "groups.servers.attachedOn": "Attached on",
};

const mockT = vi.fn((key: string, params?: Record<string, string>) => {
  let translation = translations[key] || key;
  if (params) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      translation = translation.replace(`{${paramKey}}`, paramValue);
    });
  }
  return translation;
});
vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({
    t: mockT,
  }),
  useLanguage: () => ({
    locale: "en",
    setLocale: vi.fn(),
    messages: {},
  }),
}));

// Mock the server service
vi.mock("@/services/server");

// Mock the groups service
vi.mock("@/services/groups");

// Mock the modal component
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
  }) =>
    isOpen ? (
      <div data-testid="confirmation-modal">
        <h3>{title}</h3>
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

// Mock formatDate utility
vi.mock("@/utils/format", () => ({
  formatDate: vi.fn((date: string) => `Formatted: ${date}`),
}));

// Import the component after mocks
import { ServerSettings } from "./server-settings";
import * as serverService from "@/services/server";
import * as groupService from "@/services/groups";

describe("ServerSettings", () => {
  const user = userEvent.setup();
  const mockOnUpdate = vi.fn();
  const mockServer = {
    id: 1,
    name: "Test Server",
    description: "A test server",
    minecraft_version: "1.21.5",
    server_type: ServerType.VANILLA,
    status: ServerStatus.STOPPED,
    directory_path: "servers/test",
    port: 25565,
    max_memory: 2048,
    max_players: 20,
    owner_id: 1,
    template_id: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    process_info: null,
    configurations: [],
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    // Setup default mock returns to prevent async operations in unrelated tests
    vi.mocked(groupService.getServerGroups).mockResolvedValue(ok([]));
    vi.mocked(groupService.getGroups).mockResolvedValue(ok([]));
    vi.mocked(groupService.detachGroupFromServer).mockClear();
    vi.mocked(groupService.attachGroupToServer).mockClear();
    vi.mocked(serverService.updateServer).mockClear();
  });

  test("should render server settings form with current values", async () => {
    render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

    expect(screen.getByText("Server Settings")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test Server")).toBeInTheDocument();
    expect(screen.getByDisplayValue("A test server")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2048")).toBeInTheDocument();
    expect(screen.getByDisplayValue("20")).toBeInTheDocument();

    // Wait for groups to load to prevent act warnings
    await waitFor(() => {
      expect(screen.getByText("Associated Groups")).toBeInTheDocument();
    });
  });

  // Read-only information section was removed as per requirements

  test("should handle input changes", async () => {
    render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

    const nameInput = screen.getByDisplayValue("Test Server");
    const descriptionInput = screen.getByDisplayValue("A test server");
    const memoryInput = screen.getByDisplayValue("2048");
    const playersInput = screen.getByDisplayValue("20");

    await user.clear(nameInput);
    await user.type(nameInput, "Updated Server");

    await user.clear(descriptionInput);
    await user.type(descriptionInput, "Updated description");

    await user.clear(memoryInput);
    await user.type(memoryInput, "4096");

    await user.clear(playersInput);
    await user.type(playersInput, "50");

    expect(nameInput).toHaveValue("Updated Server");
    expect(descriptionInput).toHaveValue("Updated description");
    expect(memoryInput).toHaveValue(4096);
    expect(playersInput).toHaveValue(50);

    // Save button should be enabled
    const saveButtons = screen.getAllByRole("button", {
      name: /Save Settings/i,
    });
    expect(saveButtons[0]).not.toBeDisabled();
  });

  test("should show save button when changes are made", async () => {
    render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

    const nameInput = screen.getByDisplayValue("Test Server");

    // Initially no save/reset buttons should be visible (no changes)
    expect(
      screen.queryByRole("button", { name: /Save Settings/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Reset Changes/i })
    ).not.toBeInTheDocument();

    // Make a change
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Server");

    // Now buttons should appear and be enabled
    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: /Save Settings/i })[0]
      ).toBeInTheDocument();
      expect(
        screen.getAllByRole("button", { name: /Reset Changes/i })[0]
      ).toBeInTheDocument();
    });

    const saveButtons = screen.getAllByRole("button", {
      name: /Save Settings/i,
    });
    const resetButtons = screen.getAllByRole("button", {
      name: /Reset Changes/i,
    });

    expect(saveButtons[0]).not.toBeDisabled();
    expect(resetButtons[0]).not.toBeDisabled();
  });

  test("should save settings successfully", async () => {
    const updatedServer = {
      ...mockServer,
      name: "Updated Server",
      max_memory: 4096,
    };
    vi.mocked(serverService.updateServer).mockResolvedValueOnce(
      ok(updatedServer)
    );

    render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

    const nameInput = screen.getByDisplayValue("Test Server");
    const memoryInput = screen.getByDisplayValue("2048");

    await user.clear(nameInput);
    await user.type(nameInput, "Updated Server");
    await user.clear(memoryInput);
    await user.type(memoryInput, "4096");

    const saveButtons = screen.getAllByRole("button", {
      name: /Save Settings/i,
    });
    expect(saveButtons.length).toBeGreaterThan(0);
    await user.click(saveButtons[0]!);

    await waitFor(() => {
      expect(
        screen.getByText("Server settings updated successfully")
      ).toBeInTheDocument();
    });

    expect(serverService.updateServer).toHaveBeenCalledWith(1, {
      name: "Updated Server",
      description: "A test server",
      max_memory: 4096,
      max_players: 20,
    });

    expect(mockOnUpdate).toHaveBeenCalledWith(updatedServer);
  });

  test("should handle save errors", async () => {
    vi.mocked(serverService.updateServer).mockResolvedValueOnce(
      err({ message: "Failed to update server", status: 500 })
    );

    render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

    const nameInput = screen.getByDisplayValue("Test Server");
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Server");

    const saveButtons = screen.getAllByRole("button", {
      name: /Save Settings/i,
    });
    expect(saveButtons.length).toBeGreaterThan(0);
    await user.click(saveButtons[0]!);

    await waitFor(() => {
      expect(screen.getByText("Failed to update server")).toBeInTheDocument();
    });

    expect(mockOnUpdate).not.toHaveBeenCalled();
  });

  test("should reset form to original values", async () => {
    render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

    const nameInput = screen.getByDisplayValue("Test Server");
    const memoryInput = screen.getByDisplayValue("2048");

    // Make changes
    await user.clear(nameInput);
    await user.type(nameInput, "Changed Name");
    await user.clear(memoryInput);
    await user.type(memoryInput, "4096");

    // Wait for buttons to appear
    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: /Reset Changes/i })[0]
      ).toBeInTheDocument();
    });

    // Reset
    const resetButtons = screen.getAllByRole("button", {
      name: /Reset Changes/i,
    });
    expect(resetButtons.length).toBeGreaterThan(0);
    await user.click(resetButtons[0]!);

    expect(nameInput).toHaveValue("Test Server");
    expect(memoryInput).toHaveValue(2048);

    // Buttons should be hidden again (no changes)
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /Reset Changes/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Save Settings/i })
      ).not.toBeInTheDocument();
    });
  });

  test("should disable form during save operation", async () => {
    vi.mocked(serverService.updateServer).mockImplementation(
      () =>
        new Promise((resolve) => setTimeout(() => resolve(ok(mockServer)), 100))
    );

    render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

    const nameInput = screen.getByDisplayValue("Test Server");
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Server");

    const saveButtons = screen.getAllByRole("button", {
      name: /Save Settings/i,
    });
    expect(saveButtons.length).toBeGreaterThan(0);
    await user.click(saveButtons[0]!);

    // Form should be disabled during save
    expect(
      screen.getAllByRole("button", { name: /Saving/i })[0]
    ).toBeInTheDocument();
    expect(nameInput).toBeDisabled();
  });

  test("should handle authentication errors by logging out", async () => {
    vi.mocked(serverService.updateServer).mockResolvedValueOnce(
      err({ message: "Unauthorized", status: 401 })
    );

    render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

    const nameInput = screen.getByDisplayValue("Test Server");
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Server");

    const saveButtons = screen.getAllByRole("button", {
      name: /Save Settings/i,
    });
    expect(saveButtons.length).toBeGreaterThan(0);
    await user.click(saveButtons[0]!);

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
    });
  });

  test("should handle server without description", async () => {
    const serverWithoutDescription = { ...mockServer, description: null };
    render(
      <ServerSettings
        server={serverWithoutDescription}
        onUpdate={mockOnUpdate}
      />
    );

    const descriptionInput = screen.getByRole("textbox", {
      name: /description/i,
    });
    expect(descriptionInput).toHaveValue("");

    // Wait for groups to load to prevent act warnings
    await waitFor(() => {
      expect(screen.getByText("Associated Groups")).toBeInTheDocument();
    });
  });

  test("should update form when server prop changes", async () => {
    const { rerender } = render(
      <ServerSettings server={mockServer} onUpdate={mockOnUpdate} />
    );

    // Wait for initial render to complete
    await waitFor(() => {
      expect(screen.getByText("Associated Groups")).toBeInTheDocument();
    });

    const updatedServer = { ...mockServer, name: "New Name", max_memory: 4096 };
    rerender(<ServerSettings server={updatedServer} onUpdate={mockOnUpdate} />);

    expect(screen.getByDisplayValue("New Name")).toBeInTheDocument();
    expect(screen.getByDisplayValue("4096")).toBeInTheDocument();
  });

  describe("Form Validation", () => {
    beforeEach(() => {
      // Completely reset mocks for validation tests to prevent modal interference
      vi.clearAllMocks();
      // Return empty arrays to prevent groups UI from interfering with validation
      vi.mocked(groupService.getServerGroups).mockResolvedValue(ok([]));
      vi.mocked(groupService.getGroups).mockResolvedValue(ok([]));
      vi.mocked(groupService.detachGroupFromServer).mockClear();
      vi.mocked(groupService.attachGroupToServer).mockClear();
      vi.mocked(serverService.updateServer).mockClear();
    });

    test("should show error for empty server name", async () => {
      render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

      // Wait for component to fully render and groups to load
      await waitFor(() => {
        expect(screen.getByDisplayValue("Test Server")).toBeInTheDocument();
      });

      const nameInput = screen.getByDisplayValue("Test Server");
      await user.clear(nameInput);
      await user.type(nameInput, "   "); // Whitespace only

      // Wait for buttons to appear after making changes
      await waitFor(() => {
        expect(
          screen.getAllByRole("button", { name: /Save Settings/i })[0]
        ).toBeInTheDocument();
      });

      const saveButtons = screen.getAllByRole("button", {
        name: /Save Settings/i,
      });
      await user.click(saveButtons[0]!);

      await waitFor(
        () => {
          expect(
            screen.getByText("Server name is required")
          ).toBeInTheDocument();
        },
        { timeout: 10000 }
      );

      expect(serverService.updateServer).not.toHaveBeenCalled();
    });

    test(
      "should show error for memory below minimum",
      { timeout: 20000 },
      async () => {
        render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

        // Wait for component to fully render
        await waitFor(() => {
          expect(screen.getByDisplayValue("2048")).toBeInTheDocument();
        });

        const memoryInput = screen.getByDisplayValue("2048");
        await user.clear(memoryInput);
        await user.type(memoryInput, "256");

        // Verify the input value was changed
        expect(memoryInput).toHaveValue(256);

        // Wait for buttons to appear after making changes
        await waitFor(() => {
          expect(
            screen.getAllByRole("button", { name: /Save Settings/i })[0]
          ).toBeInTheDocument();
        });

        // Find the form and submit it directly
        const form = memoryInput.closest("form");
        expect(form).toBeInTheDocument();

        fireEvent.submit(form!);

        await waitFor(
          () => {
            expect(
              screen.getByText("Memory must be at least 512MB")
            ).toBeInTheDocument();
          },
          { timeout: 5000 }
        );

        expect(serverService.updateServer).not.toHaveBeenCalled();
      }
    );

    test(
      "should show error for max players out of range",
      { timeout: 20000 },
      async () => {
        render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

        // Wait for component to fully render
        await waitFor(() => {
          expect(screen.getByDisplayValue("20")).toBeInTheDocument();
        });

        const playersInput = screen.getByDisplayValue("20");
        await user.clear(playersInput);
        await user.type(playersInput, "300");

        // Wait for buttons to appear after making changes
        await waitFor(() => {
          expect(
            screen.getAllByRole("button", { name: /Save Settings/i })[0]
          ).toBeInTheDocument();
        });

        // Find the form and submit it directly
        const form = playersInput.closest("form");
        expect(form).toBeInTheDocument();

        fireEvent.submit(form!);

        await waitFor(
          () => {
            expect(
              screen.getByText("Max players must be between 1 and 200")
            ).toBeInTheDocument();
          },
          { timeout: 10000 }
        );

        expect(serverService.updateServer).not.toHaveBeenCalled();
      }
    );

    test("should show error for max players too low", async () => {
      render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

      // Wait for component to fully render
      await waitFor(() => {
        expect(screen.getByDisplayValue("20")).toBeInTheDocument();
      });

      const playersInput = screen.getByDisplayValue("20");
      await user.clear(playersInput);
      await user.type(playersInput, "0");

      // Wait for buttons to appear after making changes
      await waitFor(() => {
        expect(
          screen.getAllByRole("button", { name: /Save Settings/i })[0]
        ).toBeInTheDocument();
      });

      // Find the form and submit it directly
      const form = playersInput.closest("form");
      expect(form).toBeInTheDocument();

      fireEvent.submit(form!);

      await waitFor(() => {
        expect(
          screen.getByText("Max players must be between 1 and 200")
        ).toBeInTheDocument();
      });

      expect(serverService.updateServer).not.toHaveBeenCalled();
    });

    test("should clear error and success messages when input changes", async () => {
      render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

      // Wait for component to fully render
      await waitFor(() => {
        expect(screen.getByDisplayValue("Test Server")).toBeInTheDocument();
      });

      const nameInput = screen.getByDisplayValue("Test Server");
      await user.clear(nameInput);
      await user.type(nameInput, "   ");

      // Wait for buttons to appear after making changes
      await waitFor(() => {
        expect(
          screen.getAllByRole("button", { name: /Save Settings/i })[0]
        ).toBeInTheDocument();
      });

      const saveButtons = screen.getAllByRole("button", {
        name: /Save Settings/i,
      });
      await user.click(saveButtons[0]!);

      await waitFor(() => {
        expect(screen.getByText("Server name is required")).toBeInTheDocument();
      });

      // Make a change to clear the error
      await user.clear(nameInput);
      await user.type(nameInput, "Valid Name");

      await waitFor(() => {
        expect(
          screen.queryByText("Server name is required")
        ).not.toBeInTheDocument();
      });
    });

    test("should handle numeric input parsing correctly", async () => {
      render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

      // Wait for component to fully render
      await waitFor(() => {
        expect(screen.getByDisplayValue("2048")).toBeInTheDocument();
        expect(screen.getByDisplayValue("20")).toBeInTheDocument();
      });

      const memoryInput = screen.getByDisplayValue("2048");
      const playersInput = screen.getByDisplayValue("20");

      // Test non-numeric input defaults to 0
      await user.clear(memoryInput);
      await user.type(memoryInput, "abc");
      expect(memoryInput).toHaveValue(0);

      await user.clear(playersInput);
      await user.type(playersInput, "xyz");
      expect(playersInput).toHaveValue(0);

      // Test empty input defaults to 0
      await user.clear(memoryInput);
      expect(memoryInput).toHaveValue(0);
    });
  });

  describe("ServerGroupsSection", () => {
    const mockAttachedGroups = [
      {
        id: 1,
        name: "Whitelist Group",
        type: "whitelist" as const,
        priority: 10,
        attached_at: "2025-01-01T12:00:00Z",
      },
      {
        id: 2,
        name: "Operators Group",
        type: "operators" as const,
        priority: 20,
        attached_at: "2025-01-02T12:00:00Z",
      },
    ];

    const mockAvailableGroups = [
      {
        id: 3,
        name: "Available Group",
        type: "whitelist" as const,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
    ];

    test("should render groups section with loading state", () => {
      vi.mocked(groupService.getServerGroups).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );
      vi.mocked(groupService.getGroups).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

      expect(screen.getByText("Associated Groups")).toBeInTheDocument();
      expect(screen.getByText("Loading groups...")).toBeInTheDocument();
    });

    test("should render attached groups successfully", async () => {
      vi.mocked(groupService.getServerGroups).mockResolvedValue(
        ok(mockAttachedGroups)
      );
      vi.mocked(groupService.getGroups).mockResolvedValue(
        ok(mockAvailableGroups)
      );

      render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(screen.getByText("Whitelist Group")).toBeInTheDocument();
        expect(screen.getByText("Operators Group")).toBeInTheDocument();
      });

      expect(screen.getByText("2 attached groups")).toBeInTheDocument();
      expect(screen.getByText("Whitelist")).toBeInTheDocument();
      expect(screen.getByText("Operators")).toBeInTheDocument();
      expect(screen.getByText("Priority: 10")).toBeInTheDocument();
      expect(screen.getByText("Priority: 20")).toBeInTheDocument();
    });

    test("should render empty state when no groups attached", async () => {
      vi.mocked(groupService.getServerGroups).mockResolvedValue(ok([]));
      vi.mocked(groupService.getGroups).mockResolvedValue(
        ok(mockAvailableGroups)
      );

      render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(
          screen.getByText("No groups are attached to this server")
        ).toBeInTheDocument();
      });

      expect(screen.getByText("0 attached groups")).toBeInTheDocument();
    });

    test("should handle groups loading error", async () => {
      vi.mocked(groupService.getServerGroups).mockResolvedValue(
        err({ message: "Failed to load groups", status: 500 })
      );

      render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load groups")).toBeInTheDocument();
      });
    });

    test("should handle available groups loading error", async () => {
      vi.mocked(groupService.getServerGroups).mockResolvedValue(ok([]));
      vi.mocked(groupService.getGroups).mockResolvedValue(
        err({ message: "Failed to load available groups", status: 500 })
      );

      render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(
          screen.getByText("Failed to load available groups")
        ).toBeInTheDocument();
      });
    });

    test("should handle unexpected error during groups loading", async () => {
      vi.mocked(groupService.getServerGroups).mockRejectedValue(
        new Error("Network error")
      );

      render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(
          screen.getByText("Failed to load groups data")
        ).toBeInTheDocument();
      });
    });

    test("should open attach group modal", async () => {
      vi.mocked(groupService.getServerGroups).mockResolvedValue(ok([]));
      vi.mocked(groupService.getGroups).mockResolvedValue(
        ok(mockAvailableGroups)
      );

      render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(screen.getByText("Attach Group")).toBeInTheDocument();
      });

      const attachButton = screen.getByRole("button", { name: "Attach Group" });
      await user.click(attachButton);

      expect(screen.getByText("Select Group")).toBeInTheDocument();
      expect(screen.getByText("Choose a group")).toBeInTheDocument();
    });

    test("should disable attach button when no groups available", async () => {
      vi.mocked(groupService.getServerGroups).mockResolvedValue(
        ok(mockAttachedGroups)
      );
      vi.mocked(groupService.getGroups).mockResolvedValue(
        ok(mockAttachedGroups)
      ); // Same groups (all attached)

      render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        const attachButton = screen.getByRole("button", {
          name: "Attach Group",
        });
        expect(attachButton).toBeDisabled();
      });
    });

    test("should open detach confirmation modal", async () => {
      vi.mocked(groupService.getServerGroups).mockResolvedValue(
        ok(mockAttachedGroups)
      );
      vi.mocked(groupService.getGroups).mockResolvedValue(ok([]));

      render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(screen.getByText("Whitelist Group")).toBeInTheDocument();
      });

      const detachButtons = screen.getAllByText("Detach");
      await user.click(detachButtons[0]!);

      await waitFor(() => {
        expect(screen.getByText("Detach Group")).toBeInTheDocument();
        expect(
          screen.getByText("Are you sure you want to detach Whitelist Group?")
        ).toBeInTheDocument();
      });
    });

    test("should detach group successfully", async () => {
      vi.mocked(groupService.getServerGroups)
        .mockResolvedValueOnce(ok(mockAttachedGroups))
        .mockResolvedValueOnce(ok([])); // After detachment
      vi.mocked(groupService.getGroups).mockResolvedValue(ok([]));
      vi.mocked(groupService.detachGroupFromServer).mockResolvedValue(
        ok(undefined)
      );

      render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(screen.getByText("Whitelist Group")).toBeInTheDocument();
      });

      const detachButtons = screen.getAllByText("Detach");
      await user.click(detachButtons[0]!);

      await waitFor(() => {
        expect(screen.getByTestId("confirmation-modal")).toBeInTheDocument();
      });

      const confirmButton = screen.getByTestId("confirm-button");
      await user.click(confirmButton);

      await waitFor(() => {
        expect(groupService.detachGroupFromServer).toHaveBeenCalledWith(1, 1);
      });

      expect(
        screen.queryByTestId("confirmation-modal")
      ).not.toBeInTheDocument();
    });

    test("should handle detach group error", async () => {
      vi.mocked(groupService.getServerGroups).mockResolvedValue(
        ok(mockAttachedGroups)
      );
      vi.mocked(groupService.getGroups).mockResolvedValue(ok([]));
      vi.mocked(groupService.detachGroupFromServer).mockResolvedValue(
        err({ message: "Failed to detach group", status: 500 })
      );

      render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(screen.getByText("Whitelist Group")).toBeInTheDocument();
      });

      const detachButtons = screen.getAllByText("Detach");
      await user.click(detachButtons[0]!);

      await waitFor(() => {
        expect(screen.getByTestId("confirmation-modal")).toBeInTheDocument();
      });

      const confirmButton = screen.getByTestId("confirm-button");
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText("Failed to detach group")).toBeInTheDocument();
      });
    });

    test("should cancel detach operation", async () => {
      vi.mocked(groupService.getServerGroups).mockResolvedValue(
        ok(mockAttachedGroups)
      );
      vi.mocked(groupService.getGroups).mockResolvedValue(ok([]));

      render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(screen.getByText("Whitelist Group")).toBeInTheDocument();
      });

      const detachButtons = screen.getAllByText("Detach");
      await user.click(detachButtons[0]!);

      await waitFor(() => {
        expect(screen.getByTestId("confirmation-modal")).toBeInTheDocument();
      });

      const cancelButton = screen.getByTestId("cancel-button");
      await user.click(cancelButton);

      expect(
        screen.queryByTestId("confirmation-modal")
      ).not.toBeInTheDocument();
      expect(groupService.detachGroupFromServer).not.toHaveBeenCalled();
    });
  });

  describe("AttachGroupModal", () => {
    const mockAvailableGroups = [
      {
        id: 3,
        name: "Available Group 1",
        type: "whitelist" as const,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
      {
        id: 4,
        name: "Available Group 2",
        type: "operators" as const,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
    ];

    test("should render attach group modal with available groups", async () => {
      vi.mocked(groupService.getServerGroups).mockResolvedValue(ok([]));
      vi.mocked(groupService.getGroups).mockResolvedValue(
        ok(mockAvailableGroups)
      );

      render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(screen.getByText("Attach Group")).toBeInTheDocument();
      });

      const attachButton = screen.getByRole("button", { name: "Attach Group" });
      await user.click(attachButton);

      expect(screen.getByText("Select Group")).toBeInTheDocument();
      expect(
        screen.getByText("Available Group 1 (Whitelist)")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Available Group 2 (Operators)")
      ).toBeInTheDocument();
    });

    test("should close attach group modal", async () => {
      vi.mocked(groupService.getServerGroups).mockResolvedValue(ok([]));
      vi.mocked(groupService.getGroups).mockResolvedValue(
        ok(mockAvailableGroups)
      );

      render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(screen.getByText("Attach Group")).toBeInTheDocument();
      });

      const attachButton = screen.getByRole("button", { name: "Attach Group" });
      await user.click(attachButton);

      const closeButton = screen.getByLabelText("Close");
      await user.click(closeButton);

      expect(screen.queryByText("Select Group")).not.toBeInTheDocument();
    });

    test("should cancel attach group modal", async () => {
      vi.mocked(groupService.getServerGroups).mockResolvedValue(ok([]));
      vi.mocked(groupService.getGroups).mockResolvedValue(
        ok(mockAvailableGroups)
      );

      render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(screen.getByText("Attach Group")).toBeInTheDocument();
      });

      const attachButton = screen.getByRole("button", { name: "Attach Group" });
      await user.click(attachButton);

      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      await user.click(cancelButton);

      expect(screen.queryByText("Select Group")).not.toBeInTheDocument();
    });

    test("should attach group successfully", async () => {
      vi.mocked(groupService.getServerGroups)
        .mockResolvedValueOnce(ok([]))
        .mockResolvedValueOnce(ok([])); // After attachment
      vi.mocked(groupService.getGroups).mockResolvedValue(
        ok(mockAvailableGroups)
      );
      vi.mocked(groupService.attachGroupToServer).mockResolvedValue(
        ok(undefined)
      );

      render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(screen.getByText("Attach Group")).toBeInTheDocument();
      });

      const attachButton = screen.getByRole("button", { name: "Attach Group" });
      await user.click(attachButton);

      const groupSelect = screen.getByRole("combobox");
      await user.selectOptions(groupSelect, "3");

      const priorityInput = screen.getByLabelText("Priority");
      await user.clear(priorityInput);
      await user.type(priorityInput, "15");

      const submitButton = screen.getByRole("button", { name: "Attach" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(groupService.attachGroupToServer).toHaveBeenCalledWith(3, {
          server_id: 1,
          priority: 15,
        });
      });

      expect(screen.queryByText("Select Group")).not.toBeInTheDocument();
    });

    test("should handle attach group error", async () => {
      vi.mocked(groupService.getServerGroups).mockResolvedValue(ok([]));
      vi.mocked(groupService.getGroups).mockResolvedValue(
        ok(mockAvailableGroups)
      );
      vi.mocked(groupService.attachGroupToServer).mockResolvedValue(
        err({ message: "Failed to attach group", status: 500 })
      );

      render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(screen.getByText("Attach Group")).toBeInTheDocument();
      });

      const attachButton = screen.getByRole("button", { name: "Attach Group" });
      await user.click(attachButton);

      const groupSelect = screen.getByRole("combobox");
      await user.selectOptions(groupSelect, "3");

      const submitButton = screen.getByRole("button", { name: "Attach" });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Failed to attach group")).toBeInTheDocument();
      });
    });

    test("should disable attach button when no group selected", async () => {
      vi.mocked(groupService.getServerGroups).mockResolvedValue(ok([]));
      vi.mocked(groupService.getGroups).mockResolvedValue(
        ok(mockAvailableGroups)
      );

      render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(screen.getByText("Attach Group")).toBeInTheDocument();
      });

      const attachButton = screen.getByRole("button", { name: "Attach Group" });
      await user.click(attachButton);

      const submitButton = screen.getByRole("button", { name: "Attach" });
      expect(submitButton).toBeDisabled();
    });

    test("should handle priority input changes", async () => {
      vi.mocked(groupService.getServerGroups).mockResolvedValue(ok([]));
      vi.mocked(groupService.getGroups).mockResolvedValue(
        ok(mockAvailableGroups)
      );

      render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(screen.getByText("Attach Group")).toBeInTheDocument();
      });

      const attachButton = screen.getByRole("button", { name: "Attach Group" });
      await user.click(attachButton);

      const priorityInput = screen.getByLabelText("Priority");
      await user.clear(priorityInput);
      await user.type(priorityInput, "abc"); // Non-numeric input

      expect(priorityInput).toHaveValue(0);

      await user.clear(priorityInput);
      await user.type(priorityInput, "50");

      expect(priorityInput).toHaveValue(50);
    });
  });
});
