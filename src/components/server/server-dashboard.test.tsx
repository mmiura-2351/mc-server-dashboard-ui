import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ServerDashboard } from "./server-dashboard";
import * as serverService from "@/services/server";
import { ok, err } from "neverthrow";
import { ServerType, ServerStatus } from "@/types/server";
import type { MinecraftServer } from "@/types/server";

// Mock functions
const mockLogout = vi.fn();
const mockPush = vi.fn();

// Create mock auth context
const mockAuthContext = {
  user: {
    id: 1,
    username: "testuser",
    email: "test@example.com",
    is_active: true,
    is_approved: true,
    role: "user",
  },
  login: vi.fn(),
  logout: mockLogout,
  register: vi.fn(),
  updateUserInfo: vi.fn(),
  updatePassword: vi.fn(),
  deleteAccount: vi.fn(),
  isLoading: false,
  isAuthenticated: true,
};

// Mock translation function
const mockTranslations: Record<string, string> = {
  "servers.title": "Minecraft Servers",
  "servers.createServer": "Create Server",
  "servers.loadingServers": "Loading servers...",
  "servers.noServersFound": "No servers found",
  "servers.createFirstServer":
    "Create your first Minecraft server to get started!",
  "servers.clickToManage": "Click to manage",
  "servers.fields.version": "Version",
  "servers.fields.type": "Type",
  "servers.fields.players": "Players",
  "servers.fields.memory": "Memory",
  "servers.fields.port": "Port",
  "servers.status.running": "Running",
  "servers.status.stopped": "Stopped",
  "servers.status.starting": "Starting...",
  "servers.status.stopping": "Stopping...",
  "servers.status.error": "Error",
  "servers.status.unknown": "Unknown",
  "servers.create.title": "Create New Server",
  "servers.create.serverName": "Server Name",
  "servers.create.defaultName": "My Minecraft Server",
  "servers.create.minecraftVersion": "Minecraft Version",
  "servers.create.serverType": "Server Type",
  "servers.create.memory": "Memory (MB)",
  "servers.create.description": "Description (Optional)",
  "servers.create.descriptionPlaceholder": "Describe your server...",
  "servers.create.creating": "Creating...",
  "servers.create.createButton": "Create Server",
  "servers.create.loadingVersions": "Loading versions...",
  "servers.create.noVersionsAvailable": "No versions available",
  "servers.create.errors.failedToLoadVersions":
    "Failed to load versions, using fallback list",
  "servers.import.title": "Import Server",
  "servers.filters.title": "Filters",
  "servers.filters.type.label": "Server Type",
  "servers.filters.type.all": "All",
  "servers.filters.type.vanilla": "Vanilla",
  "servers.filters.type.paper": "Paper",
  "servers.filters.type.forge": "Forge",
  "servers.filters.status.label": "Server Status",
  "servers.filters.status.all": "All",
  "servers.filters.status.running": "Running",
  "servers.filters.status.stopped": "Stopped",
  "servers.filters.status.starting": "Starting",
  "servers.filters.status.stopping": "Stopping",
  "servers.filters.status.error": "Error",
  "servers.filters.search.label": "Search Servers",
  "servers.filters.search.placeholder": "Search by server name...",
  "servers.filters.resultsCount": "Showing {count} of {total} servers",
  "common.cancel": "Cancel",
  "errors.generic": "Failed to load data",
};

const mockT = vi.fn((key: string, params?: Record<string, string>) => {
  let translation = mockTranslations[key] || key;
  if (params) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      translation = translation.replace(`{${paramKey}}`, paramValue);
    });
  }
  return translation;
});

// Mock modules
vi.mock("@/contexts/auth", () => ({
  useAuth: () => mockAuthContext,
}));

vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({ t: mockT, locale: "en" }),
}));

