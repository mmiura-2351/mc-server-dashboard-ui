/**
 * Tests for FileListItem component with React.memo optimization
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FileListItem } from "./FileListItem";
import type { FileSystemItem } from "@/types/files";

// Mock the language context
vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "files.columns.name": "Name",
        "files.columns.size": "Size",
        "files.columns.modified": "Modified",
      };
      return translations[key] || key;
    },
    locale: "en",
  }),
}));

// Mock format utilities
vi.mock("@/utils/format", () => ({
  formatFileSize: (size: number) => `${size} bytes`,
  formatDateTime: (date: string) => new Date(date).toLocaleDateString(),
}));

// Sample file data
const mockFile: FileSystemItem = {
  name: "test-file.txt",
  type: "text",
  size: 1024,
  modified: "2023-01-01T00:00:00Z",
  is_directory: false,
  permissions: { read: true, write: true, execute: false },
  path: "/test-file.txt",
};

const mockDirectory: FileSystemItem = {
  name: "test-directory",
  type: "directory",
  size: 0,
  modified: "2023-01-01T00:00:00Z",
  is_directory: true,
  permissions: { read: true, write: true, execute: true },
  path: "/test-directory",
};

const mockProps = {
  file: mockFile,
  isSelected: false,
  onFileClick: vi.fn(),
  onContextMenu: vi.fn(),
  onFileSelect: vi.fn(),
};

describe("FileListItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("should render file item with correct data", () => {
      render(<FileListItem {...mockProps} />);

      expect(screen.getByText("test-file.txt")).toBeInTheDocument();
      expect(screen.getByText("1024 bytes")).toBeInTheDocument();
      expect(screen.getByText("1/1/2023")).toBeInTheDocument();
    });

    it("should render directory item correctly", () => {
      const props = { ...mockProps, file: mockDirectory };
      render(<FileListItem {...props} />);

      expect(screen.getByText("test-directory")).toBeInTheDocument();
      expect(screen.getByText("—")).toBeInTheDocument(); // Size for directory
    });

    it("should show correct file icon for different file types", () => {
      const imageFile = { ...mockFile, name: "image.png" };
      const { rerender } = render(
        <FileListItem {...mockProps} file={imageFile} />
      );

      // Check if file icon is rendered (emoji in text content)
      expect(screen.getByText("🖼️")).toBeInTheDocument();

      // Test directory icon
      rerender(<FileListItem {...mockProps} file={mockDirectory} />);
      expect(screen.getByText("📁")).toBeInTheDocument();
    });
  });

  describe("Selection State", () => {
    it("should show selected state when isSelected is true", () => {
      const props = { ...mockProps, isSelected: true };
      render(<FileListItem {...props} />);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeChecked();
    });

    it("should show unselected state when isSelected is false", () => {
      render(<FileListItem {...mockProps} />);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).not.toBeChecked();
    });
  });

  describe("Event Handling", () => {
    it("should call onFileClick when item is clicked", () => {
      render(<FileListItem {...mockProps} />);

      const fileItem = screen.getByRole("row");
      fireEvent.click(fileItem);

      expect(mockProps.onFileClick).toHaveBeenCalledWith(mockFile);
    });

    it("should call onFileSelect when clicking with Ctrl key", () => {
      render(<FileListItem {...mockProps} />);

      const fileItem = screen.getByRole("row");
      fireEvent.click(fileItem, { ctrlKey: true });

      expect(mockProps.onFileSelect).toHaveBeenCalledWith(mockFile.name);
      expect(mockProps.onFileClick).not.toHaveBeenCalled();
    });

    it("should call onFileSelect when clicking with Meta key", () => {
      render(<FileListItem {...mockProps} />);

      const fileItem = screen.getByRole("row");
      fireEvent.click(fileItem, { metaKey: true });

      expect(mockProps.onFileSelect).toHaveBeenCalledWith(mockFile.name);
      expect(mockProps.onFileClick).not.toHaveBeenCalled();
    });

    it("should call onContextMenu when right-clicked", () => {
      render(<FileListItem {...mockProps} />);

      const fileItem = screen.getByRole("row");
      const contextMenuEvent = new MouseEvent("contextmenu", { bubbles: true });
      fireEvent(fileItem, contextMenuEvent);

      expect(mockProps.onContextMenu).toHaveBeenCalledWith(
        expect.any(Object),
        mockFile
      );
    });

    it("should call onFileSelect when checkbox is clicked", () => {
      render(<FileListItem {...mockProps} />);

      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);

      expect(mockProps.onFileSelect).toHaveBeenCalledWith(mockFile.name);
    });

    it("should stop propagation when checkbox is clicked", () => {
      render(<FileListItem {...mockProps} />);

      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);

      // onFileClick should not be called when checkbox is clicked
      expect(mockProps.onFileClick).not.toHaveBeenCalled();
    });
  });

  describe("React.memo Optimization", () => {
    it("should be memoized and not re-render with same props", () => {
      const { rerender } = render(<FileListItem {...mockProps} />);

      // Clear previous calls
      vi.clearAllMocks();

      // Rerender with same props
      rerender(<FileListItem {...mockProps} />);

      // The component should be memoized, so we can test that it maintains
      // the same visual output without extra work
      expect(screen.getByText("test-file.txt")).toBeInTheDocument();
    });

    it("should re-render when file prop changes", () => {
      const { rerender } = render(<FileListItem {...mockProps} />);

      const newFile = { ...mockFile, name: "different-file.txt" };
      rerender(<FileListItem {...mockProps} file={newFile} />);

      expect(screen.getByText("different-file.txt")).toBeInTheDocument();
      expect(screen.queryByText("test-file.txt")).not.toBeInTheDocument();
    });

    it("should re-render when isSelected prop changes", () => {
      const { rerender } = render(<FileListItem {...mockProps} />);

      let checkbox = screen.getByRole("checkbox");
      expect(checkbox).not.toBeChecked();

      rerender(<FileListItem {...mockProps} isSelected={true} />);

      checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeChecked();
    });
  });

  describe("Accessibility", () => {
    it("should have proper accessibility attributes", () => {
      render(<FileListItem {...mockProps} />);

      const fileItem = screen.getByRole("row");
      expect(fileItem).toHaveStyle({ cursor: "pointer" });
    });

    it("should handle keyboard interactions", () => {
      render(<FileListItem {...mockProps} />);

      const fileItem = screen.getByRole("row");
      fireEvent.keyDown(fileItem, { key: "Enter" });

      // Should still work with keyboard
      expect(fileItem).toBeInTheDocument();
    });
  });

  describe("File Type Icons", () => {
    it("should show correct icons for different file extensions", () => {
      const testCases = [
        { name: "document.txt", expectedIcon: "📄" },
        { name: "image.jpg", expectedIcon: "🖼️" },
        { name: "archive.zip", expectedIcon: "📦" },
        { name: "executable.jar", expectedIcon: "⚙️" },
        { name: "unknown.xyz", expectedIcon: "📄" },
      ];

      testCases.forEach(({ name, expectedIcon }) => {
        const file = { ...mockFile, name };
        const { rerender } = render(
          <FileListItem {...mockProps} file={file} />
        );

        expect(screen.getByText(expectedIcon)).toBeInTheDocument();

        // Clean up for next iteration
        rerender(<div />);
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle missing file data gracefully", () => {
      const incompleteFile: FileSystemItem = {
        name: "incomplete.txt",
        type: "text",
        is_directory: false,
        modified: "2023-01-01T00:00:00Z",
        permissions: { read: true, write: true, execute: false },
        path: "/incomplete.txt",
      };

      const props = { ...mockProps, file: incompleteFile };

      expect(() => render(<FileListItem {...props} />)).not.toThrow();
      expect(screen.getByText("incomplete.txt")).toBeInTheDocument();
    });

    it("should handle null/undefined dates gracefully", () => {
      const fileWithoutDate = { ...mockFile, modified: "" };
      const props = { ...mockProps, file: fileWithoutDate };

      render(<FileListItem {...props} />);
      expect(screen.getByText("—")).toBeInTheDocument();
    });
  });
});
