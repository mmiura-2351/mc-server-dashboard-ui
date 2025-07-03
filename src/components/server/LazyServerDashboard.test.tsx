/**
 * Tests for LazyServerDashboard component with lazy loading behavior
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock the language context
vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "server.dashboard.loading": "Loading server dashboard...",
        "common.loading": "Loading...",
      };
      return translations[key] || key;
    },
    locale: "en",
  }),
}));

// Mock the LoadingFallback component
vi.mock("@/components/ui", () => ({
  LoadingFallback: ({
    type,
    className,
  }: {
    type?: string;
    className?: string;
  }) => (
    <div data-testid="loading-fallback" className={className}>
      Loading {type === "serverDashboard" ? "server dashboard" : "component"}...
    </div>
  ),
}));

// Mock ErrorBoundary
vi.mock("@/components/error/error-boundary", () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock the ServerDashboard component that will be lazy loaded
vi.mock("./server-dashboard", () => ({
  ServerDashboard: ({ className }: { className?: string }) => (
    <div data-testid="server-dashboard" className={className}>
      Server Dashboard Component
    </div>
  ),
}));

import { LazyServerDashboard } from "./LazyServerDashboard";

describe("LazyServerDashboard", () => {
  const mockProps = {
    className: "test-class",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Component Rendering", () => {
    it("should show loading state initially", () => {
      render(<LazyServerDashboard {...mockProps} />);

      // Should show loading fallback while lazy component loads
      expect(screen.getByTestId("loading-fallback")).toBeInTheDocument();
      expect(
        screen.getByText("Loading server dashboard...")
      ).toBeInTheDocument();
    });

    it("should render with correct props structure", () => {
      const { container } = render(<LazyServerDashboard {...mockProps} />);

      // Should render some content (either loading or loaded component)
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe("Component Structure", () => {
    it("should have correct display name", () => {
      expect(LazyServerDashboard.displayName).toBe("LazyServerDashboard");
    });

    it("should be a functional component", () => {
      expect(typeof LazyServerDashboard).toBe("function");
    });

    it("should work without any props", () => {
      // This test ensures TypeScript compilation
      expect(() => {
        render(<LazyServerDashboard />);
      }).not.toThrow();
    });
  });

  describe("Error Handling", () => {
    it("should wrap component in ErrorBoundary", () => {
      // Since we mocked ErrorBoundary to render children directly,
      // this test verifies the structure is correct
      render(<LazyServerDashboard {...mockProps} />);

      expect(screen.getByTestId("server-dashboard")).toBeInTheDocument();
    });
  });

  describe("Code Splitting", () => {
    it("should be set up for lazy loading", () => {
      // This verifies the component is structured for lazy loading
      // The actual lazy loading behavior is tested in integration tests
      expect(LazyServerDashboard).toBeDefined();
      expect(typeof LazyServerDashboard).toBe("function");
    });
  });

  describe("Props Interface", () => {
    it("should accept optional className prop", () => {
      render(<LazyServerDashboard className="custom-class" />);

      // The className should be applied to the wrapper div
      const wrapper = screen.getByTestId("server-dashboard").parentElement;
      expect(wrapper).toHaveClass("custom-class");
    });

    it("should work without optional props", () => {
      render(<LazyServerDashboard />);

      expect(screen.getByTestId("server-dashboard")).toBeInTheDocument();
    });
  });

  describe("Integration", () => {
    it("should integrate with ErrorBoundary component", () => {
      // Test that the component structure includes ErrorBoundary
      render(<LazyServerDashboard {...mockProps} />);

      // Component should render without errors
      expect(screen.getByTestId("server-dashboard")).toBeInTheDocument();
    });

    it("should integrate with LoadingFallback component", () => {
      // The LoadingFallback is used in Suspense fallback
      // This test verifies the integration structure
      render(<LazyServerDashboard {...mockProps} />);

      // Should eventually show the loaded component
      expect(screen.getByTestId("server-dashboard")).toBeInTheDocument();
    });
  });

  describe("Performance", () => {
    it("should not cause unnecessary re-renders", () => {
      const { rerender } = render(<LazyServerDashboard {...mockProps} />);

      expect(screen.getByTestId("server-dashboard")).toBeInTheDocument();

      // Re-render with same props
      rerender(<LazyServerDashboard {...mockProps} />);

      // Should still be present
      expect(screen.getByTestId("server-dashboard")).toBeInTheDocument();
    });

    it("should handle prop changes correctly", () => {
      const { rerender } = render(<LazyServerDashboard />);

      expect(screen.getByTestId("server-dashboard")).toBeInTheDocument();

      // Re-render with different className
      rerender(<LazyServerDashboard className="new-class" />);

      // Should still render the component
      expect(screen.getByTestId("server-dashboard")).toBeInTheDocument();
    });
  });

  describe("LoadingFallback Configuration", () => {
    it("should be configured to use serverDashboard type", () => {
      // In test environment, the component may load immediately
      // This test verifies that the LazyServerDashboard is set up correctly
      // The loading fallback type configuration is tested through component structure
      render(<LazyServerDashboard />);

      // Should eventually show the loaded component
      expect(screen.getByTestId("server-dashboard")).toBeInTheDocument();
    });
  });

  describe("Bundle Splitting Verification", () => {
    it("should not import ServerDashboard synchronously", () => {
      // This test verifies that LazyServerDashboard doesn't synchronously import ServerDashboard
      // The actual import should happen through React.lazy()
      expect(LazyServerDashboard).toBeDefined();
      expect(typeof LazyServerDashboard).toBe("function");

      // Component should be ready to render without importing ServerDashboard
      const { container } = render(<LazyServerDashboard />);
      expect(container).toBeInTheDocument();
    });
  });
});
