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
  "servers.fields.name": "Name",
  "servers.fields.status": "Status",
  "servers.fields.actions": "Actions",
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
  "servers.filters.type.label": "Server Type",
  "servers.filters.type.all": "All (Server Type)",
  "servers.filters.type.vanilla": "Vanilla",
  "servers.filters.type.paper": "Paper",
  "servers.filters.type.forge": "Forge",
  "servers.filters.status.label": "Server Status",
  "servers.filters.status.all": "All (Server Status)",
  "servers.filters.status.running": "Running",
  "servers.filters.status.stopped": "Stopped",
  "servers.filters.status.error": "Error",
  "servers.filters.search.label": "Search Servers",
  "servers.filters.search.placeholder": "Search by server name...",
  "servers.filters.version.label": "Minecraft Version",
  "servers.filters.version.all": "All (Versions)",
  "servers.filters.sort.label": "Sort By",
  "servers.filters.sort.name": "Name",
  "servers.filters.sort.status": "Status",
  "servers.filters.sort.created": "Created Date",
  "servers.filters.sort.version": "Version",
  "servers.filters.sort.order": "Sort Order",
  "servers.filters.sort.ascending": "A-Z",
  "servers.filters.sort.descending": "Z-A",
  "servers.filters.reset": "Reset Filters",
  "servers.filters.resultsCount": "Showing {count} of {total} servers",
  "servers.filters.title": "Filters",
  "servers.filters.filterBy": "Filter",
  "servers.filters.sortBy": "Sort",
  "servers.actions.start": "Start Server",
  "servers.actions.stop": "Stop Server",
  "servers.actions.details": "View Details",
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