// Use the existing mock from test setup, but override push function
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useParams: () => ({ id: "1" }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock the server service
vi.mock("@/services/server", () => ({
  getServers: vi.fn(),
  getServerTemplates: vi.fn(),
  createServer: vi.fn(),
  getSupportedVersions: vi.fn(),
}));

describe("ServerDashboard", () => {
  const user = userEvent.setup();

  // Mock server data
  const mockServers: MinecraftServer[] = [
    {
      id: 1,
      name: "Test Server 1",
      description: "A test server",
      minecraft_version: "1.21.5",
      server_type: ServerType.VANILLA,
      status: ServerStatus.RUNNING,
      directory_path: "/servers/test1",
      port: 25565,
      max_memory: 2048,
      max_players: 20,
      owner_id: 1,
      template_id: null,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
      process_info: null,
      configurations: [],
    },
    {
      id: 2,
      name: "Test Server 2",
      description: null,
      minecraft_version: "1.20.6",
      server_type: ServerType.PAPER,
      status: ServerStatus.STOPPED,
      directory_path: "/servers/test2",
      port: 25566,
      max_memory: 4096,
      max_players: 50,
      owner_id: 1,
      template_id: null,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
      process_info: null,
      configurations: [],
    },
  ];

  const mockNewServer: MinecraftServer = {
    id: 3,
    name: "New Server",
    description: "A new server",
    minecraft_version: "1.21.5",
    server_type: ServerType.VANILLA,
    status: ServerStatus.STOPPED,
    directory_path: "/servers/new",
    port: 25567,
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

    // Reset auth context to authenticated user
    Object.assign(mockAuthContext, {
      user: {
        id: 1,
        username: "testuser",
        email: "test@example.com",
        is_active: true,
        is_approved: true,
        role: "user",
      },
      isLoading: false,
      isAuthenticated: true,
    });

    // Default successful service responses
    vi.mocked(serverService.getServers).mockResolvedValue(ok(mockServers));
    vi.mocked(serverService.getServerTemplates).mockResolvedValue(ok([]));
    vi.mocked(serverService.createServer).mockResolvedValue(ok(mockNewServer));
    vi.mocked(serverService.getSupportedVersions).mockResolvedValue(
      ok(["1.21.5", "1.21.4", "1.21.3", "1.21.2", "1.21.1", "1.21", "1.20.6"])
    );
  });

  describe("Component Rendering", () => {
    test("renders dashboard with servers", async () => {
      render(<ServerDashboard />);

      // Check header elements
      expect(screen.getByText("Minecraft Servers")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Create Server" })
      ).toBeInTheDocument();

      // Wait for servers to load
      await waitFor(() => {
        expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      });

      expect(screen.getByText("Test Server 2")).toBeInTheDocument();
    });

    test("renders loading state initially", async () => {
      // Mock delayed responses to ensure loading state is visible
      vi.mocked(serverService.getServers).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(ok(mockServers)), 100)
          )
      );
      vi.mocked(serverService.getServerTemplates).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(ok([])), 100))
      );

      await act(async () => {
        render(<ServerDashboard />);
      });

      expect(screen.getByText("Loading servers...")).toBeInTheDocument();

      // Wait for the loading to complete to avoid cleanup warnings
      await waitFor(
        () => {
          expect(
            screen.queryByText("Loading servers...")
          ).not.toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    test("renders empty state when no servers", async () => {
      vi.mocked(serverService.getServers).mockResolvedValue(ok([]));

      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("No servers found")).toBeInTheDocument();
      });

      expect(
        screen.getByText("Create your first Minecraft server to get started!")
      ).toBeInTheDocument();
      expect(screen.getAllByText("Create Server")).toHaveLength(2); // Header button + empty state button
    });

    test("renders nothing when no user", async () => {
      Object.assign(mockAuthContext, { user: null });

      let container: HTMLElement;
      await act(async () => {
        const result = render(<ServerDashboard />);
        container = result.container;
      });

      expect(container!.firstChild).toBeNull();
    });
  });

  describe("Server Display", () => {
    test("displays server information correctly", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      });

      // Check server 1 details - use getAllByText since "Running" appears in filter too
      expect(screen.getAllByText("Running")).toHaveLength(2); // One in filter, one in server status
      expect(screen.getByText("1.21.5")).toBeInTheDocument();
      expect(screen.getByText("vanilla")).toBeInTheDocument();
      expect(screen.getByText("0/20")).toBeInTheDocument();
      expect(screen.getByText("2048MB")).toBeInTheDocument();
      expect(screen.getByText("25565")).toBeInTheDocument();
      expect(screen.getByText("A test server")).toBeInTheDocument();

      // Check server 2 details
      expect(screen.getByText("Test Server 2")).toBeInTheDocument();
      expect(screen.getAllByText("Stopped")).toHaveLength(2); // One in filter, one in server status
      expect(screen.getByText("1.20.6")).toBeInTheDocument();
      expect(screen.getByText("paper")).toBeInTheDocument();
      expect(screen.getByText("0/50")).toBeInTheDocument();
      expect(screen.getByText("4096MB")).toBeInTheDocument();
      expect(screen.getByText("25566")).toBeInTheDocument();

      // Server 2 has no description, so it shouldn't appear
      expect(screen.queryByText("A test server")).toBeInTheDocument(); // Only server 1 has this description
    });

    test("applies correct status styles", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      });

      // Find status elements by their parent server cards
      const server1Card = screen
        .getByText("Test Server 1")
        .closest('[class*="serverCard"]');
      const server2Card = screen
        .getByText("Test Server 2")
        .closest('[class*="serverCard"]');

      const runningStatus = server1Card?.querySelector('[class*="status"]');
      const stoppedStatus = server2Card?.querySelector('[class*="status"]');

      // CSS modules create hashed class names, so we need to check partial class names
      expect(runningStatus?.className).toContain("statusRunning");
      expect(stoppedStatus?.className).toContain("statusStopped");
    });

    test("handles different server statuses", async () => {
      const serversWithDifferentStatuses: MinecraftServer[] = [
        { ...mockServers[0], status: ServerStatus.STARTING } as MinecraftServer,
        { ...mockServers[1], status: ServerStatus.STOPPING } as MinecraftServer,
        {
          ...mockServers[0],
          id: 3,
          name: "Error Server",
          status: ServerStatus.ERROR,
        } as MinecraftServer,
      ];

      vi.mocked(serverService.getServers).mockResolvedValue(
        ok(serversWithDifferentStatuses)
      );
      vi.mocked(serverService.getServerTemplates).mockResolvedValue(ok([]));

      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Starting...")).toBeInTheDocument(); // Server status
      });

      expect(screen.getByText("Stopping...")).toBeInTheDocument(); // Server status
      expect(screen.getAllByText("Error")).toHaveLength(2); // Filter and server status (same text)
    });
  });

  describe("Server Navigation", () => {
    test("navigates to server detail when card is clicked", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      });

      // Click on the server card by finding an element that contains the server name
      const serverCard = screen
        .getByText("Test Server 1")
        .closest('div[class*="serverCard"]');
      expect(serverCard).toBeInTheDocument();
      if (serverCard) {
        await user.click(serverCard);
      } else {
        throw new Error("Server card not found");
      }

      expect(mockPush).toHaveBeenCalledWith("/servers/1");
    });

    test("navigates to correct server when multiple servers present", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Test Server 2")).toBeInTheDocument();
      });

      const serverCard2 = screen
        .getByText("Test Server 2")
        .closest('div[class*="serverCard"]');
      expect(serverCard2).toBeInTheDocument();
      if (serverCard2) {
        await user.click(serverCard2);
      } else {
        throw new Error("Server card not found");
      }

      expect(mockPush).toHaveBeenCalledWith("/servers/2");
    });
  });

  describe("Create Server Modal", () => {
    test("opens create server modal when button is clicked", async () => {
      render(<ServerDashboard />);

      const createButton = screen.getByRole("button", {
        name: "Create Server",
      });
      await user.click(createButton);

      expect(screen.getAllByText("Create New Server")).toHaveLength(2); // Header and tab
      expect(screen.getByLabelText("Server Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Minecraft Version")).toBeInTheDocument();
      expect(document.getElementById("createServerType")).toBeInTheDocument(); // Server type select in modal
      expect(screen.getByLabelText("Memory (MB)")).toBeInTheDocument();
      expect(
        screen.getByLabelText("Description (Optional)")
      ).toBeInTheDocument();
    });

    test("opens modal from empty state button", async () => {
      vi.mocked(serverService.getServers).mockResolvedValue(ok([]));

      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("No servers found")).toBeInTheDocument();
      });

      const createButtons = screen.getAllByText("Create Server");
      const emptyStateButton = createButtons[1]; // Empty state button
      if (!emptyStateButton) {
        throw new Error("Empty state button not found");
      }
      await user.click(emptyStateButton);

      expect(screen.getAllByText("Create New Server")).toHaveLength(2); // Header and tab
    });

    test("closes modal when close button is clicked", async () => {
      render(<ServerDashboard />);

      const createButton = screen.getByRole("button", {
        name: "Create Server",
      });
      await user.click(createButton);

      expect(screen.getAllByText("Create New Server")).toHaveLength(2); // Header and tab

      const closeButton = screen.getByRole("button", { name: "×" });
      await user.click(closeButton);

      expect(screen.queryByText("Create New Server")).not.toBeInTheDocument();
    });

    test("closes modal when cancel button is clicked", async () => {
      render(<ServerDashboard />);

      const createButton = screen.getByRole("button", {
        name: "Create Server",
      });
      await user.click(createButton);

      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      await user.click(cancelButton);

      expect(screen.queryByText("Create New Server")).not.toBeInTheDocument();
    });
  });

  describe("Create Server Form", () => {
    beforeEach(async () => {
      render(<ServerDashboard />);
      const createButton = screen.getByRole("button", {
        name: "Create Server",
      });
      await user.click(createButton);
    });

    test("renders form with default values", () => {
      expect(screen.getByLabelText("Server Name")).toHaveValue(""); // Server name input (empty)

      // Check select values using the select elements themselves
      const versionSelect = screen.getByLabelText("Minecraft Version");
      expect((versionSelect as HTMLSelectElement).value).toBe("1.21.5");

      const typeSelect = document.getElementById(
        "createServerType"
      ) as HTMLSelectElement;
      expect(typeSelect.value).toBe("vanilla");

      const memorySelect = screen.getByLabelText("Memory (MB)");
      expect((memorySelect as HTMLSelectElement).value).toBe("2048");

      expect(screen.getByRole("textbox", { name: /description/i })).toHaveValue(
        ""
      ); // Empty description
    });

    test("renders all Minecraft versions in select", async () => {
      // Wait for versions to load
      await waitFor(() => {
        expect(serverService.getSupportedVersions).toHaveBeenCalled();
      });

      // Test a few key versions from our mock
      expect(
        screen.getByRole("option", { name: "1.21.5" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "1.21.4" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "1.20.6" })
      ).toBeInTheDocument();
    });

    test("renders all server types in select", () => {
      // Check options within the create form specifically
      const createServerTypeSelect =
        document.getElementById("createServerType");
      expect(createServerTypeSelect).toBeInTheDocument();

      const options = Array.from(
        createServerTypeSelect!.querySelectorAll("option")
      );
      const optionTexts = options.map((option) => option.textContent);

      expect(optionTexts).toContain("Vanilla");
      expect(optionTexts).toContain("Paper");
      expect(optionTexts).toContain("Forge");
    });

    test("renders all memory options in select", () => {
      expect(
        screen.getByRole("option", { name: "1GB (1024MB)" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "2GB (2048MB)" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "4GB (4096MB)" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "8GB (8192MB)" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "16GB (16384MB)" })
      ).toBeInTheDocument();
    });

    test("updates form values when inputs change", async () => {
      const serverNameInput = screen.getByLabelText("Server Name");
      const versionSelect = screen.getByLabelText("Minecraft Version");
      const typeSelect = document.getElementById(
        "createServerType"
      ) as HTMLSelectElement;
      const memorySelect = screen.getByLabelText("Memory (MB)");
      const descriptionInput = screen.getByLabelText("Description (Optional)");

      await user.type(serverNameInput, "My Test Server");
      await user.selectOptions(versionSelect, "1.20.6");
      await user.selectOptions(typeSelect, ServerType.PAPER);
      await user.selectOptions(memorySelect, "4096");
      await user.type(descriptionInput, "Test description");

      expect(serverNameInput).toHaveValue("My Test Server");
      expect(versionSelect).toHaveValue("1.20.6");
      expect(typeSelect).toHaveValue("paper");
      expect(memorySelect).toHaveValue("4096");
      expect(descriptionInput).toHaveValue("Test description");
    });

    test("requires server name for form submission", async () => {
      // HTML5 form validation should prevent submission without required name field
      const nameInput = screen.getByLabelText("Server Name");
      expect(nameInput).toBeRequired();

      // We can't easily test HTML5 validation in JSDOM, so just verify the field is required
      expect(nameInput.hasAttribute("required")).toBe(true);
    });
  });

  describe("Server Creation", () => {
    beforeEach(async () => {
      render(<ServerDashboard />);
      const createButton = screen.getByRole("button", {
        name: "Create Server",
      });
      await user.click(createButton);
    });

    test("creates server successfully", async () => {
      const serverNameInput = screen.getByLabelText("Server Name");
      const descriptionInput = screen.getByLabelText("Description (Optional)");

      await user.type(serverNameInput, "New Server");
      await user.type(descriptionInput, "A new server");

      // Find the form submit button specifically
      const formSubmitButton = Array.from(
        screen.getAllByRole("button", { name: "Create Server" })
      ).find((button) => button.getAttribute("type") === "submit");
      await user.click(formSubmitButton!);

      const expectedRequest = {
        name: "New Server",
        minecraft_version: "1.21.5",
        server_type: ServerType.VANILLA,
        max_memory: 2048,
        description: "A new server",
      };

      expect(serverService.createServer).toHaveBeenCalledWith(expectedRequest);

      // Modal should close and server should be added to list
      await waitFor(() => {
        expect(screen.queryByText("Create New Server")).not.toBeInTheDocument();
      });

      expect(screen.getByText("New Server")).toBeInTheDocument();
    });

    test("creates server with custom settings", async () => {
      const serverNameInput = screen.getByLabelText("Server Name");
      const versionSelect = screen.getByLabelText("Minecraft Version");
      const typeSelect = document.getElementById(
        "createServerType"
      ) as HTMLSelectElement;
      const memorySelect = screen.getByLabelText("Memory (MB)");

      await user.type(serverNameInput, "Custom Server");
      await user.selectOptions(versionSelect, "1.20.6");
      await user.selectOptions(typeSelect, ServerType.PAPER);
      await user.selectOptions(memorySelect, "4096");

      // Find the form submit button specifically
      const formSubmitButton = Array.from(
        screen.getAllByRole("button", { name: "Create Server" })
      ).find((button) => button.getAttribute("type") === "submit");
      await user.click(formSubmitButton!);

      const expectedRequest = {
        name: "Custom Server",
        minecraft_version: "1.20.6",
        server_type: ServerType.PAPER,
        max_memory: 4096,
        description: undefined,
      };

      expect(serverService.createServer).toHaveBeenCalledWith(expectedRequest);
    });

    test("shows loading state during server creation", async () => {
      // Mock a delayed response
      vi.mocked(serverService.createServer).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(ok(mockNewServer)), 200)
          )
      );

      const serverNameInput = screen.getByLabelText("Server Name");
      await user.type(serverNameInput, "New Server");

      // Find the form submit button specifically
      const formSubmitButton = Array.from(
        screen.getAllByRole("button", { name: "Create Server" })
      ).find((button) => button.getAttribute("type") === "submit");
      await user.click(formSubmitButton!);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Creating..." })
        ).toBeInTheDocument();
      });

      expect(
        screen.getByRole("button", { name: "Creating..." })
      ).toBeDisabled();

      // Wait for creation to complete
      await waitFor(
        () => {
          expect(screen.queryByText("Creating...")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });

    test("resets form after successful creation", async () => {
      const serverNameInput = screen.getByLabelText("Server Name");
      const descriptionInput = screen.getByLabelText("Description (Optional)");

      await user.type(serverNameInput, "New Server");
      await user.type(descriptionInput, "A new server");

      // Find the form submit button specifically
      const formSubmitButton = Array.from(
        screen.getAllByRole("button", { name: "Create Server" })
      ).find((button) => button.getAttribute("type") === "submit");
      await user.click(formSubmitButton!);

      await waitFor(() => {
        expect(screen.queryByText("Create New Server")).not.toBeInTheDocument();
      });

      // Open modal again to check form reset
      const createButton = screen.getByRole("button", {
        name: "Create Server",
      });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getAllByText("Create New Server")).toHaveLength(2); // Header and tab
      });

      expect(screen.getByLabelText("Server Name")).toHaveValue("");
      expect(screen.getByLabelText("Description (Optional)")).toHaveValue("");

      // Check select values are reset to defaults
      const versionSelect = screen.getByLabelText("Minecraft Version");
      expect((versionSelect as HTMLSelectElement).value).toBe("1.21.5");

      const typeSelect = document.getElementById(
        "createServerType"
      ) as HTMLSelectElement;
      expect(typeSelect.value).toBe("vanilla");

      const memorySelect = screen.getByLabelText("Memory (MB)");
      expect((memorySelect as HTMLSelectElement).value).toBe("2048");
    });
  });

  describe("Error Handling", () => {
    test("displays error when server loading fails", async () => {
      vi.mocked(serverService.getServers).mockResolvedValue(
        err({ message: "Failed to load servers", status: 500 })
      );
      vi.mocked(serverService.getServerTemplates).mockResolvedValue(ok([]));

      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load servers")).toBeInTheDocument();
      });

      // Error should be dismissible
      const dismissButton = screen.getByRole("button", { name: "×" });
      await user.click(dismissButton);

      expect(
        screen.queryByText("Failed to load servers")
      ).not.toBeInTheDocument();
    });

    test("displays error when server creation fails", async () => {
      vi.mocked(serverService.createServer).mockResolvedValue(
        err({ message: "Failed to create server", status: 500 })
      );

      render(<ServerDashboard />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      });

      const createButton = screen.getByRole("button", {
        name: "Create Server",
      });
      await user.click(createButton);

      const serverNameInput = screen.getByLabelText("Server Name");
      await user.type(serverNameInput, "New Server");

      // Find the form submit button specifically
      const formSubmitButton = Array.from(
        screen.getAllByRole("button", { name: "Create Server" })
      ).find((button) => button.getAttribute("type") === "submit");
      await user.click(formSubmitButton!);

      await waitFor(() => {
        expect(screen.getByText("Failed to create server")).toBeInTheDocument();
      });

      // Modal should remain open (check for tab which is only visible when modal is open)
      expect(
        screen.getByRole("button", { name: "Create New Server" })
      ).toBeInTheDocument();
    });

    test("handles authentication errors during server loading", async () => {
      vi.mocked(serverService.getServers).mockResolvedValue(
        err({ message: "Unauthorized", status: 401 })
      );
      vi.mocked(serverService.getServerTemplates).mockResolvedValue(ok([]));

      render(<ServerDashboard />);

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });
    });

    test("handles authentication errors during server creation", async () => {
      vi.mocked(serverService.createServer).mockResolvedValue(
        err({ message: "Unauthorized", status: 401 })
      );

      render(<ServerDashboard />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      });

      const createButton = screen.getByRole("button", {
        name: "Create Server",
      });
      await user.click(createButton);

      const serverNameInput = screen.getByLabelText("Server Name");
      await user.type(serverNameInput, "New Server");

      // Find the form submit button specifically
      const formSubmitButton = Array.from(
        screen.getAllByRole("button", { name: "Create Server" })
      ).find((button) => button.getAttribute("type") === "submit");
      await user.click(formSubmitButton!);

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });
    });

    test("handles network errors gracefully", async () => {
      vi.mocked(serverService.getServers).mockRejectedValue(
        new Error("Network error")
      );
      vi.mocked(serverService.getServerTemplates).mockResolvedValue(ok([]));

      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load data")).toBeInTheDocument();
      });
    });

    test("disables create button during creation", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      });

      // First, open the modal
      const createButton = screen.getByRole("button", {
        name: "Create Server",
      });
      await user.click(createButton);

      // Mock a slow server creation
      vi.mocked(serverService.createServer).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(ok(mockNewServer)), 200)
          )
      );

      const serverNameInput = screen.getByLabelText("Server Name");
      await user.type(serverNameInput, "New Server");

      // Find the form submit button specifically
      const formSubmitButton = Array.from(
        screen.getAllByRole("button", { name: "Create Server" })
      ).find((button) => button.getAttribute("type") === "submit");
      await user.click(formSubmitButton!);

      // Modal submit button should show loading state
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Creating..." })
        ).toBeInTheDocument();
      });

      expect(
        screen.getByRole("button", { name: "Creating..." })
      ).toBeDisabled();

      // Wait for creation to complete
      await waitFor(
        () => {
          expect(screen.queryByText("Creating...")).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });
  });

  describe("Data Loading", () => {
    test("loads server data on component mount", async () => {
      await act(async () => {
        render(<ServerDashboard />);
      });

      expect(serverService.getServers).toHaveBeenCalled();
      expect(serverService.getServerTemplates).toHaveBeenCalled();

      // Wait for the async operations to complete
      await waitFor(() => {
        expect(
          screen.queryByText("Loading servers...")
        ).not.toBeInTheDocument();
      });
    });

    test("handles templates loading failure gracefully", async () => {
      vi.mocked(serverService.getServerTemplates).mockResolvedValue(
        err({ message: "Failed to load templates", status: 500 })
      );
      // Make sure servers still load successfully
      vi.mocked(serverService.getServers).mockResolvedValue(ok(mockServers));

      render(<ServerDashboard />);

      // Component should still render servers even if templates fail
      await waitFor(() => {
        expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      });

      // No error should be shown for template loading failure
      expect(
        screen.queryByText("Failed to load templates")
      ).not.toBeInTheDocument();
    });

    test("shows loading indicator while servers are being fetched", async () => {
      vi.mocked(serverService.getServers).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(ok(mockServers)), 100)
          )
      );

      render(<ServerDashboard />);

      expect(screen.getByText("Loading servers...")).toBeInTheDocument();

      // Wait for loading to complete
      await waitFor(
        () => {
          expect(
            screen.queryByText("Loading servers...")
          ).not.toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });

    test("hides loading indicator after data is loaded", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(
          screen.queryByText("Loading servers...")
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Status Display", () => {
    test("displays correct text for all server statuses", async () => {
      const statusTests = [
        {
          status: ServerStatus.RUNNING,
          text: "Running",
          filterText: "Running",
        },
        {
          status: ServerStatus.STOPPED,
          text: "Stopped",
          filterText: "Stopped",
        },
        {
          status: ServerStatus.STARTING,
          text: "Starting...",
          filterText: "Starting",
        },
        {
          status: ServerStatus.STOPPING,
          text: "Stopping...",
          filterText: "Stopping",
        },
        { status: ServerStatus.ERROR, text: "Error", filterText: "Error" },
      ];

      for (const { status, text, filterText } of statusTests) {
        const serverWithStatus = {
          ...mockServers[0],
          status,
        } as MinecraftServer;
        vi.mocked(serverService.getServers).mockResolvedValue(
          ok([serverWithStatus])
        );
        vi.mocked(serverService.getServerTemplates).mockResolvedValue(ok([]));

        const { unmount } = render(<ServerDashboard />);

        await waitFor(() => {
          // For status text that is the same in both filter and server status
          if (text === filterText) {
            expect(screen.getAllByText(text)).toHaveLength(2); // One in filter, one in server status
          } else {
            expect(screen.getByText(text)).toBeInTheDocument(); // Server status text
            expect(screen.getByText(filterText)).toBeInTheDocument(); // Filter option text
          }
        });

        unmount();
        vi.clearAllMocks();
        // Reset to default mocks for next iteration
        vi.mocked(serverService.getServers).mockResolvedValue(ok(mockServers));
        vi.mocked(serverService.getServerTemplates).mockResolvedValue(ok([]));
      }
    });

    test("handles unknown status gracefully", async () => {
      const serverWithUnknownStatus = {
        ...mockServers[0],
        status: "unknown" as ServerStatus,
      } as MinecraftServer;
      vi.mocked(serverService.getServers).mockResolvedValue(
        ok([serverWithUnknownStatus])
      );
      vi.mocked(serverService.getServerTemplates).mockResolvedValue(ok([]));

      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Unknown")).toBeInTheDocument();
      });
    });
  });

  describe("UI Interaction", () => {
    test("maintains create button state during form interaction", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      });

      const headerCreateButton = screen.getByRole("button", {
        name: "Create Server",
      });
      expect(headerCreateButton).not.toBeDisabled();

      // Open modal
      await user.click(headerCreateButton);

      // Header button should still be enabled while modal is open
      expect(headerCreateButton).not.toBeDisabled();
    });

    test("handles rapid modal open/close interactions", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      });

      const createButton = screen.getByRole("button", {
        name: "Create Server",
      });

      // Rapidly open and close modal
      await user.click(createButton);
      expect(screen.getAllByText("Create New Server")).toHaveLength(2); // Header and tab

      const closeButton = screen.getByRole("button", { name: "×" });
      await user.click(closeButton);
      expect(screen.queryByText("Create New Server")).not.toBeInTheDocument();

      // Open again
      await user.click(createButton);
      expect(screen.getAllByText("Create New Server")).toHaveLength(2); // Header and tab
    });

    test("prevents form submission with empty required fields", async () => {
      render(<ServerDashboard />);

      const createButton = screen.getByRole("button", {
        name: "Create Server",
      });
      await user.click(createButton);

      // Verify the name field is required
      const nameInput = screen.getByLabelText("Server Name");
      expect(nameInput).toBeRequired();

      // HTML5 validation should prevent submission - we can't easily test this in JSDOM
      // but we can verify the required attribute is present
      expect(nameInput.hasAttribute("required")).toBe(true);
    });
  });

  describe("Version Loading", () => {
    test("loads supported versions from API", async () => {
      render(<ServerDashboard />);

      // Wait for versions to load
      await waitFor(() => {
        expect(serverService.getSupportedVersions).toHaveBeenCalled();
      });

      // Open create modal
      const createButton = screen.getByRole("button", {
        name: "Create Server",
      });
      await user.click(createButton);

      // Check that versions are available in the select
      const versionSelect = screen.getByLabelText("Minecraft Version");
      expect(versionSelect).toBeInTheDocument();

      // Should contain the mocked versions
      expect(screen.getByDisplayValue("1.21.5")).toBeInTheDocument();
    });

    test("shows fallback versions when API fails", async () => {
      // Mock API failure
      vi.mocked(serverService.getSupportedVersions).mockResolvedValue(
        err({ message: "Failed to load versions", status: 500 })
      );

      render(<ServerDashboard />);

      // Wait for API call to complete
      await waitFor(() => {
        expect(serverService.getSupportedVersions).toHaveBeenCalled();
      });

      // Open create modal
      const createButton = screen.getByRole("button", {
        name: "Create Server",
      });
      await user.click(createButton);

      // Check that fallback versions are available
      const versionSelect = screen.getByLabelText("Minecraft Version");
      expect(versionSelect).toBeInTheDocument();

      // Should show error message
      expect(
        screen.getByText("Failed to load versions, using fallback list")
      ).toBeInTheDocument();
    });

    test("shows loading state while fetching versions", async () => {
      // Make the API call hang to test loading state
      vi.mocked(serverService.getSupportedVersions).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<ServerDashboard />);

      // Open create modal immediately
      const createButton = screen.getByRole("button", {
        name: "Create Server",
      });
      await user.click(createButton);

      // Should show loading state
      expect(screen.getByText("Loading versions...")).toBeInTheDocument();

      const versionSelect = screen.getByLabelText("Minecraft Version");
      expect(versionSelect).toBeDisabled();
    });
  });

  describe("Server Type Filtering", () => {
    test("displays filters section when servers are present", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      });

      expect(screen.getByText("Filters")).toBeInTheDocument();
      expect(document.getElementById("serverTypeFilter")).toBeInTheDocument();
      expect(screen.getByText("Showing 2 of 2 servers")).toBeInTheDocument();
    });

    test("does not display filters section when no servers", async () => {
      vi.mocked(serverService.getServers).mockResolvedValue(ok([]));

      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("No servers found")).toBeInTheDocument();
      });

      expect(screen.queryByText("Filters")).not.toBeInTheDocument();
    });

    test("filters servers by vanilla type", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      });

      // Both servers should be visible initially
      expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      expect(screen.getByText("Test Server 2")).toBeInTheDocument();

      // Filter by vanilla
      const typeFilter = document.getElementById(
        "serverTypeFilter"
      ) as HTMLSelectElement;
      await user.selectOptions(typeFilter, "vanilla");

      // Only vanilla server should be visible
      expect(screen.getByText("Test Server 1")).toBeInTheDocument(); // vanilla server
      expect(screen.queryByText("Test Server 2")).not.toBeInTheDocument(); // paper server

      // Results count should update
      expect(screen.getByText("Showing 1 of 2 servers")).toBeInTheDocument();
    });

    test("filters servers by paper type", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Test Server 2")).toBeInTheDocument();
      });

      // Filter by paper
      const typeFilter = document.getElementById(
        "serverTypeFilter"
      ) as HTMLSelectElement;
      await user.selectOptions(typeFilter, "paper");

      // Only paper server should be visible
      expect(screen.queryByText("Test Server 1")).not.toBeInTheDocument(); // vanilla server
      expect(screen.getByText("Test Server 2")).toBeInTheDocument(); // paper server

      // Results count should update
      expect(screen.getByText("Showing 1 of 2 servers")).toBeInTheDocument();
    });

    test("shows all servers when 'All' filter is selected", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      });

      // Filter by paper first
      const typeFilter = document.getElementById(
        "serverTypeFilter"
      ) as HTMLSelectElement;
      await user.selectOptions(typeFilter, "paper");

      // Only paper server should be visible
      expect(screen.getByText("Showing 1 of 2 servers")).toBeInTheDocument();

      // Reset to show all
      await user.selectOptions(typeFilter, "all");

      // Both servers should be visible again
      expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      expect(screen.getByText("Test Server 2")).toBeInTheDocument();
      expect(screen.getByText("Showing 2 of 2 servers")).toBeInTheDocument();
    });

    test("shows empty state when no servers match filter", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      });

      // Filter by forge (no servers have this type)
      const typeFilter = document.getElementById(
        "serverTypeFilter"
      ) as HTMLSelectElement;
      await user.selectOptions(typeFilter, "forge");

      // Should show no servers found message
      expect(screen.queryByText("Test Server 1")).not.toBeInTheDocument();
      expect(screen.queryByText("Test Server 2")).not.toBeInTheDocument();
      expect(screen.getByText("No servers found")).toBeInTheDocument();
      expect(
        screen.getByText("No servers match the current filters.")
      ).toBeInTheDocument();
      expect(screen.getByText("Showing 0 of 2 servers")).toBeInTheDocument();
    });

    test("filter select has correct options", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      });

      const typeFilter = document.getElementById(
        "serverTypeFilter"
      ) as HTMLSelectElement;
      const options = Array.from(typeFilter.querySelectorAll("option")).map(
        (option) => ({ value: option.value, text: option.textContent })
      );

      expect(options).toEqual([
        { value: "all", text: "All" },
        { value: "vanilla", text: "Vanilla" },
        { value: "paper", text: "Paper" },
        { value: "forge", text: "Forge" },
      ]);
    });
  });

  describe("Server Status Filtering", () => {
    test("displays status filter alongside type filter", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      });

      expect(document.getElementById("serverStatusFilter")).toBeInTheDocument();
      expect(screen.getByText("Server Status")).toBeInTheDocument();
    });

    test("filters servers by running status", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      });

      // Both servers should be visible initially
      expect(screen.getByText("Test Server 1")).toBeInTheDocument(); // running
      expect(screen.getByText("Test Server 2")).toBeInTheDocument(); // stopped

      // Filter by running status
      const statusFilter = document.getElementById(
        "serverStatusFilter"
      ) as HTMLSelectElement;
      await user.selectOptions(statusFilter, "running");

      // Only running server should be visible
      expect(screen.getByText("Test Server 1")).toBeInTheDocument(); // running server
      expect(screen.queryByText("Test Server 2")).not.toBeInTheDocument(); // stopped server

      // Results count should update
      expect(screen.getByText("Showing 1 of 2 servers")).toBeInTheDocument();
    });

    test("filters servers by stopped status", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Test Server 2")).toBeInTheDocument();
      });

      // Filter by stopped status
      const statusFilter = document.getElementById(
        "serverStatusFilter"
      ) as HTMLSelectElement;
      await user.selectOptions(statusFilter, "stopped");

      // Only stopped server should be visible
      expect(screen.queryByText("Test Server 1")).not.toBeInTheDocument(); // running server
      expect(screen.getByText("Test Server 2")).toBeInTheDocument(); // stopped server

      // Results count should update
      expect(screen.getByText("Showing 1 of 2 servers")).toBeInTheDocument();
    });

    test("combines type and status filters", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      });

      // Filter by vanilla type first
      const typeFilter = document.getElementById(
        "serverTypeFilter"
      ) as HTMLSelectElement;
      await user.selectOptions(typeFilter, "vanilla");

      // Should show only Test Server 1 (vanilla)
      expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      expect(screen.queryByText("Test Server 2")).not.toBeInTheDocument();
      expect(screen.getByText("Showing 1 of 2 servers")).toBeInTheDocument();

      // Now also filter by running status
      const statusFilter = document.getElementById(
        "serverStatusFilter"
      ) as HTMLSelectElement;
      await user.selectOptions(statusFilter, "running");

      // Should still show Test Server 1 (vanilla + running)
      expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      expect(screen.queryByText("Test Server 2")).not.toBeInTheDocument();
      expect(screen.getByText("Showing 1 of 2 servers")).toBeInTheDocument();

      // Change status filter to stopped
      await user.selectOptions(statusFilter, "stopped");

      // Should show no servers (vanilla + stopped doesn't match any server)
      expect(screen.queryByText("Test Server 1")).not.toBeInTheDocument();
      expect(screen.queryByText("Test Server 2")).not.toBeInTheDocument();
      expect(screen.getByText("No servers found")).toBeInTheDocument();
      expect(screen.getByText("Showing 0 of 2 servers")).toBeInTheDocument();
    });

    test("status filter select has correct options", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      });

      const statusFilter = document.getElementById(
        "serverStatusFilter"
      ) as HTMLSelectElement;
      const options = Array.from(statusFilter.querySelectorAll("option")).map(
        (option) => ({ value: option.value, text: option.textContent })
      );

      expect(options).toEqual([
        { value: "all", text: "All" },
        { value: "running", text: "Running" },
        { value: "stopped", text: "Stopped" },
        { value: "starting", text: "Starting" },
        { value: "stopping", text: "Stopping" },
        { value: "error", text: "Error" },
      ]);
    });

    test("resets to show all servers when both filters set to 'All'", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      });

      // Apply both filters
      const typeFilter = document.getElementById(
        "serverTypeFilter"
      ) as HTMLSelectElement;
      const statusFilter = document.getElementById(
        "serverStatusFilter"
      ) as HTMLSelectElement;

      await user.selectOptions(typeFilter, "paper");
      await user.selectOptions(statusFilter, "running");

      // Should show no servers (paper + running doesn't match any)
      expect(screen.getByText("Showing 0 of 2 servers")).toBeInTheDocument();

      // Reset both filters to "All"
      await user.selectOptions(typeFilter, "all");
      await user.selectOptions(statusFilter, "all");

      // Should show all servers again
      expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      expect(screen.getByText("Test Server 2")).toBeInTheDocument();
      expect(screen.getByText("Showing 2 of 2 servers")).toBeInTheDocument();
    });
  });

  describe("Server Search Functionality", () => {
    test("displays search input field", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      });

      expect(document.getElementById("serverSearchInput")).toBeInTheDocument();
      expect(screen.getByText("Search Servers")).toBeInTheDocument();
    });

    test("filters servers by search query (case-insensitive)", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      });

      // Both servers should be visible initially
      expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      expect(screen.getByText("Test Server 2")).toBeInTheDocument();

      // Search for "server 1"
      const searchInput = document.getElementById(
        "serverSearchInput"
      ) as HTMLInputElement;
      await user.type(searchInput, "server 1");

      // Only Test Server 1 should be visible
      expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      expect(screen.queryByText("Test Server 2")).not.toBeInTheDocument();
      expect(screen.getByText("Showing 1 of 2 servers")).toBeInTheDocument();
    });

    test("search is case-insensitive", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      });

      // Search with uppercase
      const searchInput = document.getElementById(
        "serverSearchInput"
      ) as HTMLInputElement;
      await user.type(searchInput, "TEST SERVER");

      // Both servers should be visible (both contain "Test Server")
      expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      expect(screen.getByText("Test Server 2")).toBeInTheDocument();
      expect(screen.getByText("Showing 2 of 2 servers")).toBeInTheDocument();
    });

    test("shows no results when search query matches no servers", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      });

      // Search for something that doesn't exist
      const searchInput = document.getElementById(
        "serverSearchInput"
      ) as HTMLInputElement;
      await user.type(searchInput, "nonexistent");

      // No servers should be visible
      expect(screen.queryByText("Test Server 1")).not.toBeInTheDocument();
      expect(screen.queryByText("Test Server 2")).not.toBeInTheDocument();
      expect(screen.getByText("No servers found")).toBeInTheDocument();
      expect(screen.getByText("Showing 0 of 2 servers")).toBeInTheDocument();
    });

    test("combines search with other filters", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      });

      // First apply type filter for vanilla
      const typeFilter = document.getElementById(
        "serverTypeFilter"
      ) as HTMLSelectElement;
      await user.selectOptions(typeFilter, "vanilla");

      // Should show only Test Server 1 (vanilla)
      expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      expect(screen.queryByText("Test Server 2")).not.toBeInTheDocument();

      // Now search for "2"
      const searchInput = document.getElementById(
        "serverSearchInput"
      ) as HTMLInputElement;
      await user.type(searchInput, "2");

      // Should show no servers (vanilla filter + search for "2" matches nothing)
      expect(screen.queryByText("Test Server 1")).not.toBeInTheDocument();
      expect(screen.queryByText("Test Server 2")).not.toBeInTheDocument();
      expect(screen.getByText("No servers found")).toBeInTheDocument();
      expect(screen.getByText("Showing 0 of 2 servers")).toBeInTheDocument();
    });

    test("clearing search query shows all servers again", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      });

      const searchInput = document.getElementById(
        "serverSearchInput"
      ) as HTMLInputElement;

      // Search for "1"
      await user.type(searchInput, "1");
      expect(screen.getByText("Showing 1 of 2 servers")).toBeInTheDocument();

      // Clear the search
      await user.clear(searchInput);

      // All servers should be visible again
      expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      expect(screen.getByText("Test Server 2")).toBeInTheDocument();
      expect(screen.getByText("Showing 2 of 2 servers")).toBeInTheDocument();
    });

    test("search input has correct placeholder", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      });

      const searchInput = document.getElementById(
        "serverSearchInput"
      ) as HTMLInputElement;
      expect(searchInput.placeholder).toBe("Search by server name...");
    });

    test("whitespace-only search is ignored", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      });

      const searchInput = document.getElementById(
        "serverSearchInput"
      ) as HTMLInputElement;

      // Search with only whitespace
      await user.type(searchInput, "   ");

      // All servers should still be visible (whitespace is trimmed)
      expect(screen.getByText("Test Server 1")).toBeInTheDocument();
      expect(screen.getByText("Test Server 2")).toBeInTheDocument();
      expect(screen.getByText("Showing 2 of 2 servers")).toBeInTheDocument();
    });
  });
});
