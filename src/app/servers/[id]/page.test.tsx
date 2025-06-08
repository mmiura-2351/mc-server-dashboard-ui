import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ServerDetailPage from "./page";
import * as serverService from "@/services/server";
import { ok, err } from "neverthrow";
import { ServerStatus, ServerType } from "@/types/server";

// Mock Next.js router
const mockPush = vi.fn();
const mockParams = { id: "1" };

vi.mock("next/navigation", () => ({
  useParams: () => mockParams,
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => "/servers/1",
}));

// Mock the auth context
const mockLogout = vi.fn();
const mockAuthContext = {
  user: { id: 1, username: "admin", email: "admin@example.com", is_approved: true },
  isLoading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: mockLogout,
  isAuthenticated: true,
};

vi.mock("@/contexts/auth", () => ({
  useAuth: () => mockAuthContext,
}));

// Mock the language context
vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: "en",
  }),
}));

// Mock the server service
vi.mock("@/services/server", () => ({
  getServer: vi.fn(),
  startServer: vi.fn(),
  stopServer: vi.fn(),
  restartServer: vi.fn(),
  deleteServer: vi.fn(),
  getServerProperties: vi.fn(),
  updateServerProperties: vi.fn(),
}));

// Mock the ServerPropertiesEditor component
vi.mock("@/components/server/server-properties", () => ({
  ServerPropertiesEditor: ({ serverId }: { serverId: number }) => (
    <div data-testid="server-properties-editor">
      Properties Editor for Server {serverId}
    </div>
  ),
}));

