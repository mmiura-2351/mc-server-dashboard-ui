import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ServerListItem } from "./ServerListItem";
import { ServerType, ServerStatus } from "@/types/server";
import type { MinecraftServer } from "@/types/server";

// Mock translation
vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockServer: MinecraftServer = {
  id: 1,
  name: "Test Server",
  minecraft_version: "1.21.6",
  server_type: ServerType.VANILLA,
  status: ServerStatus.RUNNING,
  max_memory: 2048,
  description: "Test server description",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  owner_id: 1,
  directory_path: "/servers/test",
  port: 25565,
  max_players: 20,
  template_id: null,
};

const mockProps = {
  server: mockServer,
  isActioning: false,
  onStart: vi.fn(),
  onStop: vi.fn(),
  onClick: vi.fn(),
};

describe("ServerListItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render server information correctly", () => {
    render(<ServerListItem {...mockProps} />);

    expect(screen.getByText("Test Server")).toBeInTheDocument();
    expect(screen.getByText("1.21.6")).toBeInTheDocument();
    expect(screen.getByText("2048")).toBeInTheDocument();
    expect(screen.getByText("servers.status.running")).toBeInTheDocument();
  });

  it("should handle server click", () => {
    render(<ServerListItem {...mockProps} />);

    const serverCard = screen.getByTestId("server-card");
    fireEvent.click(serverCard);

    expect(mockProps.onClick).toHaveBeenCalled();
  });

  it("should show start button for stopped server", () => {
    const stoppedServer = { ...mockServer, status: ServerStatus.STOPPED };
    render(<ServerListItem {...mockProps} server={stoppedServer} />);

    const startButton = screen.getByRole("button", { name: /start/i });
    expect(startButton).toBeInTheDocument();

    fireEvent.click(startButton);
    expect(mockProps.onStart).toHaveBeenCalled();
  });

  it("should show stop button for running server", () => {
    render(<ServerListItem {...mockProps} />);

    const stopButton = screen.getByRole("button", { name: /stop/i });
    expect(stopButton).toBeInTheDocument();

    fireEvent.click(stopButton);
    expect(mockProps.onStop).toHaveBeenCalled();
  });

  it("should show transitional state when actioning", () => {
    render(<ServerListItem {...mockProps} isActioning={true} />);

    // When server is actioning, no action buttons should be shown, only transitional state
    const buttons = screen.queryAllByRole("button");
    expect(buttons).toHaveLength(0);

    // Should show spinning indicator instead
    expect(screen.getByText("servers.status.running")).toBeInTheDocument();
  });

  it("should show different status colors", () => {
    const { rerender } = render(<ServerListItem {...mockProps} />);

    // Running status - check that CSS module class is applied
    const statusElement = screen.getByTestId("status-indicator").parentElement;
    expect(statusElement?.className).toMatch(/statusRunning/);

    // Stopped status
    const stoppedServer = { ...mockServer, status: ServerStatus.STOPPED };
    rerender(<ServerListItem {...mockProps} server={stoppedServer} />);
    const stoppedStatusElement =
      screen.getByTestId("status-indicator").parentElement;
    expect(stoppedStatusElement?.className).toMatch(/statusStopped/);

    // Error status
    const errorServer = { ...mockServer, status: ServerStatus.ERROR };
    rerender(<ServerListItem {...mockProps} server={errorServer} />);
    const errorStatusElement =
      screen.getByTestId("status-indicator").parentElement;
    expect(errorStatusElement?.className).toMatch(/statusError/);
  });

  it("should prevent action button clicks from triggering card click", () => {
    render(<ServerListItem {...mockProps} />);

    const stopButton = screen.getByRole("button", { name: /stop/i });
    fireEvent.click(stopButton);

    expect(mockProps.onStop).toHaveBeenCalled();
    expect(mockProps.onClick).not.toHaveBeenCalled();
  });

  it("should display server type correctly", () => {
    render(<ServerListItem {...mockProps} />);

    expect(screen.getByText("vanilla")).toBeInTheDocument();
  });

  it("should show transitional states", () => {
    const startingServer = { ...mockServer, status: ServerStatus.STARTING };
    render(<ServerListItem {...mockProps} server={startingServer} />);

    expect(screen.getAllByText("servers.status.starting")).toHaveLength(2); // One in status, one in transitional state
    const statusElement = screen.getByTestId("status-indicator").parentElement;
    expect(statusElement?.className).toMatch(/statusStarting/);
  });

  it("should handle servers without description", () => {
    const serverWithoutDesc = { ...mockServer, description: null };
    render(<ServerListItem {...mockProps} server={serverWithoutDesc} />);

    expect(screen.getByText("Test Server")).toBeInTheDocument();
    // Should not crash and should render without description
  });

  it("should format memory display correctly", () => {
    render(<ServerListItem {...mockProps} />);

    // Should show memory in MB
    expect(screen.getByText("2048")).toBeInTheDocument();
  });
});
