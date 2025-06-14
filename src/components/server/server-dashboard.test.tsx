import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ServerDashboard } from "./server-dashboard";
import * as serverService from "@/services/server";
import { ok, err } from "neverthrow";
import { ServerType, ServerStatus } from "@/types/server";
import type { MinecraftServer, CreateServerRequest } from "@/types/server";

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

// Mock modules
vi.mock("@/contexts/auth", () => ({
  useAuth: () => mockAuthContext,
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

      // Check server 1 details
      expect(screen.getByText("Running")).toBeInTheDocument();
      expect(screen.getByText("1.21.5")).toBeInTheDocument();
      expect(screen.getByText("vanilla")).toBeInTheDocument();
      expect(screen.getByText("0/20")).toBeInTheDocument();
      expect(screen.getByText("2048MB")).toBeInTheDocument();
      expect(screen.getByText("25565")).toBeInTheDocument();
      expect(screen.getByText("A test server")).toBeInTheDocument();

      // Check server 2 details
      expect(screen.getByText("Test Server 2")).toBeInTheDocument();
      expect(screen.getByText("Stopped")).toBeInTheDocument();
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

      const runningStatus = screen.getByText("Running");
      const stoppedStatus = screen.getByText("Stopped");

      // CSS modules create hashed class names, so we need to check partial class names
      expect(runningStatus.className).toContain("statusRunning");
      expect(stoppedStatus.className).toContain("statusStopped");
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
        expect(screen.getByText("Starting...")).toBeInTheDocument();
      });

      expect(screen.getByText("Stopping...")).toBeInTheDocument();
      expect(screen.getByText("Error")).toBeInTheDocument();
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

      expect(screen.getByText("Create New Server")).toBeInTheDocument();
      expect(screen.getByLabelText("Server Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Minecraft Version")).toBeInTheDocument();
      expect(screen.getByLabelText("Server Type")).toBeInTheDocument();
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

      expect(screen.getByText("Create New Server")).toBeInTheDocument();
    });

    test("closes modal when close button is clicked", async () => {
      render(<ServerDashboard />);

      const createButton = screen.getByRole("button", {
        name: "Create Server",
      });
      await user.click(createButton);

      expect(screen.getByText("Create New Server")).toBeInTheDocument();

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

      const typeSelect = screen.getByLabelText("Server Type");
      expect((typeSelect as HTMLSelectElement).value).toBe("vanilla");

      const memorySelect = screen.getByLabelText("Memory (MB)");
      expect((memorySelect as HTMLSelectElement).value).toBe("2048");

      expect(screen.getByRole("textbox", { name: /description/i })).toHaveValue(
        ""
      ); // Empty description
    });

    test("renders all Minecraft versions in select", () => {
      // Test a few key versions rather than all to avoid test complexity
      expect(
        screen.getByRole("option", { name: "1.21.5" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "1.20.6" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "1.19.4" })
      ).toBeInTheDocument();
    });

    test("renders all server types in select", () => {
      expect(
        screen.getByRole("option", { name: "Vanilla" })
      ).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Paper" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Forge" })).toBeInTheDocument();
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
      const typeSelect = screen.getByLabelText("Server Type");
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

      const expectedRequest: CreateServerRequest = {
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
      const typeSelect = screen.getByLabelText("Server Type");
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

      const expectedRequest: CreateServerRequest = {
        name: "Custom Server",
        minecraft_version: "1.20.6",
        server_type: ServerType.PAPER,
        max_memory: 4096,
        description: "",
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
        expect(screen.getByText("Create New Server")).toBeInTheDocument();
      });

      expect(screen.getByLabelText("Server Name")).toHaveValue("");
      expect(screen.getByLabelText("Description (Optional)")).toHaveValue("");

      // Check select values are reset to defaults
      const versionSelect = screen.getByLabelText("Minecraft Version");
      expect((versionSelect as HTMLSelectElement).value).toBe("1.21.5");

      const typeSelect = screen.getByLabelText("Server Type");
      expect((typeSelect as HTMLSelectElement).value).toBe("vanilla");

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

      // Modal should remain open
      expect(screen.getByText("Create New Server")).toBeInTheDocument();
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
        { status: ServerStatus.RUNNING, text: "Running" },
        { status: ServerStatus.STOPPED, text: "Stopped" },
        { status: ServerStatus.STARTING, text: "Starting..." },
        { status: ServerStatus.STOPPING, text: "Stopping..." },
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
          expect(screen.getByText(text)).toBeInTheDocument();
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
      expect(screen.getByText("Create New Server")).toBeInTheDocument();

      const closeButton = screen.getByRole("button", { name: "×" });
      await user.click(closeButton);
      expect(screen.queryByText("Create New Server")).not.toBeInTheDocument();

      // Open again
      await user.click(createButton);
      expect(screen.getByText("Create New Server")).toBeInTheDocument();
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
});
