import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ok, err } from "neverthrow";
import { ServerStatus, ServerType } from "@/types/server";
import { mockServer, createMockServer } from "@/test/server-mocks";
import { authScenarios } from "@/test/auth-mocks";
import { routerScenarios } from "@/test/router-mocks";

// Mock translation context directly
const mockT = vi.fn((key: string, params?: Record<string, string>) => {
  const translations: Record<string, string> = {
    "servers.loadingServerDetails": "Loading server details...",
    "errors.generic": "An error occurred",
    "errors.operationFailed": "Operation failed",
    "servers.serverNotFound": "Server not found",
    "servers.information": "Information",
    "servers.properties": "Properties",
    "servers.settings": "Settings",
    "servers.files": "Files",
    "servers.backups": "Backups",
    "servers.backupSchedule": "Backup Schedule",
    "servers.settings.title": "Settings",
    "servers.properties.title": "Properties",
    "servers.serverInformation": "Server Information",
    "servers.serverActions": "Server Actions",
    "servers.actions.start": "Start Server",
    "servers.actions.stop": "Stop Server",
    "servers.actions.restart": "Restart Server",
    "servers.actions.delete": "Delete Server",
    "servers.backToDashboard": "← Back to Dashboard",
    "servers.deleteConfirmation":
      "Are you sure you want to delete this server? This action cannot be undone.",
    "servers.fields.version": "Minecraft Version",
    "servers.fields.type": "Server Type",
    "servers.fields.maxPlayers": "Max Players",
    "servers.fields.memoryLimit": "Memory Limit",
    "servers.fields.port": "Port",
    "servers.fields.created": "Created",
    "servers.description": "Description",
    "servers.status.stopped": "Stopped",
    "servers.status.running": "Running",
    "servers.status.starting": "Starting",
    "servers.status.stopping": "Stopping",
    "servers.status.error": "Error",
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
  useTranslation: () => ({
    t: mockT,
    locale: "en",
  }),
}));

// Mock server service functions individually (avoiding namespace import issue)
vi.mock("@/services/server", () => ({
  getServer: vi.fn(),
  startServer: vi.fn(),
  stopServer: vi.fn(),
  restartServer: vi.fn(),
  deleteServer: vi.fn(),
  getServerProperties: vi.fn(),
  updateServerProperties: vi.fn(),
}));

// Mock child components to isolate page component testing
vi.mock("@/components/server/server-properties", () => ({
  ServerPropertiesEditor: ({ serverId }: { serverId: number }) => (
    <div data-testid="server-properties-editor">
      Properties Editor for Server {serverId}
    </div>
  ),
}));

vi.mock("@/components/server/server-settings", () => ({
  ServerSettings: ({
    server,
    onUpdate,
  }: {
    server: { id: number; name: string };
    onUpdate: (server: { id: number; name: string }) => void;
  }) => (
    <div data-testid="server-settings">
      Settings for {server.name}
      <button
        onClick={() => onUpdate({ ...server, name: "Updated " + server.name })}
      >
        Update Server
      </button>
    </div>
  ),
}));

vi.mock("@/components/server/file-explorer", () => ({
  FileExplorer: ({ serverId }: { serverId: number }) => (
    <div data-testid="file-explorer">File Explorer for Server {serverId}</div>
  ),
}));

vi.mock("@/components/server/server-backups", () => ({
  ServerBackups: ({ serverId }: { serverId: number }) => (
    <div data-testid="server-backups">Backups for Server {serverId}</div>
  ),
}));

// Import component after mocks are set up
import ServerDetailPage from "./page";
import * as serverService from "@/services/server";

