/**
 * Tests for Connection Context
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { ConnectionProvider, useConnection, useConnectionStatus, useAPIOperationsDisabled } from "./connection";
import { ConnectionMonitorService } from "@/services/connection-monitor";
import type { ConnectionState } from "@/services/connection-monitor";

// Mock the connection monitor service
const mockMonitor = {
  getState: vi.fn(),
  subscribe: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  checkConnection: vi.fn(),
  resetRetries: vi.fn(),
  updateConfig: vi.fn(),
  isHealthy: vi.fn(),
  isDegraded: vi.fn(),
  isDown: vi.fn(),
} as unknown as ConnectionMonitorService;

// Test component that uses the connection context
function TestComponent() {
  const {
    state,
    checkConnection,
    resetRetries,
    startMonitoring,
    stopMonitoring,
    updateConfig,
    isConnected,
    isDisconnected,
    isChecking,
    isHealthy,
    isDegraded,
    isDown,
  } = useConnection();

  return (
    <div>
      <div data-testid="connection-status">{state.status}</div>
      <div data-testid="is-connected">{isConnected.toString()}</div>
      <div data-testid="is-disconnected">{isDisconnected.toString()}</div>
      <div data-testid="is-checking">{isChecking.toString()}</div>
      <div data-testid="is-healthy">{isHealthy.toString()}</div>
      <div data-testid="is-degraded">{isDegraded.toString()}</div>
      <div data-testid="is-down">{isDown.toString()}</div>
      <button onClick={checkConnection} data-testid="check-connection">
        Check Connection
      </button>
      <button onClick={resetRetries} data-testid="reset-retries">
        Reset Retries
      </button>
      <button onClick={startMonitoring} data-testid="start-monitoring">
        Start Monitoring
      </button>
      <button onClick={stopMonitoring} data-testid="stop-monitoring">
        Stop Monitoring
      </button>
      <button 
        onClick={() => updateConfig({ timeout: 5000 })} 
        data-testid="update-config"
      >
        Update Config
      </button>
    </div>
  );
}

// Test component for connection status hook
function ConnectionStatusComponent() {
  const { color, text, downtime, error } = useConnectionStatus();
  
  return (
    <div>
      <div data-testid="status-color">{color}</div>
      <div data-testid="status-text">{text}</div>
      <div data-testid="status-downtime">{downtime || "none"}</div>
      <div data-testid="status-error">{error?.message || "none"}</div>
    </div>
  );
}

// Test component for API operations disabled hook
function APIOperationsComponent() {
  const isDisabled = useAPIOperationsDisabled();
  
  return (
    <div>
      <div data-testid="api-disabled">{isDisabled.toString()}</div>
    </div>
  );
}

describe("Connection Context", () => {
  const defaultState: ConnectionState = {
    status: "checking",
    isConnected: false,
    isChecking: false,
    lastCheck: null,
    lastSuccessfulConnection: null,
    error: null,
    retryCount: 0,
    downtime: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMonitor.getState = vi.fn().mockReturnValue(defaultState);
    mockMonitor.subscribe = vi.fn().mockReturnValue(() => {});
    mockMonitor.isHealthy = vi.fn().mockReturnValue(false);
    mockMonitor.isDegraded = vi.fn().mockReturnValue(false);
    mockMonitor.isDown = vi.fn().mockReturnValue(true);
  });

  describe("ConnectionProvider", () => {
    it("should provide connection context to children", () => {
      render(
        <ConnectionProvider monitor={mockMonitor} autoStart={false}>
          <TestComponent />
        </ConnectionProvider>
      );

      expect(screen.getByTestId("connection-status")).toHaveTextContent("checking");
      expect(mockMonitor.getState).toHaveBeenCalled();
    });

    it("should start monitoring automatically by default", () => {
      render(
        <ConnectionProvider monitor={mockMonitor}>
          <TestComponent />
        </ConnectionProvider>
      );

      expect(mockMonitor.start).toHaveBeenCalled();
    });

    it("should not start monitoring when autoStart is false", () => {
      render(
        <ConnectionProvider monitor={mockMonitor} autoStart={false}>
          <TestComponent />
        </ConnectionProvider>
      );

      expect(mockMonitor.start).not.toHaveBeenCalled();
    });

    it("should update config when provided", () => {
      const config = { timeout: 5000, maxRetries: 5 };
      
      render(
        <ConnectionProvider monitor={mockMonitor} config={config} autoStart={false}>
          <TestComponent />
        </ConnectionProvider>
      );

      expect(mockMonitor.updateConfig).toHaveBeenCalledWith(config);
    });

    it("should subscribe to state changes", () => {
      render(
        <ConnectionProvider monitor={mockMonitor} autoStart={false}>
          <TestComponent />
        </ConnectionProvider>
      );

      expect(mockMonitor.subscribe).toHaveBeenCalled();
    });

    it("should stop monitoring on unmount", () => {
      const { unmount } = render(
        <ConnectionProvider monitor={mockMonitor} autoStart={false}>
          <TestComponent />
        </ConnectionProvider>
      );

      unmount();
      expect(mockMonitor.stop).toHaveBeenCalled();
    });
  });

  describe("useConnection hook", () => {
    it("should throw error when used outside provider", () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = vi.fn();

      expect(() => {
        render(<TestComponent />);
      }).toThrow("useConnection must be used within a ConnectionProvider");

      console.error = originalError;
    });

    it("should provide correct derived state", () => {
      const connectedState: ConnectionState = {
        ...defaultState,
        status: "connected",
        isConnected: true,
      };
      
      mockMonitor.getState = vi.fn().mockReturnValue(connectedState);
      mockMonitor.isHealthy = vi.fn().mockReturnValue(true);
      mockMonitor.isDown = vi.fn().mockReturnValue(false);

      render(
        <ConnectionProvider monitor={mockMonitor} autoStart={false}>
          <TestComponent />
        </ConnectionProvider>
      );

      expect(screen.getByTestId("is-connected")).toHaveTextContent("true");
      expect(screen.getByTestId("is-disconnected")).toHaveTextContent("false");
      expect(screen.getByTestId("is-healthy")).toHaveTextContent("true");
      expect(screen.getByTestId("is-down")).toHaveTextContent("false");
    });

    it("should call monitor methods when context methods are invoked", async () => {
      render(
        <ConnectionProvider monitor={mockMonitor} autoStart={false}>
          <TestComponent />
        </ConnectionProvider>
      );

      await act(async () => {
        screen.getByTestId("check-connection").click();
      });
      expect(mockMonitor.checkConnection).toHaveBeenCalled();

      await act(async () => {
        screen.getByTestId("reset-retries").click();
      });
      expect(mockMonitor.resetRetries).toHaveBeenCalled();

      await act(async () => {
        screen.getByTestId("start-monitoring").click();
      });
      expect(mockMonitor.start).toHaveBeenCalled();

      await act(async () => {
        screen.getByTestId("stop-monitoring").click();
      });
      expect(mockMonitor.stop).toHaveBeenCalled();

      await act(async () => {
        screen.getByTestId("update-config").click();
      });
      expect(mockMonitor.updateConfig).toHaveBeenCalledWith({ timeout: 5000 });
    });

    it("should update state when monitor notifies changes", async () => {
      let stateCallback: (state: ConnectionState) => void = () => {};
      mockMonitor.subscribe = vi.fn().mockImplementation((callback) => {
        stateCallback = callback;
        return () => {};
      });

      render(
        <ConnectionProvider monitor={mockMonitor} autoStart={false}>
          <TestComponent />
        </ConnectionProvider>
      );

      // Simulate state change from monitor
      const newState: ConnectionState = {
        ...defaultState,
        status: "connected",
        isConnected: true,
      };

      await act(async () => {
        stateCallback(newState);
      });

      await waitFor(() => {
        expect(screen.getByTestId("connection-status")).toHaveTextContent("connected");
        expect(screen.getByTestId("is-connected")).toHaveTextContent("true");
      });
    });
  });

  describe("useConnectionStatus hook", () => {
    it("should provide correct status information for healthy connection", () => {
      const healthyState: ConnectionState = {
        ...defaultState,
        status: "connected",
        isConnected: true,
        isChecking: false,
      };
      
      mockMonitor.getState = vi.fn().mockReturnValue(healthyState);
      mockMonitor.isHealthy = vi.fn().mockReturnValue(true);
      mockMonitor.isDegraded = vi.fn().mockReturnValue(false);
      mockMonitor.isDown = vi.fn().mockReturnValue(false);

      render(
        <ConnectionProvider monitor={mockMonitor} autoStart={false}>
          <ConnectionStatusComponent />
        </ConnectionProvider>
      );

      expect(screen.getByTestId("status-color")).toHaveTextContent("green");
      expect(screen.getByTestId("status-text")).toHaveTextContent("Connected");
      expect(screen.getByTestId("status-downtime")).toHaveTextContent("none");
    });

    it("should provide correct status information for degraded connection", () => {
      const degradedState: ConnectionState = {
        ...defaultState,
        status: "degraded",
        isConnected: true,
        isChecking: false,
      };
      
      mockMonitor.getState = vi.fn().mockReturnValue(degradedState);
      mockMonitor.isHealthy = vi.fn().mockReturnValue(false);
      mockMonitor.isDegraded = vi.fn().mockReturnValue(true);
      mockMonitor.isDown = vi.fn().mockReturnValue(false);

      render(
        <ConnectionProvider monitor={mockMonitor} autoStart={false}>
          <ConnectionStatusComponent />
        </ConnectionProvider>
      );

      expect(screen.getByTestId("status-color")).toHaveTextContent("yellow");
      expect(screen.getByTestId("status-text")).toHaveTextContent("Degraded");
    });

    it("should provide correct status information for disconnected state", () => {
      const disconnectedState: ConnectionState = {
        ...defaultState,
        status: "disconnected",
        isConnected: false,
        downtime: 65000, // 1 minute 5 seconds
      };
      
      mockMonitor.getState = vi.fn().mockReturnValue(disconnectedState);
      mockMonitor.isDown = vi.fn().mockReturnValue(true);

      render(
        <ConnectionProvider monitor={mockMonitor} autoStart={false}>
          <ConnectionStatusComponent />
        </ConnectionProvider>
      );

      expect(screen.getByTestId("status-color")).toHaveTextContent("red");
      expect(screen.getByTestId("status-text")).toHaveTextContent("Disconnected");
      expect(screen.getByTestId("status-downtime")).toHaveTextContent("1m 5s");
    });

    it("should format downtime correctly for hours", () => {
      const disconnectedState: ConnectionState = {
        ...defaultState,
        status: "disconnected",
        isConnected: false,
        downtime: 3665000, // 1 hour 1 minute 5 seconds
      };
      
      mockMonitor.getState = vi.fn().mockReturnValue(disconnectedState);

      render(
        <ConnectionProvider monitor={mockMonitor} autoStart={false}>
          <ConnectionStatusComponent />
        </ConnectionProvider>
      );

      expect(screen.getByTestId("status-downtime")).toHaveTextContent("1h 1m");
    });

    it("should show checking status", () => {
      const checkingState: ConnectionState = {
        ...defaultState,
        status: "checking",
        isChecking: true,
      };
      
      mockMonitor.getState = vi.fn().mockReturnValue(checkingState);

      render(
        <ConnectionProvider monitor={mockMonitor} autoStart={false}>
          <ConnectionStatusComponent />
        </ConnectionProvider>
      );

      expect(screen.getByTestId("status-text")).toHaveTextContent("Checking...");
    });
  });

  describe("useAPIOperationsDisabled hook", () => {
    it("should return true when disconnected", () => {
      const disconnectedState: ConnectionState = {
        ...defaultState,
        status: "disconnected",
        isConnected: false,
      };
      
      mockMonitor.getState = vi.fn().mockReturnValue(disconnectedState);

      render(
        <ConnectionProvider monitor={mockMonitor} autoStart={false}>
          <APIOperationsComponent />
        </ConnectionProvider>
      );

      expect(screen.getByTestId("api-disabled")).toHaveTextContent("true");
    });

    it("should return false when connected", () => {
      const connectedState: ConnectionState = {
        ...defaultState,
        status: "connected",
        isConnected: true,
      };
      
      mockMonitor.getState = vi.fn().mockReturnValue(connectedState);

      render(
        <ConnectionProvider monitor={mockMonitor} autoStart={false}>
          <APIOperationsComponent />
        </ConnectionProvider>
      );

      expect(screen.getByTestId("api-disabled")).toHaveTextContent("false");
    });

    it("should return false when degraded but still connected", () => {
      const degradedState: ConnectionState = {
        ...defaultState,
        status: "degraded",
        isConnected: true,
      };
      
      mockMonitor.getState = vi.fn().mockReturnValue(degradedState);

      render(
        <ConnectionProvider monitor={mockMonitor} autoStart={false}>
          <APIOperationsComponent />
        </ConnectionProvider>
      );

      expect(screen.getByTestId("api-disabled")).toHaveTextContent("false");
    });
  });
});