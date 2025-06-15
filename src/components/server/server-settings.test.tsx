import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ServerSettings } from "./server-settings";
import * as serverService from "@/services/server";
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
};

const mockT = vi.fn((key: string) => translations[key] || key);
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
vi.mock("@/services/server", () => ({
  updateServer: vi.fn(),
}));

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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should render server settings form with current values", () => {
    render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

    expect(screen.getByText("Server Settings")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test Server")).toBeInTheDocument();
    expect(screen.getByDisplayValue("A test server")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2048")).toBeInTheDocument();
    expect(screen.getByDisplayValue("20")).toBeInTheDocument();
  });

  test("should render read-only fields correctly", () => {
    render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

    expect(screen.getByText("1.21.5")).toBeInTheDocument();
    expect(screen.getByText("vanilla")).toBeInTheDocument();
    expect(screen.getByText("25565")).toBeInTheDocument();
    expect(screen.getByText("1/1/2025")).toBeInTheDocument();
  });

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
    const saveButton = screen.getByRole("button", { name: /Save Settings/i });
    expect(saveButton).not.toBeDisabled();
  });

  test("should enable save button when changes are made", async () => {
    render(<ServerSettings server={mockServer} onUpdate={mockOnUpdate} />);

    const nameInput = screen.getByDisplayValue("Test Server");
    const saveButton = screen.getByRole("button", { name: /Save Settings/i });
    const resetButton = screen.getByRole("button", { name: /Reset Changes/i });

    // Initially buttons should be disabled
    expect(saveButton).toBeDisabled();
    expect(resetButton).toBeDisabled();

    // Make a change
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Server");

    // Buttons should be enabled
    expect(saveButton).not.toBeDisabled();
    expect(resetButton).not.toBeDisabled();
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

    const saveButton = screen.getByRole("button", { name: /Save Settings/i });
    await user.click(saveButton);

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

    const saveButton = screen.getByRole("button", { name: /Save Settings/i });
    await user.click(saveButton);

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

    // Reset
    const resetButton = screen.getByRole("button", { name: /Reset Changes/i });
    await user.click(resetButton);

    expect(nameInput).toHaveValue("Test Server");
    expect(memoryInput).toHaveValue(2048);

    // Buttons should be disabled again
    expect(resetButton).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /Save Settings/i })
    ).toBeDisabled();
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

    const saveButton = screen.getByRole("button", { name: /Save Settings/i });
    await user.click(saveButton);

    // Form should be disabled during save
    expect(screen.getByRole("button", { name: /Saving/i })).toBeInTheDocument();
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

    const saveButton = screen.getByRole("button", { name: /Save Settings/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
    });
  });

  test("should handle server without description", () => {
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
  });

  test("should update form when server prop changes", () => {
    const { rerender } = render(
      <ServerSettings server={mockServer} onUpdate={mockOnUpdate} />
    );

    const updatedServer = { ...mockServer, name: "New Name", max_memory: 4096 };
    rerender(<ServerSettings server={updatedServer} onUpdate={mockOnUpdate} />);

    expect(screen.getByDisplayValue("New Name")).toBeInTheDocument();
    expect(screen.getByDisplayValue("4096")).toBeInTheDocument();
  });
});