describe("ServerDetailPage", () => {
  const user = userEvent.setup();

  // Get mocked service functions
  const mockGetServer = vi.mocked(serverService.getServer);
  const mockStartServer = vi.mocked(serverService.startServer);
  const mockStopServer = vi.mocked(serverService.stopServer);
  const mockRestartServer = vi.mocked(serverService.restartServer);
  const mockDeleteServer = vi.mocked(serverService.deleteServer);

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup successful authentication by default
    authScenarios.authenticated();

    // Setup router with server ID 1 by default
    routerScenarios.serverDetail("1");

    // Setup successful server service responses by default
    mockGetServer.mockResolvedValue(ok(mockServer));
    mockStartServer.mockResolvedValue(ok(undefined));
    mockStopServer.mockResolvedValue(ok(undefined));
    mockRestartServer.mockResolvedValue(ok(undefined));
    mockDeleteServer.mockResolvedValue(ok(undefined));
  });

  describe("Server Data Loading", () => {
    test("should render loading state while fetching server details", () => {
      // Make getServer return a never-resolving promise
      mockGetServer.mockImplementation(() => new Promise(() => {}));

      render(<ServerDetailPage />);

      expect(screen.getByText("Loading server details...")).toBeInTheDocument();
    });

    test("should render server information when data loads successfully", async () => {
      const testServer = createMockServer({
        status: ServerStatus.STOPPED,
        name: "Test Server",
        minecraft_version: "1.21.5",
        server_type: ServerType.VANILLA,
        max_players: 20,
        max_memory: 2048,
        port: 25565,
      });
      mockGetServer.mockResolvedValue(ok(testServer));

      render(<ServerDetailPage />);

      // Wait for server data to load
      await waitFor(() => {
        expect(screen.getByText("Test Server")).toBeInTheDocument();
      });

      // Verify server details are displayed
      expect(screen.getByText("1.21.5")).toBeInTheDocument();
      expect(screen.getByText("vanilla")).toBeInTheDocument();
      expect(screen.getByText("20")).toBeInTheDocument();
      expect(screen.getByText("2048MB")).toBeInTheDocument();
      expect(screen.getByText("25565")).toBeInTheDocument();

      // Verify API call was made with correct server ID
      expect(mockGetServer).toHaveBeenCalledWith(1);
    });

    test("should show error message when server fetch fails", async () => {
      mockGetServer.mockResolvedValue(
        err({ status: 500, message: "Internal server error" })
      );

      render(<ServerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("An error occurred")).toBeInTheDocument();
        expect(screen.getByText("Internal server error")).toBeInTheDocument();
      });
    });

    test("should show server not found when server fetch returns 404", async () => {
      mockGetServer.mockResolvedValue(
        err({ status: 404, message: "Server not found" })
      );

      render(<ServerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Server not found")).toBeInTheDocument();
      });
    });
  });

  describe("Tab Navigation", () => {
    test("should render information tab by default", async () => {
      render(<ServerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Test Server")).toBeInTheDocument();
      });

      const infoTab = screen.getByRole("button", { name: "Information" });
      expect(infoTab.className).toContain("activeTab");
      expect(screen.getByText("Server Information")).toBeInTheDocument();
    });

    test("should switch to properties tab when clicked", async () => {
      render(<ServerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Test Server")).toBeInTheDocument();
      });

      const propertiesTab = screen.getByRole("button", { name: "Properties" });
      await user.click(propertiesTab);

      expect(propertiesTab.className).toContain("activeTab");
      expect(
        screen.getByTestId("server-properties-editor")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Properties Editor for Server 1")
      ).toBeInTheDocument();
    });

    test("should switch to settings tab when clicked", async () => {
      render(<ServerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Test Server")).toBeInTheDocument();
      });

      const settingsTab = screen.getByRole("button", { name: "Settings" });
      await user.click(settingsTab);

      expect(settingsTab.className).toContain("activeTab");
      expect(screen.getByTestId("server-settings")).toBeInTheDocument();
      expect(screen.getByText("Settings for Test Server")).toBeInTheDocument();
    });

    test("should switch to files tab when clicked", async () => {
      render(<ServerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Test Server")).toBeInTheDocument();
      });

      const filesTab = screen.getByRole("button", { name: "Files" });
      await user.click(filesTab);

      expect(filesTab.className).toContain("activeTab");
      expect(screen.getByTestId("file-explorer")).toBeInTheDocument();
      expect(
        screen.getByText("File Explorer for Server 1")
      ).toBeInTheDocument();
    });

    test("should switch to backups tab when clicked", async () => {
      render(<ServerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Test Server")).toBeInTheDocument();
      });

      const backupsTab = screen.getByRole("button", { name: "Backups" });
      await user.click(backupsTab);

      expect(backupsTab.className).toContain("activeTab");
      expect(screen.getByTestId("server-backups")).toBeInTheDocument();
      expect(screen.getByText("Backups for Server 1")).toBeInTheDocument();
    });
  });

  describe("Server Actions", () => {
    test("should show start button for stopped server", async () => {
      const stoppedServer = createMockServer({ status: ServerStatus.STOPPED });
      mockGetServer.mockResolvedValue(ok(stoppedServer));

      render(<ServerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Test Server")).toBeInTheDocument();
      });

      expect(
        screen.getByRole("button", { name: "Start Server" })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Stop Server" })
      ).not.toBeInTheDocument();
    });

    test("should show stop and restart buttons for running server", async () => {
      const runningServer = createMockServer({ status: ServerStatus.RUNNING });
      mockGetServer.mockResolvedValue(ok(runningServer));

      render(<ServerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Test Server")).toBeInTheDocument();
      });

      expect(
        screen.getByRole("button", { name: "Stop Server" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Restart Server" })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Start Server" })
      ).not.toBeInTheDocument();
    });

    test("should handle server start action", async () => {
      const stoppedServer = createMockServer({ status: ServerStatus.STOPPED });
      mockGetServer.mockResolvedValue(ok(stoppedServer));

      render(<ServerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Test Server")).toBeInTheDocument();
      });

      const startButton = screen.getByRole("button", { name: "Start Server" });
      await user.click(startButton);

      expect(mockStartServer).toHaveBeenCalledWith(1);
    });

    test("should handle server stop action", async () => {
      const runningServer = createMockServer({ status: ServerStatus.RUNNING });
      mockGetServer.mockResolvedValue(ok(runningServer));

      render(<ServerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Test Server")).toBeInTheDocument();
      });

      const stopButton = screen.getByRole("button", { name: "Stop Server" });
      await user.click(stopButton);

      expect(mockStopServer).toHaveBeenCalledWith(1);
    });

    test("should handle server restart action", async () => {
      const runningServer = createMockServer({ status: ServerStatus.RUNNING });
      mockGetServer.mockResolvedValue(ok(runningServer));

      render(<ServerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Test Server")).toBeInTheDocument();
      });

      const restartButton = screen.getByRole("button", {
        name: "Restart Server",
      });
      await user.click(restartButton);

      expect(mockRestartServer).toHaveBeenCalledWith(1);
    });

    test("should handle server delete action with confirmation", async () => {
      const testServer = createMockServer({ status: ServerStatus.STOPPED });
      mockGetServer.mockResolvedValue(ok(testServer));

      // Mock window.confirm to return true
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

      render(<ServerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Test Server")).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole("button", {
        name: "Delete Server",
      });
      await user.click(deleteButton);

      expect(confirmSpy).toHaveBeenCalledWith(
        "Are you sure you want to delete this server? This action cannot be undone."
      );
      expect(mockDeleteServer).toHaveBeenCalledWith(1);

      confirmSpy.mockRestore();
    });

    test("should not delete server when confirmation is cancelled", async () => {
      const testServer = createMockServer({ status: ServerStatus.STOPPED });
      mockGetServer.mockResolvedValue(ok(testServer));

      // Mock window.confirm to return false
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

      render(<ServerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Test Server")).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole("button", {
        name: "Delete Server",
      });
      await user.click(deleteButton);

      expect(confirmSpy).toHaveBeenCalled();
      expect(mockDeleteServer).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });
  });

  describe("Error Handling", () => {
    test("should show error banner when server action fails", async () => {
      const testServer = createMockServer({ status: ServerStatus.STOPPED });
      mockGetServer.mockResolvedValue(ok(testServer));
      mockStartServer.mockResolvedValue(
        err({ status: 500, message: "Failed to start server" })
      );

      render(<ServerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Test Server")).toBeInTheDocument();
      });

      const startButton = screen.getByRole("button", { name: "Start Server" });
      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByText("Failed to start server")).toBeInTheDocument();
      });
    });

    test("should dismiss error banner when close button clicked", async () => {
      const testServer = createMockServer({ status: ServerStatus.STOPPED });
      mockGetServer.mockResolvedValue(ok(testServer));
      mockStartServer.mockResolvedValue(
        err({ status: 500, message: "Failed to start server" })
      );

      render(<ServerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Test Server")).toBeInTheDocument();
      });

      const startButton = screen.getByRole("button", { name: "Start Server" });
      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByText("Failed to start server")).toBeInTheDocument();
      });

      const dismissButton = screen.getByRole("button", { name: "×" });
      await user.click(dismissButton);

      expect(
        screen.queryByText("Failed to start server")
      ).not.toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    test("should handle different server types correctly", async () => {
      const paperServer = createMockServer({
        server_type: ServerType.PAPER,
        name: "Paper Server",
      });
      mockGetServer.mockResolvedValue(ok(paperServer));

      render(<ServerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Paper Server")).toBeInTheDocument();
        expect(screen.getByText("paper")).toBeInTheDocument();
      });
    });

    test("should handle server with no description", async () => {
      const serverWithoutDescription = createMockServer({ description: null });
      mockGetServer.mockResolvedValue(ok(serverWithoutDescription));

      render(<ServerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Test Server")).toBeInTheDocument();
      });

      expect(screen.queryByText("Description:")).not.toBeInTheDocument();
    });

    test("should handle invalid server ID", async () => {
      mockGetServer.mockResolvedValue(
        err({ status: 404, message: "Server not found" })
      );

      render(<ServerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Server not found")).toBeInTheDocument();
      });
    });

    test("should handle network errors gracefully", async () => {
      mockGetServer.mockResolvedValue(
        err({ status: 500, message: "Network error" })
      );

      render(<ServerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("An error occurred")).toBeInTheDocument();
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });
  });

  describe("Navigation", () => {
    test("should navigate back to dashboard when back button clicked", async () => {
      const { router } = routerScenarios.serverDetail("1");

      render(<ServerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Test Server")).toBeInTheDocument();
      });

      const backButton = screen.getByRole("button", {
        name: "← Back to Dashboard",
      });
      await user.click(backButton);

      expect(router.push).toHaveBeenCalledWith("/dashboard");
    });
  });
});
