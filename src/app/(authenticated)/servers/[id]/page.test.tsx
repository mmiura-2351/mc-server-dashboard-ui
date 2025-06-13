import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ok, err } from "neverthrow";
import { ServerStatus, ServerType } from "@/types/server";
import { mockServer, createMockServer } from "@/test/server-mocks";
import { mockAuthenticatedUser } from "@/test/auth-mocks";
import { createMockTranslation } from "@/test/translation-mocks";

// Mock Next.js navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "1" }),
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => "/servers/1",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock auth context
const mockAuthContext = {
  user: mockAuthenticatedUser,
  isLoading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  isAuthenticated: true,
  updateUserInfo: vi.fn(),
  updatePassword: vi.fn(),
  deleteAccount: vi.fn(),
  refreshUser: vi.fn(),
};

vi.mock("@/contexts/auth", () => ({
  useAuth: () => mockAuthContext,
}));

// Mock language context
const mockT = createMockTranslation();

vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({
    t: mockT,
    locale: "en",
  }),
}));

// Mock server service
const mockGetServer = vi.fn();
const mockStartServer = vi.fn();
const mockStopServer = vi.fn();
const mockRestartServer = vi.fn();
const mockDeleteServer = vi.fn();

vi.mock("@/services/server", () => ({
  getServer: mockGetServer,
  startServer: mockStartServer,
  stopServer: mockStopServer,
  restartServer: mockRestartServer,
  deleteServer: mockDeleteServer,
}));

// Mock child components
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

// Import component after mocks
import ServerDetailPage from "./page";

describe("ServerDetailPage", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServer.mockResolvedValue(ok(mockServer));
  });

  describe("Server Data Loading", () => {
    test("should render loading state while fetching server details", () => {
      mockGetServer.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<ServerDetailPage />);

      expect(screen.getByText("Loading server details...")).toBeInTheDocument();
    });

    test("should render server information when data loads successfully", async () => {
      const testServer = createMockServer({ status: ServerStatus.STOPPED });
      mockGetServer.mockResolvedValue(ok(testServer));

      render(<ServerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Test Server")).toBeInTheDocument();
      });

      expect(screen.getByText("1.21.5")).toBeInTheDocument(); // minecraft_version
      expect(screen.getByText("vanilla")).toBeInTheDocument(); // server_type
      expect(screen.getByText("20")).toBeInTheDocument(); // max_players
      expect(screen.getByText("2048MB")).toBeInTheDocument(); // max_memory
      expect(screen.getByText("25565")).toBeInTheDocument(); // port
    });

    test("should show error message when server fetch fails", async () => {
      mockGetServer.mockResolvedValue(err("Server not found"));

      render(<ServerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("An error occurred")).toBeInTheDocument();
        expect(screen.getByText("Server not found")).toBeInTheDocument();
      });
    });

    test("should show server not found when server is null", async () => {
      mockGetServer.mockResolvedValue(ok(null));

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
      mockStartServer.mockResolvedValue(ok(undefined));

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
      mockStopServer.mockResolvedValue(ok(undefined));

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
      mockRestartServer.mockResolvedValue(ok(undefined));

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

    test("should handle server delete action", async () => {
      const testServer = createMockServer({ status: ServerStatus.STOPPED });
      mockGetServer.mockResolvedValue(ok(testServer));
      mockDeleteServer.mockResolvedValue(ok(undefined));

      // Mock window.confirm
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
  });

  describe("Error Handling", () => {
    test("should show error banner when server action fails", async () => {
      const testServer = createMockServer({ status: ServerStatus.STOPPED });
      mockGetServer.mockResolvedValue(ok(testServer));
      mockStartServer.mockResolvedValue(err("Failed to start server"));

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
      mockStartServer.mockResolvedValue(err("Failed to start server"));

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

  describe("Navigation", () => {
    test("should navigate back to dashboard when back button clicked", async () => {
      render(<ServerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("Test Server")).toBeInTheDocument();
      });

      const backButton = screen.getByRole("button", {
        name: "← Back to Dashboard",
      });
      await user.click(backButton);

      expect(mockPush).toHaveBeenCalledWith("/dashboard");
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
      mockGetServer.mockResolvedValue(err("Invalid server ID"));

      render(<ServerDetailPage />);

      await waitFor(() => {
        expect(screen.getByText("An error occurred")).toBeInTheDocument();
      });
    });
  });
});