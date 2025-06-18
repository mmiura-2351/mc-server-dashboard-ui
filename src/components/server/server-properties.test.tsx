import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ServerPropertiesEditor } from "./server-properties";
import * as serverService from "@/services/server";
import { ok, err } from "neverthrow";

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

// Mock the server service
vi.mock("@/services/server", () => ({
  getServerProperties: vi.fn(),
  updateServerProperties: vi.fn(),
}));

// Mock the language context
const translations: Record<string, string> = {
  "servers.properties.loadingProperties": "Loading server properties...",
  "servers.properties.loadError": "Failed to load server properties",
  "servers.properties.noProperties": "No properties available",
  "servers.properties.title": "Server Properties",
  "servers.properties.description":
    "Configure your Minecraft server settings. Changes will be applied after server restart.",
  "servers.properties.fileNotFound":
    "Properties file was not found, showing default values.",
  "servers.properties.guidance":
    'All properties are editable as text values. Boolean values should be "true" or "false", numbers as digits, and text as-is. Refer to the descriptions for guidance.',
  "servers.properties.resetChanges": "Reset Changes",
  "servers.properties.saveProperties": "Save Properties",
  "servers.properties.createFile": "Create Properties File",
  "servers.properties.saving": "Saving...",
  "servers.properties.noChanges": "No changes to save",
  "servers.properties.updated": "Server properties updated successfully",
  "servers.properties.labels.server-port": "Server Port",
  "servers.properties.labels.max-players": "Max Players",
  "servers.properties.labels.difficulty": "Difficulty",
  "servers.properties.labels.gamemode": "Game Mode",
  "servers.properties.descriptions.server-port":
    "Port number for the server (default: 25565)",
  "servers.properties.descriptions.max-players":
    "Maximum number of players that can join the server",
  "servers.properties.descriptions.difficulty":
    "Difficulty level: peaceful, easy, normal, hard",
  "servers.properties.descriptions.gamemode":
    "Default game mode: survival, creative, adventure, spectator",
  "servers.properties.descriptions.motd":
    "Message of the day shown in server list",
  "servers.fileNotFoundMessage":
    "Server properties file not found. This is normal for new servers that haven't been started yet.",
  "common.true": "True",
  "common.false": "False",
  "servers.enterPlaceholder": "Enter {label}",
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
  useTranslation: () => ({ t: mockT }),
}));

