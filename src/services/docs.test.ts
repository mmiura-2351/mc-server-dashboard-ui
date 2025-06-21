import { describe, it, expect, vi, beforeEach } from "vitest";
import { docsService } from "./docs";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("DocsService", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe("loadManifest", () => {
    it("loads manifest successfully", async () => {
      const mockManifest = {
        documents: [
          {
            slug: "user-guide",
            title: "User Guide",
            description: "Complete guide for users",
            lastUpdated: "2025-06-20",
            category: "Getting Started",
            order: 1,
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest),
      });

      const result = await docsService.loadManifest("en");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockManifest);
      }
      expect(mockFetch).toHaveBeenCalledWith("/docs/en/manifest.json");
    });

    it("returns error when manifest fetch fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Not Found",
      });

      const result = await docsService.loadManifest("en");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toContain("Failed to load manifest");
      }
    });

    it("returns error when fetch throws", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await docsService.loadManifest("en");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toContain("Error loading manifest");
      }
    });
  });

  describe("loadDocument", () => {
    const mockManifest = {
      documents: [
        {
          slug: "user-guide",
          title: "User Guide",
          description: "Complete guide for users",
          lastUpdated: "2025-06-20",
          category: "Getting Started",
          order: 1,
        },
      ],
    };

    const mockMarkdownContent = "# User Guide\n\nThis is a user guide.";

    it("loads document successfully", async () => {
      // Mock manifest fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest),
      });

      // Mock markdown content fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockMarkdownContent),
      });

      const result = await docsService.loadDocument("user-guide", "en");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.metadata).toEqual(mockManifest.documents[0]);
        expect(result.value.content).toBe(mockMarkdownContent);
        expect(result.value.htmlContent).toContain("<h1>User Guide</h1>");
      }
    });

    it("returns error when document not found in manifest", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest),
      });

      const result = await docsService.loadDocument("non-existent", "en");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toContain("Document not found");
      }
    });

    it("returns error when manifest loading fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Not Found",
      });

      const result = await docsService.loadDocument("user-guide", "en");

      expect(result.isErr()).toBe(true);
    });

    it("returns error when markdown content fetch fails", async () => {
      // Mock manifest fetch success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest),
      });

      // Mock markdown content fetch failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Not Found",
      });

      const result = await docsService.loadDocument("user-guide", "en");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toContain("Failed to load document");
      }
    });
  });

  describe("getAllDocuments", () => {
    it("returns sorted documents", async () => {
      const mockManifest = {
        documents: [
          {
            slug: "doc2",
            title: "Document 2",
            description: "Second document",
            lastUpdated: "2025-06-20",
            category: "B Category",
            order: 2,
          },
          {
            slug: "doc1",
            title: "Document 1",
            description: "First document",
            lastUpdated: "2025-06-20",
            category: "A Category",
            order: 1,
          },
          {
            slug: "doc3",
            title: "Document 3",
            description: "Third document",
            lastUpdated: "2025-06-20",
            category: "A Category",
            order: 2,
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest),
      });

      const result = await docsService.getAllDocuments("en");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const documents = result.value;
        // Should be sorted by category first, then by order
        expect(documents[0]?.slug).toBe("doc1"); // A Category, order 1
        expect(documents[1]?.slug).toBe("doc3"); // A Category, order 2
        expect(documents[2]?.slug).toBe("doc2"); // B Category, order 2
      }
    });
  });

  describe("searchDocuments", () => {
    const mockManifest = {
      documents: [
        {
          slug: "user-guide",
          title: "User Guide",
          description: "Complete guide for users",
          lastUpdated: "2025-06-20",
          category: "Getting Started",
          order: 1,
        },
        {
          slug: "admin-guide",
          title: "Admin Guide",
          description: "Administration manual",
          lastUpdated: "2025-06-20",
          category: "Administration",
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
      ],
    };

    it("searches by title", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest),
      });

      const result = await docsService.searchDocuments("admin", "en");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]?.slug).toBe("admin-guide");
      }
    });

    it("searches by description", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest),
      });

      const result = await docsService.searchDocuments("issues", "en");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]?.slug).toBe("troubleshooting");
      }
    });

    it("returns empty array when no matches found", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest),
      });

      const result = await docsService.searchDocuments("nonexistent", "en");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(0);
      }
    });

    it("is case insensitive", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest),
      });

      const result = await docsService.searchDocuments("USER", "en");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]?.slug).toBe("user-guide");
      }
    });
  });
});
