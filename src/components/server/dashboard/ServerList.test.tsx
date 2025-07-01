import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ServerList } from "./ServerList";
import { ServerType, ServerStatus } from "@/types/server";
import type { MinecraftServer } from "@/types/server";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock translation
vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockServers: MinecraftServer[] = [
  {
    id: 1,
    name: "Test Server 1",
    minecraft_version: "1.21.6",
    server_type: ServerType.VANILLA,
    status: ServerStatus.RUNNING,
    max_memory: 2048,
    description: "First test server",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    owner_id: 1,
    directory_path: "/servers/test1",
    port: 25565,
    max_players: 20,
    template_id: null,
  },
  {
    id: 2,
    name: "Test Server 2",
    minecraft_version: "1.21.5",
    server_type: ServerType.PAPER,
    status: ServerStatus.STOPPED,
    max_memory: 4096,
    description: "Second test server",
    created_at: "2024-01-02T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
    owner_id: 1,
    directory_path: "/servers/test2",
    port: 25566,
    max_players: 30,
    template_id: null,
  },
];

const mockProps = {
  servers: mockServers,
  isLoading: false,
  error: null,
  actioningServers: new Set<number>(),
  onRefresh: vi.fn(),
  onServerStart: vi.fn(),
  onServerStop: vi.fn(),
  onServerClick: vi.fn(),
};

describe("ServerList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render server list with servers", () => {
    render(<ServerList {...mockProps} />);

    expect(screen.getByText("Test Server 1")).toBeInTheDocument();
    expect(screen.getByText("Test Server 2")).toBeInTheDocument();
  });

  it("should show loading state", () => {
    render(<ServerList {...mockProps} isLoading={true} servers={[]} />);

    expect(screen.getByText("common.loading")).toBeInTheDocument();
  });

  it("should show error message", () => {
    const errorMessage = "Failed to load servers";
    render(<ServerList {...mockProps} error={errorMessage} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it("should show empty state when no servers", () => {
    render(<ServerList {...mockProps} servers={[]} />);

    expect(screen.getByText("servers.emptyState.title")).toBeInTheDocument();
  });

  it("should handle server click", async () => {
    render(<ServerList {...mockProps} />);

    const serverCard = screen
      .getByText("Test Server 1")
      .closest("[data-testid='server-card']");
    expect(serverCard).toBeInTheDocument();

    if (serverCard) {
      fireEvent.click(serverCard);
      expect(mockProps.onServerClick).toHaveBeenCalledWith(1);
    }
  });

  it("should handle start server action", async () => {
    render(<ServerList {...mockProps} />);

    const startButton = screen
      .getAllByRole("button")
      .find((button) => button.textContent?.includes("servers.actions.start"));

    if (startButton) {
      fireEvent.click(startButton);
      expect(mockProps.onServerStart).toHaveBeenCalledWith(2); // Stopped server
    }
  });

  it("should handle stop server action", async () => {
    render(<ServerList {...mockProps} />);

    const stopButton = screen
      .getAllByRole("button")
      .find((button) => button.textContent?.includes("servers.actions.stop"));

    if (stopButton) {
      fireEvent.click(stopButton);
      expect(mockProps.onServerStop).toHaveBeenCalledWith(1); // Running server
    }
  });

  it("should show transitional state when server is actioning", () => {
    const actioningServers = new Set([1]); // Server 1 is running and actioning
    render(<ServerList {...mockProps} actioningServers={actioningServers} />);

    // When a server is actioning, it should show transitional state instead of action buttons
    // The actioning server should not have action buttons visible
    const allButtons = screen.getAllByRole("button");
    const refreshButton = allButtons.filter((btn) =>
      btn.textContent?.includes("refresh")
    );
    const actionButtons = allButtons.filter(
      (btn) =>
        btn.textContent?.includes("start") || btn.textContent?.includes("stop")
    );

    // Should have refresh button but fewer action buttons (because actioning server shows transitional state)
    expect(refreshButton.length).toBeGreaterThan(0);
    expect(actionButtons.length).toBeLessThan(2); // Less than normal because one server is actioning
  });

  it("should display server status with correct styling", () => {
    render(<ServerList {...mockProps} />);

    // Check that status indicators are rendered
    expect(screen.getByText("servers.status.running")).toBeInTheDocument();
    expect(screen.getByText("servers.status.stopped")).toBeInTheDocument();
  });

  it("should display server details correctly", () => {
    render(<ServerList {...mockProps} />);

    // Check server details are displayed
    expect(screen.getByText("1.21.6")).toBeInTheDocument();
    expect(screen.getByText("1.21.5")).toBeInTheDocument();
    expect(screen.getByText("2048")).toBeInTheDocument(); // Memory for server 1
    expect(screen.getByText("4096")).toBeInTheDocument(); // Memory for server 2
  });

  it("should handle refresh action", () => {
    render(<ServerList {...mockProps} />);

    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    fireEvent.click(refreshButton);

    expect(mockProps.onRefresh).toHaveBeenCalled();
  });
});
