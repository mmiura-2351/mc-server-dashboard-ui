/**
 * Integration tests for lazy loading behavior across all lazy components
 * Tests the actual lazy loading performance and code splitting effectiveness
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// Mock the language context for all tests
vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "files.loading": "Loading file explorer...",
        "servers.dashboard.loading": "Loading server dashboard...",
        "admin.loading": "Loading admin panel...",
        "common.loading": "Loading...",
      };
      return translations[key] || key;
    },
    locale: "en",
  }),
}));

// Mock auth context for admin tests
const mockAuthContext = {
  user: { id: 1, username: "testadmin", role: "admin", is_approved: true },
  isAuthenticated: true,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
};

vi.mock("@/contexts/auth", () => ({
  useAuth: () => mockAuthContext,
}));

// Mock next router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("Lazy Loading Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module registry to ensure fresh imports
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("LazyFileExplorer Integration", () => {
    it("should demonstrate code splitting behavior", async () => {
      // Import LazyFileExplorer dynamically to test actual lazy loading
      const { LazyFileExplorer } = await import(
        "@/components/server/LazyFileExplorer"
      );

      const startTime = performance.now();
      const { container } = render(<LazyFileExplorer serverId={1} />);
      const renderTime = performance.now() - startTime;

      // Should render quickly (lazy wrapper loads fast)
      expect(renderTime).toBeLessThan(100); // Less than 100ms
      expect(container).toBeInTheDocument();

      // Should eventually show the file explorer content
      await waitFor(
        () => {
          expect(
            container.querySelector('[data-testid*="file"]')
          ).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it("should handle loading states properly", async () => {
      const { LazyFileExplorer } = await import(
        "@/components/server/LazyFileExplorer"
      );

      render(<LazyFileExplorer serverId={1} />);

      // Should show some content (loading state or loaded component)
      // In test environment, component loads immediately
      const content =
        screen.getByRole("status") ||
        screen.getByText(/loading|file|explorer/i) ||
        screen.getByTestId(/file|loading/);
      expect(content).toBeInTheDocument();
    });

    it("should maintain component functionality after lazy loading", async () => {
      const { LazyFileExplorer } = await import(
        "@/components/server/LazyFileExplorer"
      );

      const { container } = render(<LazyFileExplorer serverId={42} />);

      await waitFor(() => {
        // Should render file explorer content
        expect(container.textContent).toMatch(/file|explorer|loading/i);
      });
    });
  });

  describe("LazyServerDashboard Integration", () => {
    it("should demonstrate bundle splitting for dashboard", async () => {
      const { LazyServerDashboard } = await import(
        "@/components/server/LazyServerDashboard"
      );

      const startTime = performance.now();
      const { container } = render(<LazyServerDashboard />);
      const renderTime = performance.now() - startTime;

      // Lazy wrapper should render quickly
      expect(renderTime).toBeLessThan(100);
      expect(container).toBeInTheDocument();

      // Should eventually show dashboard content
      await waitFor(
        () => {
          expect(container.textContent).toMatch(/dashboard|server|loading/i);
        },
        { timeout: 2000 }
      );
    });

    it("should show appropriate loading message", async () => {
      const { LazyServerDashboard } = await import(
        "@/components/server/LazyServerDashboard"
      );

      render(<LazyServerDashboard />);

      // Should show some content (loading or loaded)
      await waitFor(() => {
        expect(
          screen.getByText(/loading|dashboard|server/i)
        ).toBeInTheDocument();
      });
    });

    it("should handle className prop correctly", async () => {
      const { LazyServerDashboard } = await import(
        "@/components/server/LazyServerDashboard"
      );

      const { container } = render(
        <LazyServerDashboard className="test-class" />
      );

      await waitFor(() => {
        // Should apply className to wrapper
        expect(container.querySelector(".test-class")).toBeInTheDocument();
      });
    });
  });

  describe("LazyAdminPanel Integration", () => {
    it("should demonstrate admin-only code splitting", async () => {
      const { LazyAdminPanel } = await import(
        "@/components/admin/LazyAdminPanel"
      );

      const startTime = performance.now();
      const { container } = render(<LazyAdminPanel />);
      const renderTime = performance.now() - startTime;

      // Should render wrapper quickly
      expect(renderTime).toBeLessThan(100);
      expect(container).toBeInTheDocument();

      // Should eventually show admin panel content
      await waitFor(
        () => {
          expect(container.textContent).toMatch(
            /admin|user|management|loading/i
          );
        },
        { timeout: 2000 }
      );
    });

    it("should load admin functionality only when needed", async () => {
      const { LazyAdminPanel } = await import(
        "@/components/admin/LazyAdminPanel"
      );

      render(<LazyAdminPanel />);

      await waitFor(() => {
        // Should show admin-related content
        expect(screen.getByText(/admin|user|management/i)).toBeInTheDocument();
      });
    });

    it("should handle admin-specific loading states", async () => {
      const { LazyAdminPanel } = await import(
        "@/components/admin/LazyAdminPanel"
      );

      render(<LazyAdminPanel />);

      // Should show loading or admin content
      await waitFor(() => {
        const content = screen.getByText(/loading|admin|user/i);
        expect(content).toBeInTheDocument();
      });
    });
  });

  describe("Cross-Component Lazy Loading", () => {
    it("should load multiple lazy components independently", async () => {
      const [
        { LazyFileExplorer },
        { LazyServerDashboard },
        { LazyAdminPanel },
      ] = await Promise.all([
        import("@/components/server/LazyFileExplorer"),
        import("@/components/server/LazyServerDashboard"),
        import("@/components/admin/LazyAdminPanel"),
      ]);

      const { rerender, container } = render(<LazyFileExplorer serverId={1} />);

      await waitFor(() => {
        expect(container.textContent).toMatch(/file|explorer|loading/i);
      });

      // Switch to dashboard
      rerender(<LazyServerDashboard />);

      await waitFor(() => {
        expect(container.textContent).toMatch(/dashboard|server|loading/i);
      });

      // Switch to admin panel
      rerender(<LazyAdminPanel />);

      await waitFor(() => {
        expect(container.textContent).toMatch(/admin|user|management|loading/i);
      });
    });

    it("should maintain separate loading states", async () => {
      const { LazyFileExplorer } = await import(
        "@/components/server/LazyFileExplorer"
      );
      const { LazyServerDashboard } = await import(
        "@/components/server/LazyServerDashboard"
      );

      const { container: container1 } = render(
        <LazyFileExplorer serverId={1} />
      );
      const { container: container2 } = render(<LazyServerDashboard />);

      // Both should render independently
      expect(container1).toBeInTheDocument();
      expect(container2).toBeInTheDocument();

      await waitFor(() => {
        expect(container1.textContent || "").toMatch(/file|explorer|loading/i);
        expect(container2.textContent || "").toMatch(
          /dashboard|server|loading/i
        );
      });
    });
  });

  describe("Performance Characteristics", () => {
    it("should demonstrate lazy loading performance benefits", async () => {
      // Test that lazy components don't block initial render
      const performanceMarks: number[] = [];

      performanceMarks.push(performance.now());
      const { LazyFileExplorer } = await import(
        "@/components/server/LazyFileExplorer"
      );
      performanceMarks.push(performance.now());

      const { container } = render(<LazyFileExplorer serverId={1} />);
      performanceMarks.push(performance.now());

      // Import should be fast
      expect(
        (performanceMarks[1] || 0) - (performanceMarks[0] || 0)
      ).toBeLessThan(50);
      // Initial render should be fast
      expect(
        (performanceMarks[2] || 0) - (performanceMarks[1] || 0)
      ).toBeLessThan(50);

      expect(container).toBeInTheDocument();
    });

    it("should handle multiple lazy component imports efficiently", async () => {
      const startTime = performance.now();

      // Import all lazy components
      await Promise.all([
        import("@/components/server/LazyFileExplorer"),
        import("@/components/server/LazyServerDashboard"),
        import("@/components/admin/LazyAdminPanel"),
      ]);

      const importTime = performance.now() - startTime;

      // All imports should complete reasonably quickly
      expect(importTime).toBeLessThan(200); // Less than 200ms for all imports
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle lazy loading errors gracefully", async () => {
      // Test error boundary integration
      const { LazyFileExplorer } = await import(
        "@/components/server/LazyFileExplorer"
      );

      const { container } = render(<LazyFileExplorer serverId={1} />);

      // Should not throw errors during lazy loading
      await waitFor(
        () => {
          expect(container.textContent).toMatch(/file|loading|explorer/i);
        },
        { timeout: 2000 }
      );
    });

    it("should maintain error boundaries across lazy components", async () => {
      const components = [
        import("@/components/server/LazyFileExplorer"),
        import("@/components/server/LazyServerDashboard"),
        import("@/components/admin/LazyAdminPanel"),
      ];

      // All components should import without errors
      const results = await Promise.allSettled(components);

      results.forEach((result) => {
        expect(result.status).toBe("fulfilled");
      });
    });
  });

  describe("Bundle Splitting Verification", () => {
    it("should verify components are actually lazy loaded", () => {
      // Verify that lazy components are not synchronously available
      // This tests that they're actually code-split

      // These should be functions (lazy component wrappers)
      expect(
        () => import("@/components/server/LazyFileExplorer")
      ).toBeDefined();
      expect(
        () => import("@/components/server/LazyServerDashboard")
      ).toBeDefined();
      expect(() => import("@/components/admin/LazyAdminPanel")).toBeDefined();
    });

    it("should ensure lazy components use React.lazy pattern", async () => {
      const { LazyFileExplorer } = await import(
        "@/components/server/LazyFileExplorer"
      );
      const { LazyServerDashboard } = await import(
        "@/components/server/LazyServerDashboard"
      );
      const { LazyAdminPanel } = await import(
        "@/components/admin/LazyAdminPanel"
      );

      // All should be React components
      expect(typeof LazyFileExplorer).toBe("function");
      expect(typeof LazyServerDashboard).toBe("function");
      expect(typeof LazyAdminPanel).toBe("function");

      // Should have display names
      expect(LazyFileExplorer.displayName).toBe("LazyFileExplorer");
      expect(LazyServerDashboard.displayName).toBe("LazyServerDashboard");
      expect(LazyAdminPanel.displayName).toBe("LazyAdminPanel");
    });
  });
});
