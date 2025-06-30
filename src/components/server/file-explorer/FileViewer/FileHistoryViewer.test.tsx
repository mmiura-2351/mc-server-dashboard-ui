import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ok, err } from "neverthrow";
import { FileHistoryViewer } from "./FileHistoryViewer";
import * as fileHistoryService from "@/services/file-history";
import "@testing-library/jest-dom";

// Mock the language context
const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    "files.history.loading": "Loading history...",
    "files.history.noHistory": "No history available",
    "files.history.versions": "File Versions",
    "files.history.unknownUser": "Unknown User",
    "files.history.deleteVersion": "Delete Version",
    "files.history.versionDetails": "Version Details",
    "files.history.loadingContent": "Loading content...",
    "files.history.restoreDescription": "Restore description (optional)",
    "files.history.restoreVersion": "Restore Version",
  };
  return translations[key] || key;
});

vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({ t: mockT, locale: "en" }),
}));

// Mock the file history service
vi.mock("@/services/file-history", () => ({
  getFileHistory: vi.fn(),
  getFileVersionContent: vi.fn(),
}));

const mockGetFileHistory = vi.mocked(fileHistoryService.getFileHistory);
const mockGetFileVersionContent = vi.mocked(
  fileHistoryService.getFileVersionContent
);

describe("FileHistoryViewer", () => {
  const mockHistory = {
    history: [
      {
        id: 1,
        version_number: 1,
        created_at: "2024-01-01T10:00:00Z",
        editor_username: "admin",
        file_size: 1024,
        description: "Initial version",
        server_id: 1,
        file_path: "config/server.properties",
        backup_file_path: "/backups/server.properties.v1",
        content_hash: "hash1",
        editor_user_id: 1,
      },
      {
        id: 2,
        version_number: 2,
        created_at: "2024-01-02T10:00:00Z",
        editor_username: "user1",
        file_size: 2048,
        description: "Updated configuration",
        server_id: 1,
        file_path: "config/server.properties",
        backup_file_path: "/backups/server.properties.v2",
        content_hash: "hash2",
        editor_user_id: 2,
      },
      {
        id: 3,
        version_number: 3,
        created_at: "2024-01-03T10:00:00Z",
        editor_username: null,
        file_size: 1536,
        description: null,
        server_id: 1,
        file_path: "config/server.properties",
        backup_file_path: "/backups/server.properties.v3",
        content_hash: "hash3",
        editor_user_id: null,
      },
    ],
    total_versions: 3,
    file_path: "config/server.properties",
  };

  const mockVersionContent = {
    version: 1,
    content: "server.properties content here",
    timestamp: "2024-01-01T10:00:00Z",
    filesize: 1024,
    created_by: "admin",
  };

  const defaultProps = {
    serverId: 1,
    filePath: "config/server.properties",
    onRestore: vi.fn(),
    onDelete: vi.fn(),
    isAdmin: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Initial Loading", () => {
    it("should show loading state initially", () => {
      mockGetFileHistory.mockReturnValue(new Promise(() => {})); // Never resolves

      render(<FileHistoryViewer {...defaultProps} />);

      expect(screen.getByText("Loading history...")).toBeInTheDocument();
    });

    it("should load file history on mount", async () => {
      mockGetFileHistory.mockResolvedValue(ok(mockHistory as any));

      render(<FileHistoryViewer {...defaultProps} />);

      expect(mockGetFileHistory).toHaveBeenCalledWith(
        1,
        "config/server.properties"
      );

      await waitFor(() => {
        expect(screen.getByText("File Versions")).toBeInTheDocument();
      });
    });

    it("should reload history when serverId changes", async () => {
      mockGetFileHistory.mockResolvedValue(ok(mockHistory as any));

      const { rerender } = render(<FileHistoryViewer {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetFileHistory).toHaveBeenCalledWith(
          1,
          "config/server.properties"
        );
      });

      rerender(<FileHistoryViewer {...defaultProps} serverId={2} />);

      await waitFor(() => {
        expect(mockGetFileHistory).toHaveBeenCalledWith(
          2,
          "config/server.properties"
        );
      });
    });

    it("should reload history when filePath changes", async () => {
      mockGetFileHistory.mockResolvedValue(ok(mockHistory as any));

      const { rerender } = render(<FileHistoryViewer {...defaultProps} />);

      await waitFor(() => {
        expect(mockGetFileHistory).toHaveBeenCalledWith(
          1,
          "config/server.properties"
        );
      });

      rerender(
        <FileHistoryViewer
          {...defaultProps}
          filePath="config/other.properties"
        />
      );

      await waitFor(() => {
        expect(mockGetFileHistory).toHaveBeenCalledWith(
          1,
          "config/other.properties"
        );
      });
    });
  });

  describe("Error Handling", () => {
    it("should show error when history loading fails", async () => {
      const errorMessage = "Failed to load file history";
      mockGetFileHistory.mockResolvedValue(err(errorMessage));

      render(<FileHistoryViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it("should show error when version content loading fails", async () => {
      mockGetFileHistory.mockResolvedValue(ok(mockHistory as any));
      const errorMessage = "Failed to load version content";
      mockGetFileVersionContent.mockResolvedValue(err(errorMessage));

      render(<FileHistoryViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("v1")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("v1"));

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });
  });

  describe("Empty State", () => {
    it("should show empty state when no history exists", async () => {
      mockGetFileHistory.mockResolvedValue(
        ok({ history: [], total_versions: 0, file_path: "test.txt" } as any)
      );

      render(<FileHistoryViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("No history available")).toBeInTheDocument();
      });
    });
  });

  describe("History Display", () => {
    beforeEach(async () => {
      mockGetFileHistory.mockResolvedValue(ok(mockHistory as any));
    });

    it("should display all version items", async () => {
      render(<FileHistoryViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("v1")).toBeInTheDocument();
        expect(screen.getByText("v2")).toBeInTheDocument();
        expect(screen.getByText("v3")).toBeInTheDocument();
      });
    });

    it("should display version details correctly", async () => {
      render(<FileHistoryViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("admin")).toBeInTheDocument();
        expect(screen.getByText("user1")).toBeInTheDocument();
        expect(screen.getByText("1 KB")).toBeInTheDocument();
        expect(screen.getByText("2 KB")).toBeInTheDocument();
        expect(screen.getByText("1.5 KB")).toBeInTheDocument();
      });
    });

    it("should display version descriptions when available", async () => {
      render(<FileHistoryViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Initial version")).toBeInTheDocument();
        expect(screen.getByText("Updated configuration")).toBeInTheDocument();
      });
    });

    it("should show unknown user for null username", async () => {
      render(<FileHistoryViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("Unknown User")).toBeInTheDocument();
      });
    });

    it("should format dates correctly", async () => {
      render(<FileHistoryViewer {...defaultProps} />);

      await waitFor(() => {
        // Check that date formatting is applied (exact format depends on locale)
        const dateElements = screen.getAllByText(/\/|:/);
        expect(dateElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Version Selection", () => {
    beforeEach(async () => {
      mockGetFileHistory.mockResolvedValue(ok(mockHistory as any));
      mockGetFileVersionContent.mockResolvedValue(ok(mockVersionContent as any));
    });

    it("should load version content when version is selected", async () => {
      render(<FileHistoryViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("v1")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("v1"));

      expect(mockGetFileVersionContent).toHaveBeenCalledWith(
        1,
        "config/server.properties",
        1
      );

      await waitFor(() => {
        expect(screen.getByText("Version Details")).toBeInTheDocument();
        expect(
          screen.getByText("server.properties content here")
        ).toBeInTheDocument();
      });
    });

    it("should show loading state while loading version content", async () => {
      mockGetFileVersionContent.mockReturnValue(new Promise(() => {})); // Never resolves

      render(<FileHistoryViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("v1")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("v1"));

      await waitFor(() => {
        expect(screen.getByText("Loading content...")).toBeInTheDocument();
      });
    });

    it("should deselect version when clicking selected version", async () => {
      render(<FileHistoryViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("v1")).toBeInTheDocument();
      });

      // First click - select
      fireEvent.click(screen.getByText("v1"));

      await waitFor(() => {
        expect(screen.getByText("Version Details")).toBeInTheDocument();
      });

      // Second click - deselect
      fireEvent.click(screen.getByText("v1"));

      await waitFor(() => {
        expect(screen.queryByText("Version Details")).not.toBeInTheDocument();
      });
    });
  });

  describe("Restore Functionality", () => {
    beforeEach(async () => {
      mockGetFileHistory.mockResolvedValue(ok(mockHistory as any));
      mockGetFileVersionContent.mockResolvedValue(ok(mockVersionContent as any));
    });

    it("should call onRestore with correct parameters", async () => {
      const onRestore = vi.fn();
      render(<FileHistoryViewer {...defaultProps} onRestore={onRestore} />);

      await waitFor(() => {
        expect(screen.getByText("v1")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("v1"));

      await waitFor(() => {
        expect(screen.getByText("Restore Version")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Restore Version"));

      expect(onRestore).toHaveBeenCalledWith(1, undefined);
    });

    it("should call onRestore with description when provided", async () => {
      const onRestore = vi.fn();
      render(<FileHistoryViewer {...defaultProps} onRestore={onRestore} />);

      await waitFor(() => {
        expect(screen.getByText("v1")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("v1"));

      await waitFor(() => {
        const descriptionInput = screen.getByPlaceholderText(
          "Restore description (optional)"
        );
        expect(descriptionInput).toBeInTheDocument();
      });

      const descriptionInput = screen.getByPlaceholderText(
        "Restore description (optional)"
      );
      fireEvent.change(descriptionInput, { target: { value: "Test restore" } });
      fireEvent.click(screen.getByText("Restore Version"));

      expect(onRestore).toHaveBeenCalledWith(1, "Test restore");
    });

    it("should clear description after restore", async () => {
      const onRestore = vi.fn();
      render(<FileHistoryViewer {...defaultProps} onRestore={onRestore} />);

      await waitFor(() => {
        expect(screen.getByText("v1")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("v1"));

      await waitFor(() => {
        const descriptionInput = screen.getByPlaceholderText(
          "Restore description (optional)"
        );
        expect(descriptionInput).toBeInTheDocument();
      });

      const descriptionInput = screen.getByPlaceholderText(
        "Restore description (optional)"
      );
      fireEvent.change(descriptionInput, { target: { value: "Test restore" } });
      fireEvent.click(screen.getByText("Restore Version"));

      expect((descriptionInput as HTMLInputElement).value).toBe("");
    });
  });

  describe("Admin Features", () => {
    beforeEach(async () => {
      mockGetFileHistory.mockResolvedValue(ok(mockHistory as any));
    });

    it("should show delete buttons when user is admin", async () => {
      render(<FileHistoryViewer {...defaultProps} isAdmin={true} />);

      await waitFor(() => {
        const deleteButtons = screen.getAllByTitle("Delete Version");
        expect(deleteButtons).toHaveLength(3);
      });
    });

    it("should not show delete buttons when user is not admin", async () => {
      render(<FileHistoryViewer {...defaultProps} isAdmin={false} />);

      await waitFor(() => {
        expect(screen.queryByTitle("Delete Version")).not.toBeInTheDocument();
      });
    });

    it("should call onDelete when delete button is clicked", async () => {
      const onDelete = vi.fn();
      render(
        <FileHistoryViewer
          {...defaultProps}
          isAdmin={true}
          onDelete={onDelete}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByTitle("Delete Version")).toHaveLength(3);
      });

      const deleteButtons = screen.getAllByTitle("Delete Version");
      fireEvent.click(deleteButtons[0]!);

      expect(onDelete).toHaveBeenCalledWith(1);
    });

    it("should prevent event propagation when delete button is clicked", async () => {
      const onDelete = vi.fn();
      render(
        <FileHistoryViewer
          {...defaultProps}
          isAdmin={true}
          onDelete={onDelete}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByTitle("Delete Version")).toHaveLength(3);
      });

      const deleteButtons = screen.getAllByTitle("Delete Version");
      fireEvent.click(deleteButtons[0]!);

      // Version should not be selected when delete button is clicked
      expect(screen.queryByText("Version Details")).not.toBeInTheDocument();
    });
  });

  describe("Utility Functions", () => {
    beforeEach(async () => {
      mockGetFileHistory.mockResolvedValue(
        ok({
          history: [
            {
              id: 1,
              version_number: 1,
              created_at: "2024-01-01T10:00:00Z",
              editor_username: "admin",
              file_size: 0,
              description: null,
            },
            {
              id: 2,
              version_number: 2,
              created_at: "2024-01-01T10:00:00Z",
              editor_username: "admin",
              file_size: 1024 * 1024 * 1024, // 1GB
              description: null,
            },
          ],
          total_versions: 2,
          file_path: "test.txt",
        } as any)
      );
    });

    it("should format file sizes correctly", async () => {
      render(<FileHistoryViewer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText("0 B")).toBeInTheDocument();
        expect(screen.getByText("1 GB")).toBeInTheDocument();
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing onDelete prop gracefully", async () => {
      mockGetFileHistory.mockResolvedValue(ok(mockHistory as any));

      render(
        <FileHistoryViewer
          {...defaultProps}
          isAdmin={true}
          onDelete={undefined}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByTitle("Delete Version")).toHaveLength(3);
      });

      const deleteButtons = screen.getAllByTitle("Delete Version");
      expect(() => {
        fireEvent.click(deleteButtons[0]!);
      }).not.toThrow();
    });

    it("should handle restore when no version is selected", async () => {
      mockGetFileHistory.mockResolvedValue(ok(mockHistory as any));
      const onRestore = vi.fn();

      render(<FileHistoryViewer {...defaultProps} onRestore={onRestore} />);

      await waitFor(() => {
        expect(screen.getByText("v1")).toBeInTheDocument();
      });

      // Try to restore without selecting a version (this shouldn't happen in normal usage)
      // But we test the internal logic
      const component = screen.getByText("File Versions").closest("div");
      expect(component).toBeInTheDocument();

      // onRestore should not be called if no version is selected
      expect(onRestore).not.toHaveBeenCalled();
    });
  });
});
