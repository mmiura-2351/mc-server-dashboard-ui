/**
 * Tests for ConnectionWarningBanner component
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ConnectionProvider } from "@/contexts/connection";
import { ConnectionWarningBanner } from "./connection-warning-banner";
import { ConnectionMonitorService } from "@/services/connection-monitor";
import type { ConnectionState } from "@/services/connection-monitor";
import { ErrorHandler } from "@/utils/error-handler";

// Mock translation context
const mockT = vi.fn((key: string, params?: Record<string, string>) => {
  const translations: Record<string, string> = {
    "connection.banner.title": "Backend Connection Issue",
    "connection.banner.description": "The backend server is not responding. Some features may be unavailable.",
    "connection.banner.degradedDescription": "The backend connection is unstable. Some operations may be slower than usual.",
    "connection.banner.retry": "Retry Connection",
    "connection.banner.retrying": "Retrying...",
    "connection.banner.dismiss": "Dismiss",
    "connection.banner.details": "Show Details",
    "connection.banner.hideDetails": "Hide Details",
    "connection.indicator.tooltip.downtime": "Downtime: {duration}",
    "connection.indicator.tooltip.lastCheck": "Last check: {time}",
    "connection.actions.retryConnection": "Retry Connection",
    "errors.boundary.technicalDetails": "Technical Details",
    "errors.boundary.errorMessage": "Error Message",
    "errors.boundary.retryCount": "Retry Attempts",
    "connection.suggestions.checkServerRunning": "Suggestions",
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
  useTranslation: () => ({ t: mockT }),
}));

// Mock monitor service
const mockMonitor = {
  getState: vi.fn(),
  subscribe: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  checkConnection: vi.fn(),
  isHealthy: vi.fn(),
  isDegraded: vi.fn(),
  isDown: vi.fn(),
} as unknown as ConnectionMonitorService;

describe("ConnectionWarningBanner", () => {
  const baseState: ConnectionState = {
    status: "connected",
    isConnected: true,
    isChecking: false,
    lastCheck: new Date("2024-01-01T12:00:00Z"),
    lastSuccessfulConnection: new Date("2024-01-01T12:00:00Z"),
    error: null,
    retryCount: 0,
    downtime: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMonitor.getState = vi.fn().mockReturnValue(baseState);
    mockMonitor.subscribe = vi.fn().mockReturnValue(() => {});
    mockMonitor.checkConnection = vi.fn().mockResolvedValue({ isOk: () => true });
    mockMonitor.isHealthy = vi.fn().mockReturnValue(true);
    mockMonitor.isDegraded = vi.fn().mockReturnValue(false);
    mockMonitor.isDown = vi.fn().mockReturnValue(false);
  });

  const renderWithProvider = (props = {}) => {
    return render(
      <ConnectionProvider monitor={mockMonitor} autoStart={false}>
        <ConnectionWarningBanner {...props} />
      </ConnectionProvider>
    );
  };

  describe("visibility", () => {
    it("should not render when connection is healthy", () => {
      renderWithProvider();
      
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("should render when connection is down", () => {
      const disconnectedState: ConnectionState = {
        ...baseState,
        status: "disconnected",
        isConnected: false,
        downtime: 30000,
      };
      
      mockMonitor.getState = vi.fn().mockReturnValue(disconnectedState);
      mockMonitor.isHealthy = vi.fn().mockReturnValue(false);
      mockMonitor.isDown = vi.fn().mockReturnValue(true);
      
      renderWithProvider();
      
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Backend Connection Issue")).toBeInTheDocument();
      expect(screen.getByText("❌")).toBeInTheDocument();
    });

    it("should render when connection is degraded and showOnDegraded is true", () => {
      const degradedState: ConnectionState = {
        ...baseState,
        status: "degraded",
      };
      
      mockMonitor.getState = vi.fn().mockReturnValue(degradedState);
      mockMonitor.isHealthy = vi.fn().mockReturnValue(false);
      mockMonitor.isDegraded = vi.fn().mockReturnValue(true);
      
      renderWithProvider({ showOnDegraded: true });
      
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("⚠️")).toBeInTheDocument();
    });

    it("should not render when connection is degraded and showOnDegraded is false", () => {
      const degradedState: ConnectionState = {
        ...baseState,
        status: "degraded",
      };
      
      mockMonitor.getState = vi.fn().mockReturnValue(degradedState);
      mockMonitor.isDegraded = vi.fn().mockReturnValue(true);
      
      renderWithProvider({ showOnDegraded: false });
      
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("should not render when dismissed", async () => {
      const disconnectedState: ConnectionState = {
        ...baseState,
        status: "disconnected",
        isConnected: false,
      };
      
      mockMonitor.getState = vi.fn().mockReturnValue(disconnectedState);
      mockMonitor.isDown = vi.fn().mockReturnValue(true);
      
      renderWithProvider({ dismissible: true });
      
      expect(screen.getByRole("alert")).toBeInTheDocument();
      
      const dismissButton = screen.getByText("✕");
      fireEvent.click(dismissButton);
      
      await waitFor(() => {
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });
    });
  });

  describe("content", () => {
    it("should show appropriate message for disconnected state", () => {
      const disconnectedState: ConnectionState = {
        ...baseState,
        status: "disconnected",
        isConnected: false,
      };
      
      mockMonitor.getState = vi.fn().mockReturnValue(disconnectedState);
      mockMonitor.isDown = vi.fn().mockReturnValue(true);
      
      renderWithProvider();
      
      expect(screen.getByText("Backend Connection Issue")).toBeInTheDocument();
      expect(screen.getByText("The backend server is not responding. Some features may be unavailable.")).toBeInTheDocument();
    });

    it("should show appropriate message for degraded state", () => {
      const degradedState: ConnectionState = {
        ...baseState,
        status: "degraded",
      };
      
      mockMonitor.getState = vi.fn().mockReturnValue(degradedState);
      mockMonitor.isDegraded = vi.fn().mockReturnValue(true);
      
      renderWithProvider({ showOnDegraded: true });
      
      expect(screen.getByText("The backend connection is unstable. Some operations may be slower than usual.")).toBeInTheDocument();
    });

    it("should show downtime when available", () => {
      const disconnectedState: ConnectionState = {
        ...baseState,
        status: "disconnected",
        isConnected: false,
        downtime: 65000, // 1 minute 5 seconds
      };
      
      mockMonitor.getState = vi.fn().mockReturnValue(disconnectedState);
      mockMonitor.isDown = vi.fn().mockReturnValue(true);
      
      renderWithProvider();
      
      expect(screen.getByText("Downtime: 1m 5s")).toBeInTheDocument();
    });
  });

  describe("actions", () => {
    it("should have retry button that calls checkConnection", async () => {
      const disconnectedState: ConnectionState = {
        ...baseState,
        status: "disconnected",
        isConnected: false,
      };
      
      mockMonitor.getState = vi.fn().mockReturnValue(disconnectedState);
      mockMonitor.isDown = vi.fn().mockReturnValue(true);
      
      renderWithProvider();
      
      const retryButton = screen.getByText("Retry Connection");
      fireEvent.click(retryButton);
      
      expect(mockMonitor.checkConnection).toHaveBeenCalled();
    });

    it("should show retrying state when retry is in progress", async () => {
      const disconnectedState: ConnectionState = {
        ...baseState,
        status: "disconnected",
        isConnected: false,
      };
      
      mockMonitor.getState = vi.fn().mockReturnValue(disconnectedState);
      mockMonitor.isDown = vi.fn().mockReturnValue(true);
      mockMonitor.checkConnection = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      renderWithProvider();
      
      const retryButton = screen.getByText("Retry Connection");
      fireEvent.click(retryButton);
      
      expect(screen.getByText("Retrying...")).toBeInTheDocument();
      expect(retryButton).toBeDisabled();
      
      await waitFor(() => {
        expect(screen.getByText("Retry Connection")).toBeInTheDocument();
      });
    });

    it("should disable retry button when checking", () => {
      const checkingState: ConnectionState = {
        ...baseState,
        status: "disconnected",
        isConnected: false,
        isChecking: true,
      };
      
      mockMonitor.getState = vi.fn().mockReturnValue(checkingState);
      mockMonitor.isDown = vi.fn().mockReturnValue(true);
      
      renderWithProvider();
      
      const retryButton = screen.getByText("Retry Connection");
      expect(retryButton).toBeDisabled();
    });

    it("should show dismiss button when dismissible", () => {
      const disconnectedState: ConnectionState = {
        ...baseState,
        status: "disconnected",
        isConnected: false,
      };
      
      mockMonitor.getState = vi.fn().mockReturnValue(disconnectedState);
      mockMonitor.isDown = vi.fn().mockReturnValue(true);
      
      renderWithProvider({ dismissible: true });
      
      expect(screen.getByText("✕")).toBeInTheDocument();
    });

    it("should not show dismiss button when not dismissible", () => {
      const disconnectedState: ConnectionState = {
        ...baseState,
        status: "disconnected",
        isConnected: false,
      };
      
      mockMonitor.getState = vi.fn().mockReturnValue(disconnectedState);
      mockMonitor.isDown = vi.fn().mockReturnValue(true);
      
      renderWithProvider({ dismissible: false });
      
      expect(screen.queryByText("✕")).not.toBeInTheDocument();
    });
  });

  describe("details section", () => {
    const errorState: ConnectionState = {
      ...baseState,
      status: "disconnected",
      isConnected: false,
      error: ErrorHandler.createConnectionError(
        "Connection failed",
        "health_check",
        "failed",
        {
          endpoint: "/api/v1/health",
          retryCount: 2,
          suggestions: ["Check server status", "Verify network connection"],
        }
      ),
    };

    it("should show details button when showDetails is true", () => {
      mockMonitor.getState = vi.fn().mockReturnValue(errorState);
      mockMonitor.isDown = vi.fn().mockReturnValue(true);
      
      renderWithProvider({ showDetails: true });
      
      expect(screen.getByText("Show Details")).toBeInTheDocument();
    });

    it("should not show details button when showDetails is false", () => {
      mockMonitor.getState = vi.fn().mockReturnValue(errorState);
      mockMonitor.isDown = vi.fn().mockReturnValue(true);
      
      renderWithProvider({ showDetails: false });
      
      expect(screen.queryByText("Show Details")).not.toBeInTheDocument();
    });

    it("should toggle details section when details button is clicked", async () => {
      mockMonitor.getState = vi.fn().mockReturnValue(errorState);
      mockMonitor.isDown = vi.fn().mockReturnValue(true);
      
      renderWithProvider({ showDetails: true });
      
      const detailsButton = screen.getByText("Show Details");
      
      // Details should not be visible initially
      expect(screen.queryByText("Technical Details")).not.toBeInTheDocument();
      
      // Click to show details
      fireEvent.click(detailsButton);
      
      await waitFor(() => {
        expect(screen.getByText("Technical Details")).toBeInTheDocument();
        expect(screen.getByText("Hide Details")).toBeInTheDocument();
      });
      
      // Details should show error information
      expect(screen.getByText("Connection failed")).toBeInTheDocument();
      expect(screen.getByText("/api/v1/health")).toBeInTheDocument();
      
      // Click to hide details
      const hideButton = screen.getByText("Hide Details");
      fireEvent.click(hideButton);
      
      await waitFor(() => {
        expect(screen.queryByText("Technical Details")).not.toBeInTheDocument();
        expect(screen.getByText("Show Details")).toBeInTheDocument();
      });
    });

    it("should show error suggestions in details", () => {
      mockMonitor.getState = vi.fn().mockReturnValue(errorState);
      mockMonitor.isDown = vi.fn().mockReturnValue(true);
      
      renderWithProvider({ showDetails: true });
      
      const detailsButton = screen.getByText("Show Details");
      fireEvent.click(detailsButton);
      
      expect(screen.getByText("Check server status")).toBeInTheDocument();
      expect(screen.getByText("Verify network connection")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("should have proper ARIA attributes", () => {
      const disconnectedState: ConnectionState = {
        ...baseState,
        status: "disconnected",
        isConnected: false,
      };
      
      mockMonitor.getState = vi.fn().mockReturnValue(disconnectedState);
      mockMonitor.isDown = vi.fn().mockReturnValue(true);
      
      renderWithProvider({ showDetails: true });
      
      const banner = screen.getByRole("alert");
      expect(banner).toHaveAttribute("aria-live", "polite");
      
      const retryButton = screen.getByText("Retry Connection");
      expect(retryButton).toHaveAttribute("aria-label");
      
      const detailsButton = screen.getByText("Show Details");
      expect(detailsButton).toHaveAttribute("aria-expanded", "false");
    });

    it("should update aria-expanded when details are toggled", () => {
      const disconnectedState: ConnectionState = {
        ...baseState,
        status: "disconnected",
        isConnected: false,
        error: ErrorHandler.createConnectionError("Connection failed", "health_check", "failed"),
      };
      
      mockMonitor.getState = vi.fn().mockReturnValue(disconnectedState);
      mockMonitor.isDown = vi.fn().mockReturnValue(true);
      
      renderWithProvider({ showDetails: true });
      
      const detailsButton = screen.getByText("Show Details");
      expect(detailsButton).toHaveAttribute("aria-expanded", "false");
      
      fireEvent.click(detailsButton);
      
      const hideButton = screen.getByText("Hide Details");
      expect(hideButton).toHaveAttribute("aria-expanded", "true");
    });
  });
});