describe("ServerPropertiesEditor", () => {
  const user = userEvent.setup();
  const mockServerProperties = {
    "server-port": 25565,
    "max-players": 20,
    difficulty: "normal",
    gamemode: "survival",
    pvp: true,
    motd: "A Minecraft Server",
    "online-mode": true,
    "allow-flight": false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should render loading state initially", () => {
    vi.mocked(serverService.getServerProperties).mockImplementation(
      () => new Promise(() => {}) // Never resolves to keep loading state
    );

    render(<ServerPropertiesEditor serverId={1} />);

    expect(
      screen.getByText("Loading server properties...")
    ).toBeInTheDocument();
  });

  test("should render properties form after successful load", async () => {
    vi.mocked(serverService.getServerProperties).mockResolvedValueOnce(
      ok(mockServerProperties)
    );

    render(<ServerPropertiesEditor serverId={1} />);

    await waitFor(() => {
      expect(
        screen.getAllByRole("heading", { name: "Server Properties" })[0]
      ).toBeInTheDocument();
    });

    // Check that form fields are rendered
    expect(screen.getByDisplayValue("25565")).toBeInTheDocument(); // server-port
    expect(screen.getByDisplayValue("20")).toBeInTheDocument(); // max-players
    expect(screen.getByDisplayValue("normal")).toBeInTheDocument(); // difficulty
    expect(screen.getByDisplayValue("A Minecraft Server")).toBeInTheDocument(); // motd
  });

  test("should render properties in alphabetical order", async () => {
    vi.mocked(serverService.getServerProperties).mockResolvedValueOnce(
      ok(mockServerProperties)
    );

    render(<ServerPropertiesEditor serverId={1} />);

    await waitFor(() => {
      expect(
        screen.getAllByRole("heading", { name: "Server Properties" })[0]
      ).toBeInTheDocument();
    });

    const labels = screen.getAllByText(/^[A-Z]/, { selector: "label" });
    const labelTexts = labels.map(
      (label) => label.textContent?.split("(")[0]?.trim() || ""
    );

    // Check that some properties are in alphabetical order
    const allowFlightIndex = labelTexts.findIndex((text) =>
      text.includes("Allow Flight")
    );
    const difficultyIndex = labelTexts.findIndex((text) =>
      text.includes("Difficulty")
    );
    const maxPlayersIndex = labelTexts.findIndex((text) =>
      text.includes("Max Players")
    );

    expect(allowFlightIndex).toBeLessThan(difficultyIndex);
    expect(difficultyIndex).toBeLessThan(maxPlayersIndex);
  });

  test("should show property descriptions", async () => {
    vi.mocked(serverService.getServerProperties).mockResolvedValueOnce(
      ok(mockServerProperties)
    );

    render(<ServerPropertiesEditor serverId={1} />);

    await waitFor(() => {
      expect(
        screen.getAllByRole("heading", { name: "Server Properties" })[0]
      ).toBeInTheDocument();
    });

    // Check for description text
    expect(
      screen.getByText(/Difficulty level: peaceful, easy, normal, hard/)
    ).toBeInTheDocument();
    expect(screen.getByText(/Maximum number of players/)).toBeInTheDocument();
    expect(
      screen.getByText(/Message of the day shown in server list/)
    ).toBeInTheDocument();
  });

  test("should handle input changes", async () => {
    vi.mocked(serverService.getServerProperties).mockResolvedValueOnce(
      ok(mockServerProperties)
    );

    render(<ServerPropertiesEditor serverId={1} />);

    await waitFor(() => {
      expect(
        screen.getAllByRole("heading", { name: "Server Properties" })[0]
      ).toBeInTheDocument();
    });

    // Find and change the max-players field
    const maxPlayersInput = screen.getByDisplayValue("20");
    await user.clear(maxPlayersInput);
    await user.type(maxPlayersInput, "50");

    expect(maxPlayersInput).toHaveValue("50");

    // Check that save button becomes enabled
    const saveButton = screen.getByRole("button", { name: /save properties/i });
    expect(saveButton).not.toBeDisabled();
  });

  test("should save properties successfully", async () => {
    vi.mocked(serverService.getServerProperties).mockResolvedValueOnce(
      ok(mockServerProperties)
    );
    vi.mocked(serverService.updateServerProperties).mockResolvedValueOnce(
      ok(undefined)
    );

    render(<ServerPropertiesEditor serverId={1} />);

    await waitFor(() => {
      expect(
        screen.getAllByRole("heading", { name: "Server Properties" })[0]
      ).toBeInTheDocument();
    });

    // Change a property
    const maxPlayersInput = screen.getByDisplayValue("20");
    await user.clear(maxPlayersInput);
    await user.type(maxPlayersInput, "50");

    // Submit the form
    const saveButton = screen.getByRole("button", { name: /save properties/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(
        screen.getByText("Server properties updated successfully")
      ).toBeInTheDocument();
    });

    // Verify the service was called with correct data
    expect(serverService.updateServerProperties).toHaveBeenCalledWith(1, {
      "max-players": "50",
    });
  });

  test("should handle save errors", async () => {
    vi.mocked(serverService.getServerProperties).mockResolvedValueOnce(
      ok(mockServerProperties)
    );
    vi.mocked(serverService.updateServerProperties).mockResolvedValueOnce(
      err({ message: "Failed to save properties", status: 500 })
    );

    render(<ServerPropertiesEditor serverId={1} />);

    await waitFor(() => {
      expect(
        screen.getAllByRole("heading", { name: "Server Properties" })[0]
      ).toBeInTheDocument();
    });

    // Change a property
    const maxPlayersInput = screen.getByDisplayValue("20");
    await user.clear(maxPlayersInput);
    await user.type(maxPlayersInput, "50");

    // Submit the form
    const saveButton = screen.getByRole("button", { name: /save properties/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("Failed to save properties")).toBeInTheDocument();
    });
  });

  test("should reset changes", async () => {
    vi.mocked(serverService.getServerProperties).mockResolvedValueOnce(
      ok(mockServerProperties)
    );

    render(<ServerPropertiesEditor serverId={1} />);

    await waitFor(() => {
      expect(
        screen.getAllByRole("heading", { name: "Server Properties" })[0]
      ).toBeInTheDocument();
    });

    // Change a property
    const maxPlayersInput = screen.getByDisplayValue("20");
    await user.clear(maxPlayersInput);
    await user.type(maxPlayersInput, "50");

    // Reset changes
    const resetButton = screen.getByRole("button", { name: /reset changes/i });
    await user.click(resetButton);

    // Check that value is reset
    expect(maxPlayersInput).toHaveValue("20");

    // Check that buttons are disabled again
    expect(resetButton).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /save properties/i })
    ).toBeDisabled();
  });

  test("should show error state when properties fail to load", async () => {
    vi.mocked(serverService.getServerProperties).mockResolvedValueOnce(
      err({ message: "Internal server error", status: 500 })
    );

    render(<ServerPropertiesEditor serverId={1} />);

    await waitFor(() => {
      expect(
        screen.getByText(
          /Failed to load server properties.*Internal server error/
        )
      ).toBeInTheDocument();
    });
  });

  test("should show file not found warning for new servers", async () => {
    vi.mocked(serverService.getServerProperties).mockResolvedValueOnce(
      err({ message: "server.properties file not found", status: 404 })
    );

    render(<ServerPropertiesEditor serverId={1} />);

    await waitFor(() => {
      expect(
        screen.getByText(
          /This is normal for new servers that haven't been started yet/
        )
      ).toBeInTheDocument();
    });

    // Should show default properties
    await waitFor(() => {
      expect(screen.getByDisplayValue("25565")).toBeInTheDocument(); // default server-port
    });

    // Save button should show "Create Properties File"
    expect(
      screen.getByRole("button", { name: /create properties file/i })
    ).toBeInTheDocument();
  });

  test("should handle authentication errors by logging out", async () => {
    vi.mocked(serverService.getServerProperties).mockResolvedValueOnce(
      err({ message: "Unauthorized", status: 401 })
    );

    render(<ServerPropertiesEditor serverId={1} />);

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
    });
  });

  test("should disable form during save operation", async () => {
    vi.mocked(serverService.getServerProperties).mockResolvedValueOnce(
      ok(mockServerProperties)
    );

    // Mock a slow update operation
    vi.mocked(serverService.updateServerProperties).mockImplementation(
      () =>
        new Promise((resolve) => setTimeout(() => resolve(ok(undefined)), 100))
    );

    render(<ServerPropertiesEditor serverId={1} />);

    await waitFor(() => {
      expect(
        screen.getAllByRole("heading", { name: "Server Properties" })[0]
      ).toBeInTheDocument();
    });

    // Change a property
    const maxPlayersInput = screen.getByDisplayValue("20");
    await user.clear(maxPlayersInput);
    await user.type(maxPlayersInput, "50");

    // Start save operation
    const saveButton = screen.getByRole("button", { name: /save properties/i });
    await user.click(saveButton);

    // Check that form is disabled during save
    expect(screen.getByRole("button", { name: /saving/i })).toBeInTheDocument();
    expect(maxPlayersInput).toBeDisabled();

    // Wait for save to complete
    await waitFor(() => {
      expect(
        screen.getByText("Server properties updated successfully")
      ).toBeInTheDocument();
    });

    // Form should be enabled again
    expect(maxPlayersInput).not.toBeDisabled();
  });

  test("should handle boolean values with select boxes", async () => {
    vi.mocked(serverService.getServerProperties).mockResolvedValueOnce(
      ok(mockServerProperties)
    );

    render(<ServerPropertiesEditor serverId={1} />);

    await waitFor(() => {
      expect(
        screen.getAllByRole("heading", { name: "Server Properties" })[0]
      ).toBeInTheDocument();
    });

    // Find the pvp field specifically by ID (boolean value should be displayed as select)
    const pvpSelect = document.getElementById("pvp") as HTMLSelectElement;
    expect(pvpSelect).toBeInTheDocument();
    expect(pvpSelect.tagName).toBe("SELECT");
    expect(pvpSelect.value).toBe("true");

    // Change to false using select
    await user.selectOptions(pvpSelect, "false");

    expect(pvpSelect).toHaveValue("false");
  });

  test("should correctly display false boolean values in select dropdowns", async () => {
    const propertiesWithFalseValues = {
      ...mockServerProperties,
      "allow-flight": false,
      "white-list": false,
      hardcore: false,
      pvp: true, // Mix of true and false
    };

    vi.mocked(serverService.getServerProperties).mockResolvedValueOnce(
      ok(propertiesWithFalseValues)
    );

    render(<ServerPropertiesEditor serverId={1} />);

    await waitFor(() => {
      expect(
        screen.getAllByRole("heading", { name: "Server Properties" })[0]
      ).toBeInTheDocument();
    });

    // Test that false values are correctly displayed as "false" in select dropdowns
    const allowFlightSelect = document.getElementById(
      "allow-flight"
    ) as HTMLSelectElement;
    expect(allowFlightSelect).toBeInTheDocument();
    expect(allowFlightSelect.tagName).toBe("SELECT");
    expect(allowFlightSelect.value).toBe("false"); // Should show "false", not "true"

    const whiteListSelect = document.getElementById(
      "white-list"
    ) as HTMLSelectElement;
    expect(whiteListSelect).toBeInTheDocument();
    expect(whiteListSelect.value).toBe("false");

    const hardcoreSelect = document.getElementById(
      "hardcore"
    ) as HTMLSelectElement;
    expect(hardcoreSelect).toBeInTheDocument();
    expect(hardcoreSelect.value).toBe("false");

    // Test that true values still work correctly
    const pvpSelect = document.getElementById("pvp") as HTMLSelectElement;
    expect(pvpSelect).toBeInTheDocument();
    expect(pvpSelect.value).toBe("true");
  });

  test("should show guidance text for value formats", async () => {
    vi.mocked(serverService.getServerProperties).mockResolvedValueOnce(
      ok(mockServerProperties)
    );

    render(<ServerPropertiesEditor serverId={1} />);

    await waitFor(() => {
      expect(
        screen.getAllByRole("heading", { name: "Server Properties" })[0]
      ).toBeInTheDocument();
    });

    // Check for guidance text
    expect(
      screen.getByText(/Boolean values should be "true" or "false"/)
    ).toBeInTheDocument();
    expect(screen.getByText(/numbers as digits/)).toBeInTheDocument();
  });
});
