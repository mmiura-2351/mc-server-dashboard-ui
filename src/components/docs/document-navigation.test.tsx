import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DocumentNavigation } from "./document-navigation";
import { docsService } from "@/services/docs";
import { ok, err } from "neverthrow";

// Mock the docs service
vi.mock("@/services/docs", () => ({
  docsService: {
    getAllDocuments: vi.fn(),
  },
}));

// Mock Next.js Link and usePathname
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/docs"),
}));

// Mock the translation hooks
const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    "docs.navigation": "Documentation",
    "docs.allDocuments": "All Documents",
    "common.loading": "Loading...",
  };
  return translations[key] || key;
});

vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({ t: mockT }),
  useLanguage: () => ({ locale: "en" }),
}));

describe("DocumentNavigation", () => {
  const mockDocuments = [
    {
      slug: "user-guide",
      title: "User Guide",
      description: "Complete guide for users",
      lastUpdated: "2025-06-20",
      category: "Getting Started",
      order: 1,
    },
    {
      slug: "server-setup",
      title: "Server Setup",
      description: "How to set up servers",
      lastUpdated: "2025-06-20",
      category: "Server Management",
      order: 1,
    },
    {
      slug: "troubleshooting",
      title: "Troubleshooting",
      description: "Common issues and solutions",
      lastUpdated: "2025-06-20",
      category: "Support",
      order: 1,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    vi.mocked(docsService.getAllDocuments).mockReturnValue(
      new Promise(() => {}) // Never resolves
    );

    render(<DocumentNavigation />);

    expect(screen.getByText("Documentation")).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders documents grouped by category", async () => {
    vi.mocked(docsService.getAllDocuments).mockResolvedValue(ok(mockDocuments));

    render(<DocumentNavigation />);

    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: /All Documents/ })
      ).toBeInTheDocument();
      expect(screen.getByText("Getting Started")).toBeInTheDocument();
      expect(screen.getByText("Server Management")).toBeInTheDocument();
      expect(screen.getByText("Support")).toBeInTheDocument();
      expect(screen.getByText("User Guide")).toBeInTheDocument();
      expect(screen.getByText("Server Setup")).toBeInTheDocument();
      expect(screen.getByText("Troubleshooting")).toBeInTheDocument();
    });
  });

  it("creates correct navigation links", async () => {
    vi.mocked(docsService.getAllDocuments).mockResolvedValue(ok(mockDocuments));

    render(<DocumentNavigation />);

    await waitFor(() => {
      const allDocsLink = screen.getByRole("link", { name: /All Documents/ });
      expect(allDocsLink).toHaveAttribute("href", "/docs");

      const userGuideLink = screen.getByRole("link", { name: /User Guide/ });
      expect(userGuideLink).toHaveAttribute("href", "/docs/user-guide");

      const serverSetupLink = screen.getByRole("link", {
        name: /Server Setup/,
      });
      expect(serverSetupLink).toHaveAttribute("href", "/docs/server-setup");

      const troubleshootingLink = screen.getByRole("link", {
        name: /Troubleshooting/,
      });
      expect(troubleshootingLink).toHaveAttribute(
        "href",
        "/docs/troubleshooting"
      );
    });
  });

  it("applies active class to current page", async () => {
    const usePathname = await import("next/navigation");
    vi.mocked(usePathname.usePathname).mockReturnValue("/docs/user-guide");

    vi.mocked(docsService.getAllDocuments).mockResolvedValue(ok(mockDocuments));

    render(<DocumentNavigation />);

    await waitFor(() => {
      const userGuideLink = screen.getByRole("link", { name: /User Guide/ });
      expect(userGuideLink.className).toContain("active");

      const serverSetupLink = screen.getByRole("link", {
        name: /Server Setup/,
      });
      expect(serverSetupLink.className).not.toContain("active");
    });
  });

  it("applies custom className when provided", async () => {
    vi.mocked(docsService.getAllDocuments).mockResolvedValue(ok(mockDocuments));

    const { container } = render(<DocumentNavigation className="custom-nav" />);

    await waitFor(() => {
      const nav = container.querySelector("nav");
      expect(nav).toHaveClass("custom-nav");
    });
  });

  it("handles empty document list", async () => {
    vi.mocked(docsService.getAllDocuments).mockResolvedValue(ok([]));

    render(<DocumentNavigation />);

    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: /All Documents/ })
      ).toBeInTheDocument();
      // Should not have any category headers or document links
      expect(screen.queryByText("Getting Started")).not.toBeInTheDocument();
      expect(screen.queryByText("User Guide")).not.toBeInTheDocument();
    });
  });

  it("handles service error gracefully", async () => {
    vi.mocked(docsService.getAllDocuments).mockResolvedValue(
      err("Failed to load documents")
    );

    render(<DocumentNavigation />);

    await waitFor(() => {
      // Should still show the navigation header and All Documents link
      expect(screen.getByText("Documentation")).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /All Documents/ })
      ).toBeInTheDocument();
      // But no documents should be shown
      expect(screen.queryByText("User Guide")).not.toBeInTheDocument();
    });
  });

  it("organizes documents properly by category", async () => {
    vi.mocked(docsService.getAllDocuments).mockResolvedValue(ok(mockDocuments));

    render(<DocumentNavigation />);

    await waitFor(() => {
      const categories = screen.getAllByText(
        /Getting Started|Server Management|Support/
      );
      expect(categories).toHaveLength(3);

      // Check that categories are rendered
      expect(screen.getByText("Getting Started")).toBeInTheDocument();
      expect(screen.getByText("Server Management")).toBeInTheDocument();
      expect(screen.getByText("Support")).toBeInTheDocument();

      // Check that documents are grouped properly by verifying all documents are present
      expect(
        screen.getByRole("link", { name: /User Guide/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Server Setup/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Troubleshooting/ })
      ).toBeInTheDocument();
    });
  });
});
