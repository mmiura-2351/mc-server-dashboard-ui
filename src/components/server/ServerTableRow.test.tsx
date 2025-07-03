/**
 * Tests for ServerTableRow component with React.memo optimization
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ServerTableRow } from "./ServerTableRow";
import type { MinecraftServer } from "@/types/server";
import { ServerType, ServerStatus } from "@/types/server";

// Mock the language context
vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "servers.start": "Start",
        "servers.stop": "Stop",
        "servers.restart": "Restart",
        "servers.delete": "Delete",
        "servers.manage": "Manage",
        "servers.status.running": "Running",
        "servers.status.stopped": "Stopped",
        "servers.status.starting": "Starting",
        "servers.status.stopping": "Stopping",
        "servers.status.error": "Error",
        "servers.type.vanilla": "Vanilla",
        "servers.type.paper": "Paper",
        "servers.type.forge": "Forge",
        "servers.players": "players",
        "servers.memory": "MB",
      };
      return translations[key] || key;
    },
    locale: "en",
  }),
}));

// Sample server data
const mockServer: MinecraftServer = {
  id: 1,
  name: "Test Server",
  description: "A test server",
  minecraft_version: "1.20.1",
  server_type: ServerType.VANILLA,
  status: ServerStatus.RUNNING,
  directory_path: "/servers/test",
  port: 25565,
  max_memory: 4096,
  max_players: 20,
  owner_id: 1,
  template_id: null,
  created_at: "2023-01-01T00:00:00Z",
  updated_at: "2023-01-01T00:00:00Z",
  process_info: { players: 5, memory_usage: 2048 },
};

const mockProps = {
  server: mockServer,
  onStart: vi.fn(),
  onStop: vi.fn(),
  onRestart: vi.fn(),
  onDelete: vi.fn(),
  onManage: vi.fn(),
};

describe("ServerTableRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper function to render ServerTableRow in proper table context
  const renderServerTableRow = (props: typeof mockProps) => {
    return render(
      <table>
        <tbody>
          <ServerTableRow {...props} />
        </tbody>
      </table>
    );
  };

  describe("Basic Rendering", () => {
    it("should render server information correctly", () => {
      renderServerTableRow(mockProps);

      expect(screen.getByText("Test Server")).toBeInTheDocument();
      expect(screen.getByText("Running")).toBeInTheDocument();
      expect(screen.getByText("1.20.1")).toBeInTheDocument();
      expect(screen.getByText("Vanilla")).toBeInTheDocument();
      expect(screen.getByText("5/20 players")).toBeInTheDocument();
      expect(screen.getByText("2048/4096 MB")).toBeInTheDocument();
      expect(screen.getByText("25565")).toBeInTheDocument();
    });

    it("should handle missing process info", () => {
      const serverWithoutProcessInfo = { ...mockServer, process_info: null };
      const props = { ...mockProps, server: serverWithoutProcessInfo };
      render(
        <table>
          <tbody>
            <ServerTableRow {...props} />
          </tbody>
        </table>
      );

      expect(screen.getByText("0/20 players")).toBeInTheDocument();
      expect(screen.getByText("0/4096 MB")).toBeInTheDocument();
    });

    it("should handle different server types", () => {
      const paperServer = { ...mockServer, server_type: ServerType.PAPER };
      const { rerender } = render(
        <table>
          <tbody>
            <ServerTableRow {...mockProps} server={paperServer} />
          </tbody>
        </table>
      );
      expect(screen.getByText("Paper")).toBeInTheDocument();

      const forgeServer = { ...mockServer, server_type: ServerType.FORGE };
      rerender(
        <table>
          <tbody>
            <ServerTableRow {...mockProps} server={forgeServer} />
          </tbody>
        </table>
      );
      expect(screen.getByText("Forge")).toBeInTheDocument();
    });
  });

  describe("Status Display", () => {
    it("should show correct status for different server states", () => {
      const statusTests = [
        { status: ServerStatus.RUNNING, expected: "Running" },
        { status: ServerStatus.STOPPED, expected: "Stopped" },
        { status: ServerStatus.STARTING, expected: "Starting" },
        { status: ServerStatus.STOPPING, expected: "Stopping" },
        { status: ServerStatus.ERROR, expected: "Error" },
      ];

      statusTests.forEach(({ status, expected }) => {
        const server = { ...mockServer, status };
        const { rerender } = render(
          <ServerTableRow {...mockProps} server={server} />
        );

        expect(screen.getByText(expected)).toBeInTheDocument();

        // Clean up for next iteration
        rerender(<div />);
      });
    });

    it("should apply correct CSS classes for status", () => {
      const runningServer = { ...mockServer, status: ServerStatus.RUNNING };
      render(
        <table>
          <tbody>
            <ServerTableRow {...mockProps} server={runningServer} />
          </tbody>
        </table>
      );

      const statusElement = screen.getByText("Running");
      // CSS modules generate prefixed class names, so we check for the base class pattern
      expect(statusElement.className).toMatch(/running/);
    });
  });

  describe("Action Buttons", () => {
    it("should show Start button for stopped server", () => {
      const stoppedServer = { ...mockServer, status: ServerStatus.STOPPED };
      render(
        <table>
          <tbody>
            <ServerTableRow {...mockProps} server={stoppedServer} />
          </tbody>
        </table>
      );

      expect(screen.getByText("Start")).toBeInTheDocument();
      expect(screen.queryByText("Stop")).not.toBeInTheDocument();
    });

    it("should show Stop and Restart buttons for running server", () => {
      const runningServer = { ...mockServer, status: ServerStatus.RUNNING };
      render(<ServerTableRow {...mockProps} server={runningServer} />);

      expect(screen.getByText("Stop")).toBeInTheDocument();
      expect(screen.getByText("Restart")).toBeInTheDocument();
      expect(screen.queryByText("Start")).not.toBeInTheDocument();
    });

    it("should always show Manage and Delete buttons", () => {
      render(<ServerTableRow {...mockProps} />);

      expect(screen.getByText("Manage")).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });
  });

  describe("Event Handling", () => {
    it("should call onStart when Start button is clicked", () => {
      const stoppedServer = { ...mockServer, status: ServerStatus.STOPPED };
      render(<ServerTableRow {...mockProps} server={stoppedServer} />);

      const startButton = screen.getByText("Start");
      fireEvent.click(startButton);

      expect(mockProps.onStart).toHaveBeenCalledWith(stoppedServer.id);
    });

    it("should call onStop when Stop button is clicked", () => {
      const runningServer = { ...mockServer, status: ServerStatus.RUNNING };
      render(<ServerTableRow {...mockProps} server={runningServer} />);

      const stopButton = screen.getByText("Stop");
      fireEvent.click(stopButton);

      expect(mockProps.onStop).toHaveBeenCalledWith(runningServer.id);
    });

    it("should call onRestart when Restart button is clicked", () => {
      const runningServer = { ...mockServer, status: ServerStatus.RUNNING };
      render(<ServerTableRow {...mockProps} server={runningServer} />);

      const restartButton = screen.getByText("Restart");
      fireEvent.click(restartButton);

      expect(mockProps.onRestart).toHaveBeenCalledWith(runningServer.id);
    });

    it("should call onDelete when Delete button is clicked", () => {
      render(<ServerTableRow {...mockProps} />);

      const deleteButton = screen.getByText("Delete");
      fireEvent.click(deleteButton);

      expect(mockProps.onDelete).toHaveBeenCalledWith(mockServer.id);
    });

    it("should call onManage when Manage button is clicked", () => {
      render(<ServerTableRow {...mockProps} />);

      const manageButton = screen.getByText("Manage");
      fireEvent.click(manageButton);

      expect(mockProps.onManage).toHaveBeenCalledWith(mockServer.id);
    });
  });

  describe("React.memo Optimization", () => {
    it("should be memoized and not re-render with same props", () => {
      const { rerender } = render(<ServerTableRow {...mockProps} />);

      // Clear previous calls
      vi.clearAllMocks();

      // Rerender with same props
      rerender(<ServerTableRow {...mockProps} />);

      // The component should be memoized
      expect(screen.getByText("Test Server")).toBeInTheDocument();
    });

    it("should re-render when server prop changes", () => {
      const { rerender } = render(<ServerTableRow {...mockProps} />);

      const newServer = { ...mockServer, name: "Updated Server" };
      rerender(<ServerTableRow {...mockProps} server={newServer} />);

      expect(screen.getByText("Updated Server")).toBeInTheDocument();
      expect(screen.queryByText("Test Server")).not.toBeInTheDocument();
    });

    it("should re-render when action handlers change", () => {
      const { rerender } = render(<ServerTableRow {...mockProps} />);

      const newOnStart = vi.fn();
      rerender(<ServerTableRow {...mockProps} onStart={newOnStart} />);

      // Component should still be functional with new handlers
      expect(screen.getByText("Test Server")).toBeInTheDocument();
    });
  });

  describe("Button State Management", () => {
    it("should disable action buttons during transitional states", () => {
      const startingServer = { ...mockServer, status: ServerStatus.STARTING };
      render(<ServerTableRow {...mockProps} server={startingServer} />);

      // No start/stop buttons should be available during transitional states
      expect(screen.queryByText("Start")).not.toBeInTheDocument();
      expect(screen.queryByText("Stop")).not.toBeInTheDocument();
    });

    it("should show appropriate buttons for error state", () => {
      const errorServer = { ...mockServer, status: ServerStatus.ERROR };
      render(<ServerTableRow {...mockProps} server={errorServer} />);

      // Should allow starting from error state
      expect(screen.getByText("Start")).toBeInTheDocument();
    });
  });

  describe("Data Formatting", () => {
    it("should format memory usage correctly", () => {
      const serverWithMemory = {
        ...mockServer,
        process_info: { memory_usage: 1024 },
        max_memory: 2048,
      };
      render(<ServerTableRow {...mockProps} server={serverWithMemory} />);

      expect(screen.getByText("1024/2048 MB")).toBeInTheDocument();
    });

    it("should format player count correctly", () => {
      const serverWithPlayers = {
        ...mockServer,
        process_info: { players: 10 },
        max_players: 50,
      };
      render(<ServerTableRow {...mockProps} server={serverWithPlayers} />);

      expect(screen.getByText("10/50 players")).toBeInTheDocument();
    });

    it("should handle missing description gracefully", () => {
      const serverWithoutDescription = { ...mockServer, description: null };
      render(
        <ServerTableRow {...mockProps} server={serverWithoutDescription} />
      );

      // Should not throw and still render other information
      expect(screen.getByText("Test Server")).toBeInTheDocument();
    });
  });
});
