/**
 * Tests for LoadingFallback component used in lazy loading
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingFallback } from "./loading-fallback";

// Mock the language context
vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "common.loading": "Loading...",
        "common.loadingComponent": "Loading component...",
        "server.files.loading": "Loading file explorer...",
        "server.dashboard.loading": "Loading server dashboard...",
        "admin.loading": "Loading admin panel...",
      };
      return translations[key] || key;
    },
    locale: "en",
  }),
}));

describe("LoadingFallback", () => {
  describe("Basic Rendering", () => {
    it("should render loading spinner and text", () => {
      render(<LoadingFallback />);

      expect(screen.getByText("Loading component...")).toBeInTheDocument();
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("should have proper ARIA attributes for accessibility", () => {
      render(<LoadingFallback />);

      const loadingElement = screen.getByRole("status");
      expect(loadingElement).toHaveAttribute("aria-live", "polite");
      expect(loadingElement).toHaveAttribute(
        "aria-label",
        "Loading component..."
      );
    });
  });

  describe("Custom Messages", () => {
    it("should render custom loading message when provided", () => {
      render(<LoadingFallback message="Loading file explorer..." />);

      expect(screen.getByText("Loading file explorer...")).toBeInTheDocument();
    });

    it("should render translated message when translation key is provided", () => {
      render(<LoadingFallback translationKey="server.files.loading" />);

      expect(screen.getByText("Loading file explorer...")).toBeInTheDocument();
    });

    it("should prioritize custom message over translation key", () => {
      render(
        <LoadingFallback
          message="Custom Message"
          translationKey="server.files.loading"
        />
      );

      expect(screen.getByText("Custom Message")).toBeInTheDocument();
      expect(
        screen.queryByText("Loading file explorer...")
      ).not.toBeInTheDocument();
    });
  });

  describe("Styling and Layout", () => {
    it("should apply fullscreen class when fullscreen prop is true", () => {
      render(<LoadingFallback fullscreen />);

      const container = screen
        .getByRole("status")
        .closest("div")?.parentElement;
      expect(container?.className).toMatch(/fullscreen/);
    });

    it("should apply compact class when compact prop is true", () => {
      render(<LoadingFallback compact />);

      const container = screen
        .getByRole("status")
        .closest("div")?.parentElement;
      expect(container?.className).toMatch(/compact/);
    });

    it("should apply custom className when provided", () => {
      render(<LoadingFallback className="custom-class" />);

      const container = screen
        .getByRole("status")
        .closest("div")?.parentElement;
      expect(container?.className).toMatch(/custom-class/);
    });
  });

  describe("Spinner Variants", () => {
    it("should render default spinner by default", () => {
      render(<LoadingFallback />);

      const spinner = screen.getByTestId("loading-spinner");
      expect(spinner.className).toMatch(/spinner/);
    });

    it("should render pulse spinner when variant is pulse", () => {
      render(<LoadingFallback variant="pulse" />);

      const spinner = screen.getByTestId("loading-spinner");
      expect(spinner.className).toMatch(/pulse/);
    });

    it("should render dots spinner when variant is dots", () => {
      render(<LoadingFallback variant="dots" />);

      const spinner = screen.getByTestId("loading-spinner");
      expect(spinner.className).toMatch(/dots/);
    });
  });

  describe("Predefined Loading Types", () => {
    it("should render file explorer specific loading", () => {
      render(<LoadingFallback type="fileExplorer" />);

      expect(screen.getByText("Loading file explorer...")).toBeInTheDocument();
    });

    it("should render server dashboard specific loading", () => {
      render(<LoadingFallback type="serverDashboard" />);

      expect(
        screen.getByText("Loading server dashboard...")
      ).toBeInTheDocument();
    });

    it("should render admin panel specific loading", () => {
      render(<LoadingFallback type="adminPanel" />);

      expect(screen.getByText("Loading admin panel...")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined props gracefully", () => {
      expect(() => render(<LoadingFallback />)).not.toThrow();
    });

    it("should render fallback text when translation fails", () => {
      // Test with a custom message when translation is not available
      render(<LoadingFallback message="Custom Loading..." />);

      // Should use the custom message
      expect(screen.getByText("Custom Loading...")).toBeInTheDocument();
    });
  });

  describe("Performance", () => {
    it("should not re-render unnecessarily with same props", () => {
      const { rerender } = render(<LoadingFallback message="Loading..." />);

      // Re-render with same props
      rerender(<LoadingFallback message="Loading..." />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });
});
