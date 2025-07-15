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

    const mockMarkdownWithFrontmatter = `---
slug: user-guide
title: User Guide
description: Complete guide for users
category: Getting Started
order: 1
lastUpdated: 2025-06-20
---

# User Guide

This is a user guide.`;

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

    it("removes frontmatter from content and HTML", async () => {
      // Mock manifest fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockManifest),
      });

      // Mock markdown content fetch with frontmatter
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockMarkdownWithFrontmatter),
      });

      const result = await docsService.loadDocument("user-guide", "en");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Content should not contain frontmatter
        expect(result.value.content).not.toContain("slug: user-guide");
        expect(result.value.content).not.toContain("title: User Guide");
        expect(result.value.content).not.toContain("---");
        expect(result.value.content).toBe(
          "# User Guide\n\nThis is a user guide."
        );

        // HTML should not contain frontmatter
        expect(result.value.htmlContent).not.toContain("slug: user-guide");
        expect(result.value.htmlContent).not.toContain("title: User Guide");
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
    it("returns documents in manifest order", async () => {
      // Mock manifest with documents in specific order (as would be generated by build script)
      const mockManifest = {
        documents: [
          {
            slug: "getting-started",
            title: "Getting Started",
            description: "First document",
            lastUpdated: "2025-06-20",
            category: "Getting Started",
            order: 1,
          },
          {
            slug: "server-setup",
            title: "Server Setup",
            description: "Second document",
            lastUpdated: "2025-06-20",
            category: "Server Management",
            order: 1,
          },
          {
            slug: "advanced-config",
            title: "Advanced Configuration",
            description: "Third document",
            lastUpdated: "2025-06-20",
            category: "Advanced Features",
            order: 1,
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
        // Should maintain the order from manifest.json (no additional sorting)
        expect(documents[0]?.slug).toBe("getting-started");
        expect(documents[1]?.slug).toBe("server-setup");
        expect(documents[2]?.slug).toBe("advanced-config");

        // Verify the order is exactly as in manifest
        expect(documents).toHaveLength(3);
        expect(documents).toEqual(mockManifest.documents);
      }
    });

    it("preserves manifest order regardless of category names", async () => {
      // Test with categories in non-alphabetical order to ensure no sorting occurs
      const mockManifest = {
        documents: [
          {
            slug: "doc-z",
            title: "Z Document",
            description: "Document from Z category",
            lastUpdated: "2025-06-20",
            category: "Z Category",
            order: 1,
          },
          {
            slug: "doc-a",
            title: "A Document",
            description: "Document from A category",
            lastUpdated: "2025-06-20",
            category: "A Category",
            order: 1,
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
        // Should maintain manifest order, not alphabetical by category
        expect(documents[0]?.slug).toBe("doc-z");
        expect(documents[1]?.slug).toBe("doc-a");
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