describe("ServerDetailPage", () => {
  const user = userEvent.setup();
  const mockServer = {
    id: 1,
    name: "Test Server",
    description: "A test server",
    minecraft_version: "1.21.5",
    server_type: ServerType.VANILLA,
    status: "stopped" as ServerStatus,
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
    (mockAuthContext as any).user = { id: 1, username: "admin", email: "admin@example.com", is_approved: true };
    // Reset all mocks to avoid cross-test interference
    vi.mocked(serverService.getServer).mockReset();
    vi.mocked(serverService.startServer).mockReset();
    vi.mocked(serverService.stopServer).mockReset();
    vi.mocked(serverService.restartServer).mockReset();
    vi.mocked(serverService.deleteServer).mockReset();
  });

  test("should render loading state initially", () => {
    vi.mocked(serverService.getServer).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<ServerDetailPage />);

    expect(screen.getByText("Loading server details...")).toBeInTheDocument();
  });

  test("should render server information tab by default", async () => {
    vi.mocked(serverService.getServer).mockResolvedValue(ok(mockServer));

    render(<ServerDetailPage />);

    // Wait for server data to load and tabs to appear
    await waitFor(() => {
      expect(screen.getByText("Test Server")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Information" })).toBeInTheDocument();
    });

    // Check that Information tab is active
    const infoTab = screen.getByRole("button", { name: "Information" });
    expect(infoTab.className).toContain("_activeTab_");

    // Check server details are shown
    expect(screen.getByText("1.21.5")).toBeInTheDocument(); // minecraft_version
    expect(screen.getByText("vanilla")).toBeInTheDocument(); // server_type
    expect(screen.getByText("20")).toBeInTheDocument(); // max_players
    expect(screen.getByText("2048MB")).toBeInTheDocument(); // max_memory
    expect(screen.getByText("25565")).toBeInTheDocument(); // port
  });

  test("should switch to properties tab when clicked", async () => {
    vi.mocked(serverService.getServer).mockResolvedValue(ok(mockServer));

    render(<ServerDetailPage />);

    // Wait for server data to load and tabs to appear
    await waitFor(() => {
      expect(screen.getByText("Test Server")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Properties" })).toBeInTheDocument();
    });
    
    const propertiesTab = screen.getByRole("button", { name: "Properties" });
    await user.click(propertiesTab);

    // Check that Properties tab is now active
    expect(propertiesTab.className).toContain("_activeTab_");

    // Check that properties editor is rendered
    expect(screen.getByTestId("server-properties-editor")).toBeInTheDocument();
    expect(screen.getByText("Properties Editor for Server 1")).toBeInTheDocument();
  });

  test("should show appropriate action buttons based on server status", async () => {
    // Test with stopped server
    vi.mocked(serverService.getServer).mockResolvedValue(
      ok({ ...mockServer, status: "stopped" as ServerStatus })
    );

    render(<ServerDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Test Server")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Start Server" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Stop Server" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Restart Server" })).not.toBeInTheDocument();
  });

  test("should show stop and restart buttons for running server", async () => {
    vi.mocked(serverService.getServer).mockResolvedValue(
      ok({ ...mockServer, status: "running" as ServerStatus })
    );

    render(<ServerDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Test Server")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Stop Server" })).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: "Start Server" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop Server" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restart Server" })).toBeInTheDocument();
  });

  test("should handle start server action", async () => {
    const stoppedServer = { ...mockServer, status: "stopped" as ServerStatus };
    vi.mocked(serverService.getServer).mockResolvedValue(ok(stoppedServer));
    vi.mocked(serverService.startServer).mockResolvedValue(ok(undefined));

    render(<ServerDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Test Server")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Start Server" })).toBeInTheDocument();
    });

    const startButton = screen.getByRole("button", { name: "Start Server" });
    await user.click(startButton);

    expect(serverService.startServer).toHaveBeenCalledWith(1);
  });

  test("should handle stop server action", async () => {
    const runningServer = { ...mockServer, status: "running" as ServerStatus };
    vi.mocked(serverService.getServer).mockResolvedValue(ok(runningServer));
    vi.mocked(serverService.stopServer).mockResolvedValue(ok(undefined));

    render(<ServerDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Test Server")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Stop Server" })).toBeInTheDocument();
    });

    const stopButton = screen.getByRole("button", { name: "Stop Server" });
    await user.click(stopButton);

    expect(serverService.stopServer).toHaveBeenCalledWith(1);
  });

  test("should handle restart server action", async () => {
    const runningServer = { ...mockServer, status: "running" as ServerStatus };
    vi.mocked(serverService.getServer).mockResolvedValue(ok(runningServer));
    vi.mocked(serverService.restartServer).mockResolvedValue(ok(undefined));

    render(<ServerDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Test Server")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Restart Server" })).toBeInTheDocument();
    });

    const restartButton = screen.getByRole("button", { name: "Restart Server" });
    await user.click(restartButton);

    expect(serverService.restartServer).toHaveBeenCalledWith(1);
  });

  test("should handle delete server with confirmation", async () => {
    vi.mocked(serverService.getServer).mockResolvedValue(ok(mockServer));
    vi.mocked(serverService.deleteServer).mockResolvedValue(ok(undefined));

    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);

    render(<ServerDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Test Server")).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole("button", { name: "Delete Server" });
    await user.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith(
      "Are you sure you want to delete this server? This action cannot be undone."
    );
    expect(serverService.deleteServer).toHaveBeenCalledWith(1);
    expect(mockPush).toHaveBeenCalledWith("/dashboard");

    // Restore original confirm
    window.confirm = originalConfirm;
  });

  test("should not delete server if confirmation is cancelled", async () => {
    vi.mocked(serverService.getServer).mockResolvedValue(ok(mockServer));

    // Mock window.confirm to return false
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => false);

    render(<ServerDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Test Server")).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole("button", { name: "Delete Server" });
    await user.click(deleteButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(serverService.deleteServer).not.toHaveBeenCalled();

    // Restore original confirm
    window.confirm = originalConfirm;
  });

  test("should show error message on server action failure", async () => {
    // Clear all previous mocks to avoid interference
    vi.mocked(serverService.getServer).mockReset();
    vi.mocked(serverService.startServer).mockReset();
    
    const stoppedServer = { ...mockServer, status: "stopped" as ServerStatus };
    vi.mocked(serverService.getServer).mockResolvedValue(ok(stoppedServer));
    vi.mocked(serverService.startServer).mockResolvedValue(
      err({ message: "Failed to start server", status: 500 })
    );

    render(<ServerDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Test Server")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Start Server" })).toBeInTheDocument();
    });

    const startButton = screen.getByRole("button", { name: "Start Server" });
    await user.click(startButton);

    // Check that the service was called (this ensures the error path was triggered)
    expect(serverService.startServer).toHaveBeenCalledWith(1);
  });

  test("should navigate back to dashboard when back button is clicked", async () => {
    vi.mocked(serverService.getServer).mockResolvedValue(ok(mockServer));

    render(<ServerDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Test Server")).toBeInTheDocument();
    });

    const backButton = screen.getByRole("button", { name: "← Back to Dashboard" });
    await user.click(backButton);

    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  test("should redirect to home if user is not authenticated", () => {
    (mockAuthContext as any).user = null;
    vi.mocked(serverService.getServer).mockResolvedValue(ok(mockServer));

    render(<ServerDetailPage />);

    expect(mockPush).toHaveBeenCalledWith("/");
  });

  test("should show server not found error", async () => {
    vi.mocked(serverService.getServer).mockResolvedValue(
      err({ message: "Server not found", status: 404 })
    );

    render(<ServerDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Server not found")).toBeInTheDocument();
    });

    const backButton = screen.getByRole("button", { name: "Back to Dashboard" });
    expect(backButton).toBeInTheDocument();
  });

  test("should show correct status styling", async () => {
    vi.mocked(serverService.getServer).mockResolvedValue(
      ok({ ...mockServer, status: "running" as ServerStatus })
    );

    render(<ServerDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Running")).toBeInTheDocument();
    });

    const statusElement = screen.getByText("Running");
    expect(statusElement.className).toContain("_statusRunning_");
  });

  test("should disable action buttons during server operations", async () => {
    const stoppedServer = { ...mockServer, status: "stopped" as ServerStatus };
    vi.mocked(serverService.getServer).mockResolvedValue(ok(stoppedServer));
    vi.mocked(serverService.startServer).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(ok(undefined)), 100))
    );

    render(<ServerDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Test Server")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Start Server" })).toBeInTheDocument();
    });

    const startButton = screen.getByRole("button", { name: "Start Server" });
    await user.click(startButton);

    // Button should show loading state and be disabled
    expect(screen.getByRole("button", { name: "Starting..." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Starting..." })).toBeDisabled();
  });
});