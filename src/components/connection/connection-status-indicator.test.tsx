/**
 * Tests for ConnectionStatusIndicator component
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConnectionProvider } from "@/contexts/connection";
import { ConnectionStatusIndicator } from "./connection-status-indicator";
import { ConnectionMonitorService } from "@/services/connection-monitor";
import type { ConnectionState } from "@/services/connection-monitor";

// Mock translation context
const mockT = vi.fn((key: string, params?: Record<string, string>) => {
  const translations: Record<string, string> = {
    "connection.status.connected": "Connected",
    "connection.status.disconnected": "Disconnected",
    "connection.status.checking": "Checking...",
    "connection.status.degraded": "Degraded",
    "connection.indicator.tooltip.connected": "Backend API is connected and healthy",
    "connection.indicator.tooltip.downtime": "Downtime: {duration}",
    "connection.indicator.tooltip.lastCheck": "Last check: {time}",
    "connection.indicator.tooltip.lastSuccess": "Last successful connection: {time}",
    "common.unknown": "Unknown",
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
  isHealthy: vi.fn(),
  isDegraded: vi.fn(),
  isDown: vi.fn(),
} as unknown as ConnectionMonitorService;

describe("ConnectionStatusIndicator", () => {
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
    mockMonitor.isHealthy = vi.fn().mockReturnValue(true);
    mockMonitor.isDegraded = vi.fn().mockReturnValue(false);
    mockMonitor.isDown = vi.fn().mockReturnValue(false);
  });

  const renderWithProvider = (props = {}) => {
    return render(
      <ConnectionProvider monitor={mockMonitor} autoStart={false}>
        <ConnectionStatusIndicator {...props} />
      </ConnectionProvider>
    );
  };

  describe("rendering", () => {
    it("should render with default props", () => {
      renderWithProvider();
      
      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByText("Connected")).toBeInTheDocument();
      expect(screen.getByText("🟢")).toBeInTheDocument();
    });

    it("should render small size variant", () => {
      renderWithProvider({ size: "small" });
      
      const container = screen.getByRole("status");
      expect(container.className).toMatch(/size-small/);
      // Text should be hidden in small size
      expect(screen.queryByText("Connected")).not.toBeInTheDocument();
      expect(screen.getByText("🟢")).toBeInTheDocument();
    });

    it("should render large size variant", () => {
      renderWithProvider({ size: "large" });
      
      const container = screen.getByRole("status");
      expect(container.className).toMatch(/size-large/);
      expect(screen.getByText("Connected")).toBeInTheDocument();
    });

    it("should render fixed position variant", () => {
      renderWithProvider({ position: "fixed" });
      
      const container = screen.getByRole("status");
      expect(container.className).toMatch(/position-fixed/);
    });

    it("should apply custom className", () => {
      renderWithProvider({ className: "custom-class" });
      
      const container = screen.getByRole("status");
      expect(container).toHaveClass("custom-class");
    });
  });

  describe("status display", () => {
    it("should show connected status", () => {
      mockMonitor.isHealthy = vi.fn().mockReturnValue(true);
      mockMonitor.isDegraded = vi.fn().mockReturnValue(false);
      mockMonitor.isDown = vi.fn().mockReturnValue(false);
      
      renderWithProvider();
      
      expect(screen.getByText("🟢")).toBeInTheDocument();
      expect(screen.getByText("Connected")).toBeInTheDocument();
      const indicator = screen.getByRole("status").querySelector('[class*="indicator"]');
      expect(indicator?.className).toMatch(/status-green/);
    });

    it("should show degraded status", () => {
      const degradedState: ConnectionState = {
        ...baseState,
        status: "degraded",
      };
      
      mockMonitor.getState = vi.fn().mockReturnValue(degradedState);
      mockMonitor.isHealthy = vi.fn().mockReturnValue(false);
      mockMonitor.isDegraded = vi.fn().mockReturnValue(true);
      mockMonitor.isDown = vi.fn().mockReturnValue(false);
      
      renderWithProvider();
      
      expect(screen.getByText("🟡")).toBeInTheDocument();
      expect(screen.getByText("Degraded")).toBeInTheDocument();
      const indicator = screen.getByRole("status").querySelector('[class*="indicator"]');
      expect(indicator?.className).toMatch(/status-yellow/);
    });

    it("should show disconnected status", () => {
      const disconnectedState: ConnectionState = {
        ...baseState,
        status: "disconnected",
        isConnected: false,
        downtime: 30000, // 30 seconds
      };
      
      mockMonitor.getState = vi.fn().mockReturnValue(disconnectedState);
      mockMonitor.isHealthy = vi.fn().mockReturnValue(false);
      mockMonitor.isDegraded = vi.fn().mockReturnValue(false);
      mockMonitor.isDown = vi.fn().mockReturnValue(true);
      
      renderWithProvider();
      
      expect(screen.getByText("🔴")).toBeInTheDocument();
      expect(screen.getByText("Disconnected")).toBeInTheDocument();
      const indicator = screen.getByRole("status").querySelector('[class*="indicator"]');
      expect(indicator?.className).toMatch(/status-red/);
    });

    it("should show checking status", () => {
      const checkingState: ConnectionState = {
        ...baseState,
        status: "checking",
        isChecking: true,
      };
      
      mockMonitor.getState = vi.fn().mockReturnValue(checkingState);
      mockMonitor.isHealthy = vi.fn().mockReturnValue(false);
      mockMonitor.isDegraded = vi.fn().mockReturnValue(false);
      mockMonitor.isDown = vi.fn().mockReturnValue(false);
      
      renderWithProvider();
      
      expect(screen.getByText("⚪")).toBeInTheDocument();
      expect(screen.getByText("Checking...")).toBeInTheDocument();
      const indicator = screen.getByRole("status").querySelector('[class*="indicator"]');
      expect(indicator?.className).toMatch(/status-gray/);
    });
  });

  describe("downtime display", () => {
    it("should show downtime when connection is down", () => {
      const disconnectedState: ConnectionState = {
        ...baseState,
        status: "disconnected",
        isConnected: false,
        downtime: 65000, // 1 minute 5 seconds
      };
      
      mockMonitor.getState = vi.fn().mockReturnValue(disconnectedState);
      mockMonitor.isDown = vi.fn().mockReturnValue(true);
      
      renderWithProvider({ showDetails: true });
      
      expect(screen.getByText("1m 5s")).toBeInTheDocument();
    });

    it("should not show downtime when showDetails is false", () => {
      const disconnectedState: ConnectionState = {
        ...baseState,
        status: "disconnected",
        isConnected: false,
        downtime: 65000,
      };
      
      mockMonitor.getState = vi.fn().mockReturnValue(disconnectedState);
      mockMonitor.isDown = vi.fn().mockReturnValue(true);
      
      renderWithProvider({ showDetails: false });
      
      expect(screen.queryByText("1m 5s")).not.toBeInTheDocument();
    });

    it("should not show downtime when there is no downtime", () => {
      renderWithProvider({ showDetails: true });
      
      expect(screen.queryByText(/m|s/)).not.toBeInTheDocument();
    });
  });

  describe("tooltip", () => {
    it("should build correct tooltip for connected state", () => {
      renderWithProvider();
      
      const indicator = screen.getByRole("status");
      expect(indicator).toHaveAttribute("title", expect.stringContaining("Connected"));
    });

    it("should include downtime in tooltip", () => {
      const disconnectedState: ConnectionState = {
        ...baseState,
        status: "disconnected",
        isConnected: false,
        downtime: 30000,
      };
      
      mockMonitor.getState = vi.fn().mockReturnValue(disconnectedState);
      mockMonitor.isDown = vi.fn().mockReturnValue(true);
      
      renderWithProvider();
      
      const indicator = screen.getByRole("status");
      expect(indicator).toHaveAttribute("title", expect.stringContaining("Downtime:"));
    });

    it("should include last check time when showDetails is true", () => {
      renderWithProvider({ showDetails: true });
      
      const indicator = screen.getByRole("status");
      expect(indicator).toHaveAttribute("title", expect.stringContaining("Last check:"));
    });

    it("should not include detailed information when showDetails is false", () => {
      renderWithProvider({ showDetails: false });
      
      const indicator = screen.getByRole("status");
      const title = indicator.getAttribute("title");
      expect(title).not.toContain("Last check:");
    });
  });

  describe("accessibility", () => {
    it("should have proper ARIA attributes", () => {
      renderWithProvider();
      
      const indicator = screen.getByRole("status");
      expect(indicator).toHaveAttribute("aria-label");
      expect(indicator).toHaveAttribute("title");
    });

    it("should mark icon as aria-hidden", () => {
      renderWithProvider();
      
      const icon = screen.getByText("🟢");
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });
  });
});