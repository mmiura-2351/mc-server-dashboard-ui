import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import DocsPage from "./page";
import { docsService } from "@/services/docs";
import { ok, err } from "neverthrow";

// Mock the docs service
vi.mock("@/services/docs", () => ({
  docsService: {
    getAllDocuments: vi.fn(),
    searchDocuments: vi.fn(),
  },
}));

// Mock Next.js Link component
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

// Mock DocumentNavigation component to avoid conflicts with multiple loading states
vi.mock("@/components/docs/document-navigation", () => ({
  DocumentNavigation: () => (
    <div data-testid="document-navigation">Navigation</div>
  ),
}));

// Mock the translation hook
const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    "docs.title": "Documentation",
    "docs.description": "Browse the user documentation",
    "docs.searchPlaceholder": "Search documentation...",
    "docs.lastUpdated": "Last updated",
    "docs.loadError": "Failed to load documentation",
    "docs.noResults": "No documents found",
    "common.loading": "Loading...",
  };
  return translations[key] || key;
});

vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({ t: mockT }),
  useLanguage: () => ({ locale: "en" }),
}));

describe("DocsPage", () => {
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

    render(<DocsPage />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.getByText("Documentation")).toBeInTheDocument();
    expect(
      screen.getByText("Browse the user documentation")
    ).toBeInTheDocument();
  });

  it("renders documents when loaded successfully", async () => {
    vi.mocked(docsService.getAllDocuments).mockResolvedValue(ok(mockDocuments));

    render(<DocsPage />);

    await waitFor(() => {
      expect(screen.getByText("User Guide")).toBeInTheDocument();
      expect(screen.getByText("Troubleshooting")).toBeInTheDocument();
      expect(screen.getByText("Complete guide for users")).toBeInTheDocument();
      expect(
        screen.getByText("Common issues and solutions")
      ).toBeInTheDocument();
    });
  });

  it("groups documents by category", async () => {
    vi.mocked(docsService.getAllDocuments).mockResolvedValue(ok(mockDocuments));

    render(<DocsPage />);

    await waitFor(() => {
      expect(screen.getByText("Getting Started")).toBeInTheDocument();
      expect(screen.getByText("Support")).toBeInTheDocument();
    });
  });

  it("renders error state when loading fails", async () => {
    vi.mocked(docsService.getAllDocuments).mockResolvedValue(
      err("Failed to load manifest")
    );

    render(<DocsPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to load documentation/)
      ).toBeInTheDocument();
    });
  });

  it("handles search input", async () => {
    vi.mocked(docsService.getAllDocuments).mockResolvedValue(ok(mockDocuments));
    vi.mocked(docsService.searchDocuments).mockResolvedValue(
      ok([mockDocuments[0]!])
    );

    render(<DocsPage />);

    await waitFor(() => {
      expect(screen.getByText("User Guide")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search documentation...");
    fireEvent.change(searchInput, { target: { value: "user" } });

    await waitFor(() => {
      expect(docsService.searchDocuments).toHaveBeenCalledWith("user", "en");
    });
  });

  it("clears search when input is empty", async () => {
    vi.mocked(docsService.getAllDocuments).mockResolvedValue(ok(mockDocuments));

    render(<DocsPage />);

    await waitFor(() => {
      expect(screen.getByText("User Guide")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search documentation...");

    // Type search term
    fireEvent.change(searchInput, { target: { value: "user" } });

    // Clear search
    fireEvent.change(searchInput, { target: { value: "" } });

    await waitFor(() => {
      expect(docsService.getAllDocuments).toHaveBeenCalledTimes(2); // Initial load + clear search
    });
  });

  it("shows no results message when search returns empty", async () => {
    vi.mocked(docsService.getAllDocuments).mockResolvedValue(ok(mockDocuments));
    vi.mocked(docsService.searchDocuments).mockResolvedValue(ok([]));

    render(<DocsPage />);

    await waitFor(() => {
      expect(screen.getByText("User Guide")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search documentation...");
    fireEvent.change(searchInput, { target: { value: "nonexistent" } });

    await waitFor(() => {
      expect(screen.getByText("No documents found")).toBeInTheDocument();
    });
  });

  it("creates correct links to documents", async () => {
    vi.mocked(docsService.getAllDocuments).mockResolvedValue(ok(mockDocuments));

    render(<DocsPage />);

    await waitFor(() => {
      const userGuideLink = screen.getByRole("link", { name: /User Guide/ });
      expect(userGuideLink).toHaveAttribute("href", "/docs/user-guide");

      const troubleshootingLink = screen.getByRole("link", {
        name: /Troubleshooting/,
      });
      expect(troubleshootingLink).toHaveAttribute(
        "href",
        "/docs/troubleshooting"
      );
    });
  });

  it("displays last updated dates", async () => {
    vi.mocked(docsService.getAllDocuments).mockResolvedValue(ok(mockDocuments));

    render(<DocsPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/Last updated.*6\/20\/2025/)).toHaveLength(2);
    });
  });
});
