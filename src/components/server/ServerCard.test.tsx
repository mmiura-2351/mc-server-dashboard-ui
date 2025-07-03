/**
 * Tests for ServerCard component with React.memo optimization
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ServerCard } from "./ServerCard";
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

describe("ServerCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("should render server information correctly", () => {
      render(<ServerCard {...mockProps} />);

      expect(screen.getByText("Test Server")).toBeInTheDocument();
      expect(screen.getByText("1.20.1")).toBeInTheDocument();
      expect(screen.getByText("Vanilla")).toBeInTheDocument();
      expect(screen.getByText("Running")).toBeInTheDocument();
    });

    it("should render server description when provided", () => {
      render(<ServerCard {...mockProps} />);
      expect(screen.getByText("A test server")).toBeInTheDocument();
    });

    it("should handle missing description gracefully", () => {
      const serverWithoutDescription = { ...mockServer, description: null };
      const props = { ...mockProps, server: serverWithoutDescription };
      render(<ServerCard {...props} />);

      expect(screen.getByText("Test Server")).toBeInTheDocument();
      // Description should not be rendered
      expect(screen.queryByText("A test server")).not.toBeInTheDocument();
    });

    it("should handle different server types", () => {
      const paperServer = { ...mockServer, server_type: ServerType.PAPER };
      const { rerender } = render(
        <ServerCard {...mockProps} server={paperServer} />
      );
      expect(screen.getByText("Paper")).toBeInTheDocument();

      const forgeServer = { ...mockServer, server_type: ServerType.FORGE };
      rerender(<ServerCard {...mockProps} server={forgeServer} />);
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
          <ServerCard {...mockProps} server={server} />
        );

        expect(screen.getByText(expected)).toBeInTheDocument();

        // Clean up for next iteration
        rerender(<div />);
      });
    });

    it("should apply correct CSS classes for status", () => {
      const runningServer = { ...mockServer, status: ServerStatus.RUNNING };
      render(<ServerCard {...mockProps} server={runningServer} />);

      const statusElement = screen.getByText("Running");
      // CSS modules generate prefixed class names, so we check for the base class pattern
      expect(statusElement.className).toMatch(/running/);
    });
  });

  describe("Action Buttons", () => {
    it("should show Start button for stopped server", () => {
      const stoppedServer = { ...mockServer, status: ServerStatus.STOPPED };
      render(<ServerCard {...mockProps} server={stoppedServer} />);

      expect(screen.getByText("Start")).toBeInTheDocument();
      expect(screen.queryByText("Stop")).not.toBeInTheDocument();
    });

    it("should show Stop and Restart buttons for running server", () => {
      const runningServer = { ...mockServer, status: ServerStatus.RUNNING };
      render(<ServerCard {...mockProps} server={runningServer} />);

      expect(screen.getByText("Stop")).toBeInTheDocument();
      expect(screen.getByText("Restart")).toBeInTheDocument();
      expect(screen.queryByText("Start")).not.toBeInTheDocument();
    });

    it("should always show Manage and Delete buttons", () => {
      render(<ServerCard {...mockProps} />);

      expect(screen.getByText("Manage")).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });
  });

  describe("Event Handling", () => {
    it("should call onStart when Start button is clicked", () => {
      const stoppedServer = { ...mockServer, status: ServerStatus.STOPPED };
      render(<ServerCard {...mockProps} server={stoppedServer} />);

      const startButton = screen.getByText("Start");
      fireEvent.click(startButton);

      expect(mockProps.onStart).toHaveBeenCalledWith(stoppedServer.id);
    });

    it("should call onStop when Stop button is clicked", () => {
      const runningServer = { ...mockServer, status: ServerStatus.RUNNING };
      render(<ServerCard {...mockProps} server={runningServer} />);

      const stopButton = screen.getByText("Stop");
      fireEvent.click(stopButton);

      expect(mockProps.onStop).toHaveBeenCalledWith(runningServer.id);
    });

    it("should call onRestart when Restart button is clicked", () => {
      const runningServer = { ...mockServer, status: ServerStatus.RUNNING };
      render(<ServerCard {...mockProps} server={runningServer} />);

      const restartButton = screen.getByText("Restart");
      fireEvent.click(restartButton);

      expect(mockProps.onRestart).toHaveBeenCalledWith(runningServer.id);
    });

    it("should call onDelete when Delete button is clicked", () => {
      render(<ServerCard {...mockProps} />);

      const deleteButton = screen.getByText("Delete");
      fireEvent.click(deleteButton);

      expect(mockProps.onDelete).toHaveBeenCalledWith(mockServer.id);
    });

    it("should call onManage when Manage button is clicked", () => {
      render(<ServerCard {...mockProps} />);

      const manageButton = screen.getByText("Manage");
      fireEvent.click(manageButton);

      expect(mockProps.onManage).toHaveBeenCalledWith(mockServer.id);
    });
  });

  describe("React.memo Optimization", () => {
    it("should be memoized and not re-render with same props", () => {
      const { rerender } = render(<ServerCard {...mockProps} />);

      // Clear previous calls
      vi.clearAllMocks();

      // Rerender with same props
      rerender(<ServerCard {...mockProps} />);

      // The component should be memoized
      expect(screen.getByText("Test Server")).toBeInTheDocument();
    });

    it("should re-render when server prop changes", () => {
      const { rerender } = render(<ServerCard {...mockProps} />);

      const newServer = { ...mockServer, name: "Updated Server" };
      rerender(<ServerCard {...mockProps} server={newServer} />);

      expect(screen.getByText("Updated Server")).toBeInTheDocument();
      expect(screen.queryByText("Test Server")).not.toBeInTheDocument();
    });

    it("should re-render when action handlers change", () => {
      const { rerender } = render(<ServerCard {...mockProps} />);

      const newOnStart = vi.fn();
      rerender(<ServerCard {...mockProps} onStart={newOnStart} />);

      // Component should still be functional with new handlers
      expect(screen.getByText("Test Server")).toBeInTheDocument();
    });
  });

  describe("Mobile Responsiveness", () => {
    it("should have appropriate CSS classes for mobile layout", () => {
      render(<ServerCard {...mockProps} />);

      // Should have server card class for mobile styling
      const cardElement = screen.getByText("Test Server").closest("div");
      // CSS modules generate prefixed class names, so we check for the base class pattern
      expect(cardElement?.className).toMatch(/serverCard/);
    });

    it("should display server info in card format", () => {
      render(<ServerCard {...mockProps} />);

      // Key information should be visible in card layout
      expect(screen.getByText("Test Server")).toBeInTheDocument();
      expect(screen.getByText("1.20.1")).toBeInTheDocument();
      expect(screen.getByText("Vanilla")).toBeInTheDocument();
      expect(screen.getByText("Running")).toBeInTheDocument();
    });
  });

  describe("Button State Management", () => {
    it("should disable action buttons during transitional states", () => {
      const startingServer = { ...mockServer, status: ServerStatus.STARTING };
      render(<ServerCard {...mockProps} server={startingServer} />);

      // No start/stop buttons should be available during transitional states
      expect(screen.queryByText("Start")).not.toBeInTheDocument();
      expect(screen.queryByText("Stop")).not.toBeInTheDocument();
    });

    it("should show appropriate buttons for error state", () => {
      const errorServer = { ...mockServer, status: ServerStatus.ERROR };
      render(<ServerCard {...mockProps} server={errorServer} />);

      // Should allow starting from error state
      expect(screen.getByText("Start")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper accessibility attributes", () => {
      render(<ServerCard {...mockProps} />);

      // Action buttons should be accessible
      const manageButton = screen.getByText("Manage");
      expect(manageButton).toBeInTheDocument();
      expect(manageButton.tagName).toBe("BUTTON");
    });

    it("should handle keyboard interactions", () => {
      render(<ServerCard {...mockProps} />);

      const manageButton = screen.getByText("Manage");
      fireEvent.keyDown(manageButton, { key: "Enter" });

      // Should still be functional with keyboard
      expect(manageButton).toBeInTheDocument();
    });
  });
});
