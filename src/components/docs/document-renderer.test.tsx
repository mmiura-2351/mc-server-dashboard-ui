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

  describe("XSS Protection", () => {
    it("sanitizes malicious script tags", () => {
      const maliciousDocument: Document = {
        ...mockDocument,
        htmlContent: `
          <h1>Safe Content</h1>
          <script>alert('XSS Attack!');</script>
          <p>More safe content</p>
        `,
      };

      const { container } = render(
        <DocumentRenderer document={maliciousDocument} />
      );

      // Script tags should be removed
      const scripts = container.querySelectorAll("script");
      expect(scripts).toHaveLength(0);

      // Safe content should remain
      expect(screen.getByText("Safe Content")).toBeInTheDocument();
      expect(screen.getByText("More safe content")).toBeInTheDocument();
    });

    it("removes dangerous event handlers", () => {
      const maliciousDocument: Document = {
        ...mockDocument,
        htmlContent: `
          <div onclick="alert('XSS!')">Click me</div>
          <img src="image.jpg" onerror="alert('XSS!')" alt="Test" />
          <p onmouseover="alert('XSS!')">Hover me</p>
        `,
      };

      const { container } = render(
        <DocumentRenderer document={maliciousDocument} />
      );

      // Event handlers should be removed
      const divElement = container.querySelector("div");
      expect(divElement).not.toHaveAttribute("onclick");

      const imgElement = container.querySelector("img");
      expect(imgElement).not.toHaveAttribute("onerror");

      const pElement = container.querySelector("p");
      expect(pElement).not.toHaveAttribute("onmouseover");

      // Safe attributes should remain
      expect(imgElement).toHaveAttribute("src", "image.jpg");
      expect(imgElement).toHaveAttribute("alt", "Test");
    });

    it("removes dangerous tags while keeping safe content", () => {
      const maliciousDocument: Document = {
        ...mockDocument,
        htmlContent: `
          <h2>Safe Heading</h2>
          <object data="malicious.swf"></object>
          <embed src="malicious.swf"></embed>
          <iframe src="javascript:alert('XSS!')"></iframe>
          <p>Safe paragraph</p>
        `,
      };

      const { container } = render(
        <DocumentRenderer document={maliciousDocument} />
      );

      // Dangerous tags should be removed
      expect(container.querySelector("object")).toBeNull();
      expect(container.querySelector("embed")).toBeNull();
      expect(container.querySelector("iframe")).toBeNull();

      // Safe content should remain
      expect(screen.getByText("Safe Heading")).toBeInTheDocument();
      expect(screen.getByText("Safe paragraph")).toBeInTheDocument();
    });

    it("preserves safe HTML formatting", () => {
      const safeDocument: Document = {
        ...mockDocument,
        htmlContent: `
          <h1>Main Title</h1>
          <h2>Subtitle</h2>
          <p><strong>Bold text</strong> and <em>italic text</em></p>
          <ul>
            <li>List item 1</li>
            <li>List item 2</li>
          </ul>
          <blockquote>This is a quote</blockquote>
          <pre><code>console.log('code block');</code></pre>
          <a href="https://example.com">Safe link</a>
        `,
      };

      const { container } = render(
        <DocumentRenderer document={safeDocument} />
      );

      // All safe elements should be present
      expect(screen.getByText("Main Title")).toBeInTheDocument();
      expect(screen.getByText("Subtitle")).toBeInTheDocument();
      expect(screen.getByText("Bold text")).toBeInTheDocument();
      expect(screen.getByText("italic text")).toBeInTheDocument();
      expect(screen.getByText("List item 1")).toBeInTheDocument();
      expect(screen.getByText("This is a quote")).toBeInTheDocument();
      expect(
        screen.getByText("console.log('code block');")
      ).toBeInTheDocument();

      // Check that proper HTML structure is maintained
      expect(container.querySelector("h1")).toBeInTheDocument();
      expect(container.querySelector("strong")).toBeInTheDocument();
      expect(container.querySelector("em")).toBeInTheDocument();
      expect(container.querySelector("ul")).toBeInTheDocument();
      expect(container.querySelector("blockquote")).toBeInTheDocument();
      expect(container.querySelector("pre")).toBeInTheDocument();
      expect(
        container.querySelector("a[href='https://example.com']")
      ).toBeInTheDocument();
    });

    it("handles javascript: protocol in links", () => {
      const maliciousDocument: Document = {
        ...mockDocument,
        htmlContent: `
          <a href="javascript:alert('XSS!')">Malicious link</a>
          <a href="https://example.com">Safe link</a>
          <a href="mailto:test@example.com">Email link</a>
        `,
      };

      const { container } = render(
        <DocumentRenderer document={maliciousDocument} />
      );

      const links = container.querySelectorAll("a");

      // Should remove javascript: protocol
      const maliciousLink = Array.from(links).find(
        (link) => link.textContent === "Malicious link"
      );
      expect(maliciousLink).not.toHaveAttribute(
        "href",
        "javascript:alert('XSS!')"
      );

      // Safe links should remain
      const safeLink = Array.from(links).find(
        (link) => link.textContent === "Safe link"
      );
      expect(safeLink).toHaveAttribute("href", "https://example.com");

      const emailLink = Array.from(links).find(
        (link) => link.textContent === "Email link"
      );
      expect(emailLink).toHaveAttribute("href", "mailto:test@example.com");
    });
  });
});
