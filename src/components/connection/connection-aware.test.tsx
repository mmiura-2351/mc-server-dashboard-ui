/**
 * Tests for Connection-Aware components and hooks
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConnectionProvider } from "@/contexts/connection";
import {
  withConnectionAware,
  useConnectionAwareButton,
  useConnectionAwareRender,
  ConnectionGuard,
  ConnectionAwareButton,
  ConnectionAwareForm,
} from "./connection-aware";
import { ConnectionMonitorService } from "@/services/connection-monitor";
import type { ConnectionState } from "@/services/connection-monitor";

// Mock translation context
const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    "connection.error.connectionFailed": "Backend connection failed",
    "connection.error.connectionTimeout": "Connection timeout",
    "connection.status.checking": "Checking connection...",
  };
  return translations[key] || key;
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

// Test component for HOC testing
function TestComponent({ text = "Test Component" }: { text?: string }) {
  return <div data-testid="test-component">{text}</div>;
}

describe("Connection-Aware Components", () => {
  const baseState: ConnectionState = {
    status: "connected",
    isConnected: true,
    isChecking: false,
    lastCheck: new Date(),
    lastSuccessfulConnection: new Date(),
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

  const renderWithProvider = (
    component: React.ReactElement,
    state?: Partial<ConnectionState>
  ) => {
    if (state) {
      mockMonitor.getState = vi
        .fn()
        .mockReturnValue({ ...baseState, ...state });
      mockMonitor.isHealthy = vi
        .fn()
        .mockReturnValue(state.status === "connected");
      mockMonitor.isDegraded = vi
        .fn()
        .mockReturnValue(state.status === "degraded");
      mockMonitor.isDown = vi.fn().mockReturnValue(!state.isConnected);
    }

    return render(
      <ConnectionProvider monitor={mockMonitor} autoStart={false}>
        {component}
      </ConnectionProvider>
    );
  };

  describe("withConnectionAware HOC", () => {
    it("should render component when connected", () => {
      const WrappedComponent = withConnectionAware(TestComponent);
      renderWithProvider(<WrappedComponent />);

      expect(screen.getByTestId("test-component")).toBeInTheDocument();
      expect(screen.getByText("Test Component")).toBeInTheDocument();
    });

    it("should show disabled overlay when disconnected", () => {
      const WrappedComponent = withConnectionAware(TestComponent);
      renderWithProvider(<WrappedComponent />, {
        status: "disconnected",
        isConnected: false,
      });

      expect(screen.getByText("Backend connection failed")).toBeInTheDocument();
      expect(screen.getByTestId("test-component")).toBeInTheDocument();
    });

    it("should render normally when degraded and allowDegraded is true", () => {
      const WrappedComponent = withConnectionAware(TestComponent, {
        allowDegraded: true,
      });
      renderWithProvider(<WrappedComponent />, {
        status: "degraded",
        isConnected: true,
      });

      expect(screen.getByTestId("test-component")).toBeInTheDocument();
      expect(
        screen.queryByText("Backend connection failed")
      ).not.toBeInTheDocument();
    });

    it("should show disabled overlay when degraded and allowDegraded is false", () => {
      const WrappedComponent = withConnectionAware(TestComponent, {
        allowDegraded: false,
      });
      mockMonitor.isDegraded = vi.fn().mockReturnValue(true);

      renderWithProvider(<WrappedComponent />, {
        status: "degraded",
        isConnected: true,
      });

      expect(screen.getByText("Backend connection failed")).toBeInTheDocument();
    });

    it("should not render when showDisconnectedMessage is false and disconnected", () => {
      const WrappedComponent = withConnectionAware(TestComponent, {
        showDisconnectedMessage: false,
      });
      renderWithProvider(<WrappedComponent />, {
        status: "disconnected",
        isConnected: false,
      });

      expect(screen.queryByTestId("test-component")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Backend connection failed")
      ).not.toBeInTheDocument();
    });

    it("should show custom disconnected message", () => {
      const customMessage = "Custom offline message";
      const WrappedComponent = withConnectionAware(TestComponent, {
        disconnectedMessage: customMessage,
      });
      renderWithProvider(<WrappedComponent />, {
        status: "disconnected",
        isConnected: false,
      });

      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });
  });

  describe("useConnectionAwareButton hook", () => {
    function TestButtonComponent({
      allowDegraded = true,
      disableOnChecking = false,
    }: {
      allowDegraded?: boolean;
      disableOnChecking?: boolean;
    }) {
      const { connectionProps: _connectionProps, ...buttonProps } =
        useConnectionAwareButton({
          allowDegraded,
          disableOnChecking,
        });
      return (
        <button {...buttonProps} data-testid="test-button">
          Test Button
        </button>
      );
    }

    it("should return enabled state when connected", () => {
      renderWithProvider(<TestButtonComponent />);

      const button = screen.getByTestId("test-button");
      expect(button).not.toBeDisabled();
      expect(button).not.toHaveAttribute("aria-disabled", "true");
    });

    it("should return disabled state when disconnected", () => {
      renderWithProvider(<TestButtonComponent />, {
        status: "disconnected",
        isConnected: false,
      });

      const button = screen.getByTestId("test-button");
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("aria-disabled", "true");
      expect(button).toHaveAttribute("title", "Backend connection failed");
    });

    it("should be enabled when degraded and allowDegraded is true", () => {
      renderWithProvider(<TestButtonComponent allowDegraded={true} />, {
        status: "degraded",
        isConnected: true,
      });

      const button = screen.getByTestId("test-button");
      expect(button).not.toBeDisabled();
    });

    it("should be disabled when degraded and allowDegraded is false", () => {
      mockMonitor.isDegraded = vi.fn().mockReturnValue(true);

      renderWithProvider(<TestButtonComponent allowDegraded={false} />, {
        status: "degraded",
        isConnected: true,
      });

      const button = screen.getByTestId("test-button");
      expect(button).toBeDisabled();
    });

    it("should be disabled when checking and disableOnChecking is true", () => {
      renderWithProvider(<TestButtonComponent disableOnChecking={true} />, {
        status: "checking",
        isChecking: true,
      });

      const button = screen.getByTestId("test-button");
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("title", "Checking connection...");
    });
  });

  describe("useConnectionAwareRender hook", () => {
    function TestRenderComponent({
      allowDegraded = true,
      disableOnChecking = false,
    }: {
      allowDegraded?: boolean;
      disableOnChecking?: boolean;
    }) {
      const { shouldRender, shouldDisable } = useConnectionAwareRender({
        allowDegraded,
        disableOnChecking,
      });

      return (
        <div>
          <span data-testid="should-render">{shouldRender.toString()}</span>
          <span data-testid="should-disable">{shouldDisable.toString()}</span>
        </div>
      );
    }

    it("should return correct states when connected", () => {
      renderWithProvider(<TestRenderComponent />);

      expect(screen.getByTestId("should-render")).toHaveTextContent("true");
      expect(screen.getByTestId("should-disable")).toHaveTextContent("false");
    });

    it("should return correct states when disconnected", () => {
      renderWithProvider(<TestRenderComponent />, {
        status: "disconnected",
        isConnected: false,
      });

      expect(screen.getByTestId("should-render")).toHaveTextContent("false");
      expect(screen.getByTestId("should-disable")).toHaveTextContent("true");
    });
  });

  describe("ConnectionGuard component", () => {
    it("should render children when connected", () => {
      renderWithProvider(
        <ConnectionGuard>
          <div data-testid="guarded-content">Protected Content</div>
        </ConnectionGuard>
      );

      expect(screen.getByTestId("guarded-content")).toBeInTheDocument();
    });

    it("should show fallback message when disconnected", () => {
      renderWithProvider(
        <ConnectionGuard>
          <div data-testid="guarded-content">Protected Content</div>
        </ConnectionGuard>,
        { status: "disconnected", isConnected: false }
      );

      expect(screen.queryByTestId("guarded-content")).not.toBeInTheDocument();
      expect(screen.getByText("Backend connection failed")).toBeInTheDocument();
    });

    it("should render custom fallback when provided", () => {
      const customFallback = (
        <div data-testid="custom-fallback">Custom Fallback</div>
      );

      renderWithProvider(
        <ConnectionGuard fallback={customFallback}>
          <div data-testid="guarded-content">Protected Content</div>
        </ConnectionGuard>,
        { status: "disconnected", isConnected: false }
      );

      expect(screen.queryByTestId("guarded-content")).not.toBeInTheDocument();
      expect(screen.getByTestId("custom-fallback")).toBeInTheDocument();
    });

    it("should not render anything when disconnected and showDisconnectedMessage is false", () => {
      renderWithProvider(
        <ConnectionGuard showDisconnectedMessage={false}>
          <div data-testid="guarded-content">Protected Content</div>
        </ConnectionGuard>,
        { status: "disconnected", isConnected: false }
      );

      expect(screen.queryByTestId("guarded-content")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Backend connection failed")
      ).not.toBeInTheDocument();
    });
  });

  describe("ConnectionAwareButton component", () => {
    it("should render enabled button when connected", () => {
      renderWithProvider(
        <ConnectionAwareButton data-testid="aware-button">
          Click Me
        </ConnectionAwareButton>
      );

      const button = screen.getByTestId("aware-button");
      expect(button).not.toBeDisabled();
      expect(button).toHaveTextContent("Click Me");
    });

    it("should render disabled button when disconnected", () => {
      renderWithProvider(
        <ConnectionAwareButton data-testid="aware-button">
          Click Me
        </ConnectionAwareButton>,
        { status: "disconnected", isConnected: false }
      );

      const button = screen.getByTestId("aware-button");
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("title", "Backend connection failed");
    });

    it("should not show tooltip when showTooltip is false", () => {
      renderWithProvider(
        <ConnectionAwareButton data-testid="aware-button" showTooltip={false}>
          Click Me
        </ConnectionAwareButton>,
        { status: "disconnected", isConnected: false }
      );

      const button = screen.getByTestId("aware-button");
      expect(button).toBeDisabled();
      expect(button).not.toHaveAttribute("title");
    });
  });

  describe("ConnectionAwareForm component", () => {
    it("should allow form submission when connected", () => {
      const handleSubmit = vi.fn((e) => e.preventDefault());

      renderWithProvider(
        <ConnectionAwareForm onSubmit={handleSubmit} data-testid="aware-form">
          <input type="text" data-testid="form-input" />
          <button type="submit" data-testid="submit-button">
            Submit
          </button>
        </ConnectionAwareForm>
      );

      const form = screen.getByTestId("aware-form");
      const input = screen.getByTestId("form-input");
      const button = screen.getByTestId("submit-button");

      expect(input).not.toBeDisabled();
      expect(button).not.toBeDisabled();

      fireEvent.submit(form);
      expect(handleSubmit).toHaveBeenCalled();
    });

    it("should prevent form submission when disconnected", () => {
      const handleSubmit = vi.fn();

      renderWithProvider(
        <ConnectionAwareForm onSubmit={handleSubmit} data-testid="aware-form">
          <input type="text" data-testid="form-input" />
          <button type="submit" data-testid="submit-button">
            Submit
          </button>
        </ConnectionAwareForm>,
        { status: "disconnected", isConnected: false }
      );

      const form = screen.getByTestId("aware-form");
      const input = screen.getByTestId("form-input");
      const button = screen.getByTestId("submit-button");

      expect(input).toBeDisabled();
      expect(button).toBeDisabled();

      fireEvent.submit(form);
      expect(handleSubmit).not.toHaveBeenCalled();
    });
  });
});