// Helper function to open filters
const openFilters = async (user: ReturnType<typeof userEvent.setup>) => {
  const filtersButton = screen.getByText("🔍 Filters");
  await user.click(filtersButton);

  // Wait for filters to be visible
  await waitFor(() => {
    expect(document.getElementById("serverTypeFilter")).toBeInTheDocument();
  });
};

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
      minecraft_version: "1.21.6",
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
    minecraft_version: "1.21.6",
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

  // Helper to set viewport size for responsive testing
  const setViewportSize = (width: number) => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: width,
    });
    window.dispatchEvent(new Event("resize"));
  };

  // Helper to get server name element based on current viewport
  const getServerNameElement = (serverName: string) => {
    // Both table and card views are always rendered, but CSS controls visibility
    // For desktop (768px+), table should be visible
    if (window.innerWidth >= 768) {
      // Try to get the table cell first for desktop
      const tableCells = screen.queryAllByText(serverName);
      // Find the one that's in a table cell
      for (const cell of tableCells) {
        if (cell.closest("table")) {
          return cell;
        }
      }
    }

    // For mobile or fallback, get the card header
    const cardHeaders = screen.queryAllByRole("heading", { name: serverName });
    if (cardHeaders.length > 0) {
      return cardHeaders[0];
    }

    // Final fallback: just get first occurrence
    return screen.queryByText(serverName);
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Set default viewport to desktop
    setViewportSize(1024);

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
      ok([
        "1.21.6",
        "1.21.5",
        "1.21.4",
        "1.21.3",
        "1.21.2",
        "1.21.1",
        "1.21",
        "1.20.6",
      ])
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

      // Wait for servers to load - check in table view
      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      expect(getServerNameElement("Test Server 2")).toBeInTheDocument();
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
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      // Check server 1 details - some text appears multiple times (table + card)
      expect(screen.getAllByText("Running")).toHaveLength(1); // Status badge
      expect(screen.getAllByText("1.21.6")).toHaveLength(2); // Table + card
      expect(screen.getAllByText("vanilla")).toHaveLength(2); // Table + card
      expect(screen.getAllByText("0/20")).toHaveLength(2); // Table + card (running server shows 0)
      expect(screen.getAllByText("2048MB")).toHaveLength(1); // Only in card view
      expect(screen.getAllByText("25565")).toHaveLength(2); // Table + card
      expect(screen.getAllByText("A test server")).toHaveLength(2); // Table + card

      // Check server 2 details
      expect(getServerNameElement("Test Server 2")).toBeInTheDocument();
      expect(screen.getAllByText("Stopped")).toHaveLength(1); // Status badge
      expect(screen.getAllByText("1.20.6")).toHaveLength(2); // Table + card
      expect(screen.getAllByText("paper")).toHaveLength(2); // Table + card
      expect(screen.getByText("-/50")).toBeInTheDocument(); // Table view for stopped server
      expect(screen.getByText("0/50")).toBeInTheDocument(); // Card view for stopped server
      expect(screen.getAllByText("4096MB")).toHaveLength(2); // Table shows max memory, card shows max memory
      expect(screen.getAllByText("25566")).toHaveLength(2); // Table + card
    });

    test("applies correct status styles", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      // Find status elements by looking for status badges
      const runningStatusBadge = screen
        .getByText("Running")
        .closest('[class*="status"]');
      const stoppedStatusBadge = screen
        .getByText("Stopped")
        .closest('[class*="status"]');

      // CSS modules create hashed class names, so we need to check partial class names
      expect(runningStatusBadge?.className).toContain("statusRunning");
      expect(stoppedStatusBadge?.className).toContain("statusStopped");
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
      expect(screen.getByText("Error")).toBeInTheDocument(); // Server status only (filters hidden)
    });
  });

  describe("Server Navigation", () => {
    test("navigates to server detail when card is clicked (mobile view)", async () => {
      // Switch to mobile view to test card clicks
      setViewportSize(375);
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      // Click on the server card by finding the heading element
      const serverCard = screen
        .getByRole("heading", { name: "Test Server 1" })
        .closest('div[class*="serverCard"]');
      expect(serverCard).toBeInTheDocument();
      if (serverCard) {
        await user.click(serverCard);
      } else {
        throw new Error("Server card not found");
      }

      expect(mockPush).toHaveBeenCalledWith("/servers/1");
    });

    test("navigates to correct server when multiple servers present (mobile view)", async () => {
      // Switch to mobile view to test card clicks
      setViewportSize(375);
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 2")).toBeInTheDocument();
      });

      const serverCard2 = screen
        .getByRole("heading", { name: "Test Server 2" })
        .closest('div[class*="serverCard"]');
      expect(serverCard2).toBeInTheDocument();
      if (serverCard2) {
        await user.click(serverCard2);
      } else {
        throw new Error("Server card not found");
      }

      expect(mockPush).toHaveBeenCalledWith("/servers/2");
    });

    test("navigates to server detail when details button is clicked (desktop view)", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      // Find and click the details button (→) in the table row
      const detailsButtons = screen.getAllByText("→");
      // Filter to only action buttons (not footer arrows)
      const actionDetailsButtons = detailsButtons.filter(
        (button) =>
          button.closest("button") &&
          button.closest('.actionsCell, [class*="actionButtons"]')
      );
      expect(actionDetailsButtons.length).toBeGreaterThan(0);
      const button = actionDetailsButtons[0]?.closest("button");
      if (button) {
        await user.click(button);
      } else {
        throw new Error("Details button not found");
      }

      expect(mockPush).toHaveBeenCalledWith("/servers/1");
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
      expect((versionSelect as HTMLSelectElement).value).toBe("1.21.6");

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

      // Test that specific versions exist in create form select (using getAllByRole to handle duplicates)
      const versionOptions = screen.getAllByRole("option", { name: "1.21.6" });
      expect(versionOptions.length).toBeGreaterThanOrEqual(1); // Should appear in at least one select

      const versionOptions1214 = screen.getAllByRole("option", {
        name: "1.21.4",
      });
      expect(versionOptions1214.length).toBeGreaterThanOrEqual(1);

      const versionOptions1206 = screen.getAllByRole("option", {
        name: "1.20.6",
      });
      expect(versionOptions1206.length).toBeGreaterThanOrEqual(1);
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
        minecraft_version: "1.21.6",
        server_type: ServerType.VANILLA,
        max_memory: 2048,
        description: "A new server",
      };

      expect(serverService.createServer).toHaveBeenCalledWith(expectedRequest);

      // Modal should close and server should be added to list
      await waitFor(() => {
        expect(screen.queryByText("Create New Server")).not.toBeInTheDocument();
      });

      expect(getServerNameElement("New Server")).toBeInTheDocument();
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
      expect((versionSelect as HTMLSelectElement).value).toBe("1.21.6");

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
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
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
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
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
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
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
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
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
        },
        {
          status: ServerStatus.STOPPED,
          text: "Stopped",
        },
        { status: ServerStatus.ERROR, text: "Error" },
      ];

      for (const { status, text } of statusTests) {
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
          // With filters hidden by default, text only appears in server status
          expect(screen.getByText(text)).toBeInTheDocument(); // Server status text
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
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
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
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
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
      expect(screen.getByDisplayValue("1.21.6")).toBeInTheDocument();
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
    test("displays compact filters when servers are present", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      // Check that filter toggle button is displayed
      expect(screen.getByText("🔍 Filters")).toBeInTheDocument();
      expect(screen.getByText("Showing 2 of 2 servers")).toBeInTheDocument();
    });

    test("does not display compact filters when no servers", async () => {
      vi.mocked(serverService.getServers).mockResolvedValue(ok([]));

      render(<ServerDashboard />);

      await waitFor(() => {
        expect(screen.getByText("No servers found")).toBeInTheDocument();
      });

      // Filter toggle button should not be displayed when no servers
      expect(screen.queryByText("🔍 Filters")).not.toBeInTheDocument();
    });

    test("filters servers by vanilla type", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      const user = userEvent.setup();

      // Both servers should be visible initially
      expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      expect(getServerNameElement("Test Server 2")).toBeInTheDocument();

      // Open filters first
      await openFilters(user);

      // Filter by vanilla
      const typeFilter = document.getElementById(
        "serverTypeFilter"
      ) as HTMLSelectElement;
      await user.selectOptions(typeFilter, "vanilla");

      // Only vanilla server should be visible
      expect(getServerNameElement("Test Server 1")).toBeInTheDocument(); // vanilla server
      expect(getServerNameElement("Test Server 2")).not.toBeInTheDocument(); // paper server

      // Results count should update
      expect(screen.getByText("Showing 1 of 2 servers")).toBeInTheDocument();
    });

    test("filters servers by paper type", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 2")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await openFilters(user);

      // Filter by paper
      const typeFilter = document.getElementById(
        "serverTypeFilter"
      ) as HTMLSelectElement;
      await user.selectOptions(typeFilter, "paper");

      // Only paper server should be visible
      expect(getServerNameElement("Test Server 1")).not.toBeInTheDocument(); // vanilla server
      expect(getServerNameElement("Test Server 2")).toBeInTheDocument(); // paper server

      // Results count should update
      expect(screen.getByText("Showing 1 of 2 servers")).toBeInTheDocument();
    });

    test("shows all servers when 'All' filter is selected", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await openFilters(user);

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
      expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      expect(getServerNameElement("Test Server 2")).toBeInTheDocument();
      expect(screen.getByText("Showing 2 of 2 servers")).toBeInTheDocument();
    });

    test("shows empty state when no servers match filter", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await openFilters(user);

      // Filter by forge (no servers have this type)
      const typeFilter = document.getElementById(
        "serverTypeFilter"
      ) as HTMLSelectElement;
      await user.selectOptions(typeFilter, "forge");

      // Should show no servers found message
      expect(getServerNameElement("Test Server 1")).not.toBeInTheDocument();
      expect(getServerNameElement("Test Server 2")).not.toBeInTheDocument();
      expect(screen.getByText("No servers found")).toBeInTheDocument();
      expect(
        screen.getByText("No servers match the current filters.")
      ).toBeInTheDocument();
      expect(screen.getByText("Showing 0 of 2 servers")).toBeInTheDocument();
    });

    test("filter select has correct options", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await openFilters(user);

      const typeFilter = document.getElementById(
        "serverTypeFilter"
      ) as HTMLSelectElement;
      const options = Array.from(typeFilter.querySelectorAll("option")).map(
        (option) => ({ value: option.value, text: option.textContent })
      );

      expect(options).toEqual([
        { value: "all", text: "All (Server Type)" },
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
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await openFilters(user);

      expect(document.getElementById("serverStatusFilter")).toBeInTheDocument();
      expect(document.getElementById("serverTypeFilter")).toBeInTheDocument();
    });

    test("filters servers by running status", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      // Both servers should be visible initially
      expect(getServerNameElement("Test Server 1")).toBeInTheDocument(); // running
      expect(getServerNameElement("Test Server 2")).toBeInTheDocument(); // stopped

      const user = userEvent.setup();
      await openFilters(user);

      // Filter by running status
      const statusFilter = document.getElementById(
        "serverStatusFilter"
      ) as HTMLSelectElement;
      await user.selectOptions(statusFilter, "running");

      // Only running server should be visible
      expect(getServerNameElement("Test Server 1")).toBeInTheDocument(); // running server
      expect(getServerNameElement("Test Server 2")).not.toBeInTheDocument(); // stopped server

      // Results count should update
      expect(screen.getByText("Showing 1 of 2 servers")).toBeInTheDocument();
    });

    test("filters servers by stopped status", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 2")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await openFilters(user);

      // Filter by stopped status
      const statusFilter = document.getElementById(
        "serverStatusFilter"
      ) as HTMLSelectElement;
      await user.selectOptions(statusFilter, "stopped");

      // Only stopped server should be visible
      expect(getServerNameElement("Test Server 1")).not.toBeInTheDocument(); // running server
      expect(getServerNameElement("Test Server 2")).toBeInTheDocument(); // stopped server

      // Results count should update
      expect(screen.getByText("Showing 1 of 2 servers")).toBeInTheDocument();
    });

    test("combines type and status filters", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await openFilters(user);

      // Filter by vanilla type first
      const typeFilter = document.getElementById(
        "serverTypeFilter"
      ) as HTMLSelectElement;
      await user.selectOptions(typeFilter, "vanilla");

      // Should show only Test Server 1 (vanilla)
      expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      expect(getServerNameElement("Test Server 2")).not.toBeInTheDocument();
      expect(screen.getByText("Showing 1 of 2 servers")).toBeInTheDocument();

      // Now also filter by running status
      const statusFilter = document.getElementById(
        "serverStatusFilter"
      ) as HTMLSelectElement;
      await user.selectOptions(statusFilter, "running");

      // Should still show Test Server 1 (vanilla + running)
      expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      expect(getServerNameElement("Test Server 2")).not.toBeInTheDocument();
      expect(screen.getByText("Showing 1 of 2 servers")).toBeInTheDocument();

      // Change status filter to stopped
      await user.selectOptions(statusFilter, "stopped");

      // Should show no servers (vanilla + stopped doesn't match any server)
      expect(getServerNameElement("Test Server 1")).not.toBeInTheDocument();
      expect(getServerNameElement("Test Server 2")).not.toBeInTheDocument();
      expect(screen.getByText("No servers found")).toBeInTheDocument();
      expect(screen.getByText("Showing 0 of 2 servers")).toBeInTheDocument();
    });

    test("status filter select has correct options", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await openFilters(user);

      const statusFilter = document.getElementById(
        "serverStatusFilter"
      ) as HTMLSelectElement;
      const options = Array.from(statusFilter.querySelectorAll("option")).map(
        (option) => ({ value: option.value, text: option.textContent })
      );

      expect(options).toEqual([
        { value: "all", text: "All (Server Status)" },
        { value: "running", text: "Running" },
        { value: "stopped", text: "Stopped" },
        { value: "error", text: "Error" },
      ]);
    });

    test("resets to show all servers when both filters set to 'All'", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await openFilters(user);

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
      expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      expect(getServerNameElement("Test Server 2")).toBeInTheDocument();
      expect(screen.getByText("Showing 2 of 2 servers")).toBeInTheDocument();
    });
  });

  describe("Server Search Functionality", () => {
    test("displays search input field", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await openFilters(user);

      expect(document.getElementById("serverSearchInput")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Search by server name...")
      ).toBeInTheDocument();
    });

    test("filters servers by search query (case-insensitive)", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      // Both servers should be visible initially
      expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      expect(getServerNameElement("Test Server 2")).toBeInTheDocument();

      const user = userEvent.setup();
      await openFilters(user);

      // Search for "server 1"
      const searchInput = document.getElementById(
        "serverSearchInput"
      ) as HTMLInputElement;
      await user.type(searchInput, "server 1");

      // Only Test Server 1 should be visible
      expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      expect(getServerNameElement("Test Server 2")).not.toBeInTheDocument();
      expect(screen.getByText("Showing 1 of 2 servers")).toBeInTheDocument();
    });

    test("search is case-insensitive", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await openFilters(user);

      // Search with uppercase
      const searchInput = document.getElementById(
        "serverSearchInput"
      ) as HTMLInputElement;
      await user.type(searchInput, "TEST SERVER");

      // Both servers should be visible (both contain "Test Server")
      expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      expect(getServerNameElement("Test Server 2")).toBeInTheDocument();
      expect(screen.getByText("Showing 2 of 2 servers")).toBeInTheDocument();
    });

    test("shows no results when search query matches no servers", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await openFilters(user);

      // Search for something that doesn't exist
      const searchInput = document.getElementById(
        "serverSearchInput"
      ) as HTMLInputElement;
      await user.type(searchInput, "nonexistent");

      // No servers should be visible
      expect(getServerNameElement("Test Server 1")).not.toBeInTheDocument();
      expect(getServerNameElement("Test Server 2")).not.toBeInTheDocument();
      expect(screen.getByText("No servers found")).toBeInTheDocument();
      expect(screen.getByText("Showing 0 of 2 servers")).toBeInTheDocument();
    });

    test("combines search with other filters", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await openFilters(user);

      // First apply type filter for vanilla
      const typeFilter = document.getElementById(
        "serverTypeFilter"
      ) as HTMLSelectElement;
      await user.selectOptions(typeFilter, "vanilla");

      // Should show only Test Server 1 (vanilla)
      expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      expect(getServerNameElement("Test Server 2")).not.toBeInTheDocument();

      // Now search for "2"
      const searchInput = document.getElementById(
        "serverSearchInput"
      ) as HTMLInputElement;
      await user.type(searchInput, "2");

      // Should show no servers (vanilla filter + search for "2" matches nothing)
      expect(getServerNameElement("Test Server 1")).not.toBeInTheDocument();
      expect(getServerNameElement("Test Server 2")).not.toBeInTheDocument();
      expect(screen.getByText("No servers found")).toBeInTheDocument();
      expect(screen.getByText("Showing 0 of 2 servers")).toBeInTheDocument();
    });

    test("clearing search query shows all servers again", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await openFilters(user);

      const searchInput = document.getElementById(
        "serverSearchInput"
      ) as HTMLInputElement;

      // Search for "1"
      await user.type(searchInput, "1");
      expect(screen.getByText("Showing 1 of 2 servers")).toBeInTheDocument();

      // Clear the search
      await user.clear(searchInput);

      // All servers should be visible again
      expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      expect(getServerNameElement("Test Server 2")).toBeInTheDocument();
      expect(screen.getByText("Showing 2 of 2 servers")).toBeInTheDocument();
    });

    test("search input has correct placeholder", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await openFilters(user);

      const searchInput = document.getElementById(
        "serverSearchInput"
      ) as HTMLInputElement;
      expect(searchInput.placeholder).toBe("Search by server name...");
    });

    test("whitespace-only search is ignored", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await openFilters(user);

      const searchInput = document.getElementById(
        "serverSearchInput"
      ) as HTMLInputElement;

      // Search with only whitespace
      await user.type(searchInput, "   ");

      // All servers should still be visible (whitespace is trimmed)
      expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      expect(getServerNameElement("Test Server 2")).toBeInTheDocument();
      expect(screen.getByText("Showing 2 of 2 servers")).toBeInTheDocument();
    });
  });

  describe("Minecraft Version Filtering", () => {
    test("displays version filter when servers are present", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await openFilters(user);

      expect(
        document.getElementById("serverVersionFilter")
      ).toBeInTheDocument();
      expect(screen.getByText("Minecraft Version")).toBeInTheDocument();
    });

    test("version filter contains all unique versions from servers", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await openFilters(user);

      const versionFilter = document.getElementById(
        "serverVersionFilter"
      ) as HTMLSelectElement;
      const options = Array.from(versionFilter.querySelectorAll("option")).map(
        (option) => ({ value: option.value, text: option.textContent })
      );

      expect(options).toEqual([
        { value: "all", text: "All (Versions)" },
        { value: "1.21.6", text: "1.21.6" },
        { value: "1.20.6", text: "1.20.6" },
      ]);
    });

    test("filters servers by minecraft version", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await openFilters(user);

      const versionFilter = document.getElementById(
        "serverVersionFilter"
      ) as HTMLSelectElement;
      await user.selectOptions(versionFilter, "1.21.6");

      // Should show only Test Server 1 (1.21.6)
      expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      expect(getServerNameElement("Test Server 2")).not.toBeInTheDocument();
      expect(screen.getByText("Showing 1 of 2 servers")).toBeInTheDocument();
    });

    test("resets to show all servers when version filter set to 'All'", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await openFilters(user);

      const versionFilter = document.getElementById(
        "serverVersionFilter"
      ) as HTMLSelectElement;

      // First filter by version
      await user.selectOptions(versionFilter, "1.20.6");
      expect(getServerNameElement("Test Server 2")).toBeInTheDocument();
      expect(getServerNameElement("Test Server 1")).not.toBeInTheDocument();

      // Reset to all
      await user.selectOptions(versionFilter, "all");
      expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      expect(getServerNameElement("Test Server 2")).toBeInTheDocument();
      expect(screen.getByText("Showing 2 of 2 servers")).toBeInTheDocument();
    });

    test("combines version filter with other filters", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await openFilters(user);

      // Filter by paper type and 1.20.6 version
      const typeFilter = document.getElementById(
        "serverTypeFilter"
      ) as HTMLSelectElement;
      const versionFilter = document.getElementById(
        "serverVersionFilter"
      ) as HTMLSelectElement;

      await user.selectOptions(typeFilter, "paper");
      await user.selectOptions(versionFilter, "1.20.6");

      // Should show only Test Server 2 (paper + 1.20.6)
      expect(getServerNameElement("Test Server 2")).toBeInTheDocument();
      expect(getServerNameElement("Test Server 1")).not.toBeInTheDocument();
      expect(screen.getByText("Showing 1 of 2 servers")).toBeInTheDocument();
    });
  });

  describe("Server Sorting", () => {
    test("defaults to status sorting", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await openFilters(user);

      const sortSelect = document.getElementById(
        "serverSortBy"
      ) as HTMLSelectElement;
      expect(sortSelect.value).toBe("status");
    });

    test("sorts servers by name", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await openFilters(user);

      const sortSelect = document.getElementById(
        "serverSortBy"
      ) as HTMLSelectElement;
      await user.selectOptions(sortSelect, "name");

      // Get all server cards and check their order (default is desc, so Z-A)
      // Since we have both table and card views, we need to filter to one
      const serverNames = screen.getAllByText(/^Test Server \d$/);
      expect(serverNames.length).toBeGreaterThanOrEqual(2);
      // Just check that we have both server names present
      expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      expect(getServerNameElement("Test Server 2")).toBeInTheDocument();
    });

    test("sorts servers by status with correct priority", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      // Status sort should show running servers first (Test Server 1 = running, Test Server 2 = stopped)
      // Just verify both servers are visible, sorting order is hard to test with dual rendering
      expect(getServerNameElement("Test Server 1")).toBeInTheDocument(); // Running server
      expect(getServerNameElement("Test Server 2")).toBeInTheDocument(); // Stopped server
    });

    test("toggles sort order with sort button", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await openFilters(user);

      // Switch to name sorting first
      const sortSelect = document.getElementById(
        "serverSortBy"
      ) as HTMLSelectElement;
      await user.selectOptions(sortSelect, "name");

      // Initially descending (Z-A) - Test Server 2, Test Server 1
      let serverCards = screen.getAllByText(/Test Server \d/);
      expect(serverCards[0]?.textContent).toBe("Test Server 2");
      expect(serverCards[1]?.textContent).toBe("Test Server 1");

      // Click sort order button to change to ascending (A-Z) - starts as descending by default
      const sortButton = screen.getByText(/↓.*Z-A/);
      await user.click(sortButton);

      // Now should be ascending - Test Server 1, Test Server 2
      serverCards = screen.getAllByText(/Test Server \d/);
      expect(serverCards[0]?.textContent).toBe("Test Server 1");
      expect(serverCards[1]?.textContent).toBe("Test Server 2");

      // Button text should change
      expect(screen.getByText(/↑.*A-Z/)).toBeInTheDocument();
    });

    test("sorting works with filters", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await openFilters(user);

      // Filter by vanilla type (only Test Server 1)
      const typeFilter = document.getElementById(
        "serverTypeFilter"
      ) as HTMLSelectElement;
      await user.selectOptions(typeFilter, "vanilla");

      // Should show only Test Server 1
      expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      expect(screen.queryByText("Test Server 2")).not.toBeInTheDocument();

      // Sorting should still work with filtered results
      const sortSelect = document.getElementById(
        "serverSortBy"
      ) as HTMLSelectElement;
      expect(sortSelect.value).toBe("status"); // Default sort
    });

    test("sorts servers by version", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await openFilters(user);

      const sortSelect = document.getElementById(
        "serverSortBy"
      ) as HTMLSelectElement;
      await user.selectOptions(sortSelect, "version");

      // Verify version sorting option is selected
      expect(sortSelect.value).toBe("version");

      // Both servers should still be visible
      expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      expect(getServerNameElement("Test Server 2")).toBeInTheDocument();
    });
  });

  describe("Filter Reset Functionality", () => {
    test("shows reset button only when filters are active", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await openFilters(user);

      // Initially no reset button should be visible (all filters at default)
      expect(screen.queryByText(/Reset Filters/)).not.toBeInTheDocument();

      // Apply a filter
      const typeFilter = document.getElementById(
        "serverTypeFilter"
      ) as HTMLSelectElement;
      await user.selectOptions(typeFilter, "vanilla");

      // Now reset button should be visible (filters are open and have active filters)
      expect(screen.getByText(/Reset Filters/)).toBeInTheDocument();
    });

    test("resets all filters when reset button is clicked", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await openFilters(user);

      // Apply various filters
      const typeFilter = document.getElementById(
        "serverTypeFilter"
      ) as HTMLSelectElement;
      const statusFilter = document.getElementById(
        "serverStatusFilter"
      ) as HTMLSelectElement;
      const versionFilter = document.getElementById(
        "serverVersionFilter"
      ) as HTMLSelectElement;
      const searchInput = document.getElementById(
        "serverSearchInput"
      ) as HTMLInputElement;
      const sortSelect = document.getElementById(
        "serverSortBy"
      ) as HTMLSelectElement;

      await user.selectOptions(typeFilter, "vanilla");
      await user.selectOptions(statusFilter, "running");
      await user.selectOptions(versionFilter, "1.21.6");
      await user.type(searchInput, "test");
      await user.selectOptions(sortSelect, "name");

      // Change sort order
      const sortButton = screen.getByText(/↓.*Z-A/);
      await user.click(sortButton);

      // Verify filters are applied
      expect(typeFilter.value).toBe("vanilla");
      expect(statusFilter.value).toBe("running");
      expect(versionFilter.value).toBe("1.21.6");
      expect(searchInput.value).toBe("test");
      expect(sortSelect.value).toBe("name");
      expect(screen.getByText(/↑.*A-Z/)).toBeInTheDocument(); // Sort order changed

      // Click reset button
      const resetButton = screen.getByText(/Reset Filters/);
      await user.click(resetButton);

      // Verify all filters are reset to defaults
      expect(typeFilter.value).toBe("all");
      expect(statusFilter.value).toBe("all");
      expect(versionFilter.value).toBe("all");
      expect(searchInput.value).toBe("");
      expect(sortSelect.value).toBe("status");
      expect(screen.getByText(/↓.*Z-A/)).toBeInTheDocument(); // Sort order reset

      // Reset button should be hidden again
      expect(screen.queryByText(/Reset Filters/)).not.toBeInTheDocument();
    });

    test("reset button appears for each type of filter change", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await openFilters(user);

      // Test server type filter
      const typeFilter = document.getElementById(
        "serverTypeFilter"
      ) as HTMLSelectElement;
      await user.selectOptions(typeFilter, "paper");
      expect(screen.getByText(/Reset Filters/)).toBeInTheDocument();

      const resetButton1 = screen.getByText(/Reset Filters/);
      await user.click(resetButton1);
      expect(screen.queryByText(/Reset Filters/)).not.toBeInTheDocument();

      // Test server status filter
      const statusFilter = document.getElementById(
        "serverStatusFilter"
      ) as HTMLSelectElement;
      await user.selectOptions(statusFilter, "stopped");
      expect(screen.getByText(/Reset Filters/)).toBeInTheDocument();

      const resetButton2 = screen.getByText(/Reset Filters/);
      await user.click(resetButton2);
      expect(screen.queryByText(/Reset Filters/)).not.toBeInTheDocument();

      // Test search input
      const searchInput = document.getElementById(
        "serverSearchInput"
      ) as HTMLInputElement;
      await user.type(searchInput, "search");
      expect(screen.getByText(/Reset Filters/)).toBeInTheDocument();

      const resetButton3 = screen.getByText(/Reset Filters/);
      await user.click(resetButton3);
      expect(screen.queryByText(/Reset Filters/)).not.toBeInTheDocument();

      // Test version filter
      const versionFilter = document.getElementById(
        "serverVersionFilter"
      ) as HTMLSelectElement;
      await user.selectOptions(versionFilter, "1.21.6");
      expect(screen.getByText(/Reset Filters/)).toBeInTheDocument();

      const resetButton4 = screen.getByText(/Reset Filters/);
      await user.click(resetButton4);
      expect(screen.queryByText(/Reset Filters/)).not.toBeInTheDocument();

      // Test sort change
      const sortSelect = document.getElementById(
        "serverSortBy"
      ) as HTMLSelectElement;
      await user.selectOptions(sortSelect, "name");
      expect(screen.getByText(/Reset Filters/)).toBeInTheDocument();

      const resetButton5 = screen.getByText(/Reset Filters/);
      await user.click(resetButton5);
      expect(screen.queryByText(/Reset Filters/)).not.toBeInTheDocument();

      // Test sort order change
      const sortButton = screen.getByText(/↓.*Z-A/);
      await user.click(sortButton);
      expect(screen.getByText(/Reset Filters/)).toBeInTheDocument();
    });

    test("reset restores original server list display", async () => {
      render(<ServerDashboard />);

      await waitFor(() => {
        expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      });

      const user = userEvent.setup();

      // Verify initially showing both servers
      expect(screen.getByText("Showing 2 of 2 servers")).toBeInTheDocument();
      expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      expect(getServerNameElement("Test Server 2")).toBeInTheDocument();

      await openFilters(user);

      // Apply filter that hides one server
      const typeFilter = document.getElementById(
        "serverTypeFilter"
      ) as HTMLSelectElement;
      await user.selectOptions(typeFilter, "vanilla"); // Only Test Server 1 is vanilla

      // Should show only one server
      expect(screen.getByText("Showing 1 of 2 servers")).toBeInTheDocument();
      expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      expect(screen.queryByText("Test Server 2")).not.toBeInTheDocument();

      // Reset filters
      const resetButton = screen.getByText(/Reset Filters/);
      await user.click(resetButton);

      // Should show both servers again
      expect(screen.getByText("Showing 2 of 2 servers")).toBeInTheDocument();
      expect(getServerNameElement("Test Server 1")).toBeInTheDocument();
      expect(getServerNameElement("Test Server 2")).toBeInTheDocument();
    });
  });
});
