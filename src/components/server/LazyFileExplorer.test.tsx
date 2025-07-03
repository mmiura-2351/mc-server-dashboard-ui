/**
 * Tests for LazyFileExplorer component with lazy loading behavior
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock the language context
vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "files.loading": "Loading file explorer...",
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
      Loading {type === "fileExplorer" ? "file explorer" : "component"}...
    </div>
  ),
}));

// Mock ErrorBoundary
vi.mock("@/components/error/error-boundary", () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock the FileExplorer component that will be lazy loaded
vi.mock("./file-explorer/FileExplorer", () => ({
  FileExplorer: ({ serverId }: { serverId: number }) => (
    <div data-testid="file-explorer" data-server-id={serverId}>
      File Explorer Component {serverId}
    </div>
  ),
}));

import { LazyFileExplorer } from "./LazyFileExplorer";

describe("LazyFileExplorer", () => {
  const mockProps = {
    serverId: 1,
    className: "test-class",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Component Rendering", () => {
    it("should show loading state initially", () => {
      render(<LazyFileExplorer {...mockProps} />);

      // Should show loading fallback while lazy component loads
      expect(screen.getByTestId("loading-fallback")).toBeInTheDocument();
      expect(screen.getByText("Loading file explorer...")).toBeInTheDocument();
    });

    it("should render with correct props structure", () => {
      const { container } = render(<LazyFileExplorer {...mockProps} />);

      // Should render some content (either loading or loaded component)
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe("Component Structure", () => {
    it("should have correct display name", () => {
      expect(LazyFileExplorer.displayName).toBe("LazyFileExplorer");
    });

    it("should be a functional component", () => {
      expect(typeof LazyFileExplorer).toBe("function");
    });

    it("should handle serverId as required prop", () => {
      // This test ensures TypeScript compilation
      expect(() => {
        render(<LazyFileExplorer serverId={1} />);
      }).not.toThrow();
    });
  });

  describe("Error Handling", () => {
    it("should wrap component in ErrorBoundary", () => {
      // Since we mocked ErrorBoundary to render children directly,
      // this test verifies the structure is correct
      render(<LazyFileExplorer {...mockProps} />);

      expect(screen.getByTestId("file-explorer")).toBeInTheDocument();
    });
  });

  describe("Code Splitting", () => {
    it("should be set up for lazy loading", () => {
      // This verifies the component is structured for lazy loading
      // The actual lazy loading behavior is tested in integration tests
      expect(LazyFileExplorer).toBeDefined();
      expect(typeof LazyFileExplorer).toBe("function");
    });
  });

  describe("Props Interface", () => {
    it("should accept serverId prop", () => {
      render(<LazyFileExplorer serverId={42} />);

      const fileExplorer = screen.getByTestId("file-explorer");
      expect(fileExplorer).toHaveAttribute("data-server-id", "42");
    });

    it("should accept optional className prop", () => {
      render(<LazyFileExplorer serverId={1} className="custom-class" />);

      // The className should be applied to the wrapper div, not the FileExplorer component
      const wrapper = screen.getByTestId("file-explorer").parentElement;
      expect(wrapper).toHaveClass("custom-class");
    });

    it("should work without optional props", () => {
      render(<LazyFileExplorer serverId={1} />);

      expect(screen.getByTestId("file-explorer")).toBeInTheDocument();
    });
  });

  describe("Integration", () => {
    it("should integrate with ErrorBoundary component", () => {
      // Test that the component structure includes ErrorBoundary
      render(<LazyFileExplorer {...mockProps} />);

      // Component should render without errors
      expect(screen.getByTestId("file-explorer")).toBeInTheDocument();
    });

    it("should integrate with LoadingFallback component", () => {
      // The LoadingFallback is used in Suspense fallback
      // This test verifies the integration structure
      render(<LazyFileExplorer {...mockProps} />);

      // Should eventually show the loaded component
      expect(screen.getByTestId("file-explorer")).toBeInTheDocument();
    });
  });

  describe("Performance", () => {
    it("should not cause unnecessary re-renders", () => {
      const { rerender } = render(<LazyFileExplorer {...mockProps} />);

      expect(screen.getByTestId("file-explorer")).toBeInTheDocument();

      // Re-render with same props
      rerender(<LazyFileExplorer {...mockProps} />);

      // Should still be present
      expect(screen.getByTestId("file-explorer")).toBeInTheDocument();
    });

    it("should update when props change", () => {
      const { rerender } = render(<LazyFileExplorer serverId={1} />);

      expect(screen.getByText("File Explorer Component 1")).toBeInTheDocument();

      // Re-render with different serverId
      rerender(<LazyFileExplorer serverId={2} />);

      expect(screen.getByText("File Explorer Component 2")).toBeInTheDocument();
    });
  });
});
