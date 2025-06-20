import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DocumentRenderer } from "./document-renderer";
import { Document } from "@/services/docs";

// Mock the translation hook
const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    "docs.lastUpdated": "Last updated",
  };
  return translations[key] || key;
});

vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({ t: mockT }),
}));

describe("DocumentRenderer", () => {
  const mockDocument: Document = {
    metadata: {
      slug: "test-doc",
      title: "Test Document",
      description: "This is a test document",
      lastUpdated: "2025-06-20",
      category: "Testing",
      order: 1,
    },
    content: "# Test Document\n\nThis is test content",
    htmlContent: "<h1>Test Document</h1><p>This is test content</p>",
  };

  it("renders document metadata correctly", () => {
    const { container } = render(<DocumentRenderer document={mockDocument} />);

    // Check that we have an article element
    const article = container.querySelector("article");
    expect(article).toBeInTheDocument();

    expect(screen.getByText("This is a test document")).toBeInTheDocument();
    expect(screen.getByText("Testing")).toBeInTheDocument();
    expect(screen.getByText(/Last updated.*6\/20\/2025/)).toBeInTheDocument();
  });

  it("renders HTML content", () => {
    render(<DocumentRenderer document={mockDocument} />);

    // Check that the HTML content was processed and rendered
    // The HTML content contains both the header h1 and the content h1
    const headings = screen.getAllByText("Test Document");
    expect(headings).toHaveLength(2); // One in header, one in content

    // Check for content that comes from the HTML processing
    expect(screen.getByText("This is test content")).toBeInTheDocument();
  });

  it("applies custom className when provided", () => {
    const { container } = render(
      <DocumentRenderer document={mockDocument} className="custom-class" />
    );

    const article = container.querySelector("article");
    expect(article).toHaveClass("custom-class");
  });

  it("formats date correctly", () => {
    const documentWithDifferentDate: Document = {
      ...mockDocument,
      metadata: {
        ...mockDocument.metadata,
        lastUpdated: "2024-12-01",
      },
    };

    render(<DocumentRenderer document={documentWithDifferentDate} />);

    expect(screen.getByText(/Last updated.*12\/1\/2024/)).toBeInTheDocument();
  });

  it("calls translation function with correct key", () => {
    render(<DocumentRenderer document={mockDocument} />);

    expect(mockT).toHaveBeenCalledWith("docs.lastUpdated");
  });
});
