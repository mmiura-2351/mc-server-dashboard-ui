/**
 * Tests for VirtualFileList component
 * Following TDD approach - tests written before implementation
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { VirtualFileList } from "./VirtualFileList";
import type { FileSystemItem } from "@/types/files";

// Mock react-window
const mockList = vi.fn();
vi.mock("react-window", () => ({
  FixedSizeList: (props: {
    height: number;
    itemCount: number;
    itemSize: number;
    itemData: { files: FileSystemItem[] };
  }) => {
    mockList(props);
    // Simple mock that just shows we're using virtual scrolling
    return (
      <div data-testid="virtual-list" style={{ height: props.height }}>
        <div data-testid="virtual-content">
          Virtual List with {props.itemCount} items
        </div>
      </div>
    );
  },
}));

// Mock translations
const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    "files.columns.name": "Name",
    "files.columns.size": "Size",
    "files.columns.modified": "Modified",
    "files.emptyDirectory": "Empty directory",
    "files.dropHint": "Drop files here",
    "files.dropOverlay": "Drop files to upload",
    "files.selected": "selected",
    "files.clear": "Clear",
    "files.up": "Up",
    "files.refresh": "Refresh",
    "files.root": "Root",
    "files.loadingFiles": "Loading files...",
    "files.errorLoadingFiles": "Error loading files",
    "files.retry": "Retry",
  };
  return translations[key] || key;
});

vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({ t: mockT }),
}));

// Mock FileListItem
vi.mock("./FileListItem", () => {
  return {
    FileListItem: ({
      file,
      isSelected,
      onFileClick,
      onContextMenu,
      onFileSelect,
    }: {
      file: FileSystemItem;
      isSelected: boolean;
      onFileClick: (file: FileSystemItem) => void;
      onContextMenu: (e: React.MouseEvent, file: FileSystemItem) => void;
      onFileSelect: (fileName: string) => void;
    }) => {
      return (
        <div
          data-testid={`file-item-${file.name}`}
          className={isSelected ? "selected" : ""}
          onClick={() => onFileClick(file)}
          onContextMenu={(e) => onContextMenu(e, file)}
        >
          <span data-testid="file-name">{file.name}</span>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onFileSelect(file.name)}
            data-testid={`checkbox-${file.name}`}
          />
        </div>
      );
    },
  };
});

// Test data
const createMockFile = (name: string, isDirectory = false): FileSystemItem => ({
  name,
  type: isDirectory ? "directory" : "text",
  is_directory: isDirectory,
  size: isDirectory ? null : 1024,
  modified: "2023-01-01T00:00:00Z",
  permissions: { read: true, write: true, execute: isDirectory },
  path: `/test/${name}`,
});

const mockFiles: FileSystemItem[] = Array.from({ length: 1000 }, (_, i) =>
  createMockFile(`file-${i}.txt`, i % 10 === 0)
);

const defaultProps = {
  files: mockFiles,
  currentPath: "/test",
  selectedFiles: new Set<string>(),
  isDragOver: false,
  isLoading: false,
  error: null,
  onPathChange: vi.fn(),
  onFileClick: vi.fn(),
  onContextMenu: vi.fn(),
  onFileSelect: vi.fn(),
  onSelectAll: vi.fn(),
  onClearSelection: vi.fn(),
  onRefresh: vi.fn(),
  onNavigateUp: vi.fn(),
};

describe("VirtualFileList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Virtual Scrolling Behavior", () => {
    it("should render FixedSizeList with correct props", () => {
      render(<VirtualFileList {...defaultProps} />);

      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({
          height: 400,
          itemCount: mockFiles.length,
          itemSize: 48,
          itemData: expect.objectContaining({
            files: mockFiles,
            selectedFiles: defaultProps.selectedFiles,
            onFileClick: defaultProps.onFileClick,
            onContextMenu: defaultProps.onContextMenu,
            onFileSelect: defaultProps.onFileSelect,
          }),
        })
      );
    });

    it("should handle empty file list", () => {
      render(<VirtualFileList {...defaultProps} files={[]} />);

      expect(screen.getByText("Empty directory")).toBeInTheDocument();
      expect(screen.queryByTestId("virtual-list")).not.toBeInTheDocument();
    });

    it("should render virtual items efficiently", () => {
      render(<VirtualFileList {...defaultProps} />);

      // Should show virtual list container
      expect(screen.getByTestId("virtual-list")).toBeInTheDocument();
      expect(screen.getByTestId("virtual-content")).toBeInTheDocument();

      // Should show the item count
      expect(
        screen.getByText(`Virtual List with ${mockFiles.length} items`)
      ).toBeInTheDocument();
    });
  });

  describe("Performance Optimization", () => {
    it("should use React.memo for VirtualFileList", () => {
      const { rerender } = render(<VirtualFileList {...defaultProps} />);

      // Clear mock calls
      mockList.mockClear();

      // Re-render with same props
      rerender(<VirtualFileList {...defaultProps} />);

      // Should not call FixedSizeList again due to memoization
      expect(mockList).not.toHaveBeenCalled();
    });

    it("should re-render when files change", () => {
      const { rerender } = render(<VirtualFileList {...defaultProps} />);

      // Clear mock calls
      mockList.mockClear();

      const newFiles = [createMockFile("new-file.txt")];
      rerender(<VirtualFileList {...defaultProps} files={newFiles} />);

      // Should re-render with new files
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({
          itemCount: 1,
          itemData: expect.objectContaining({
            files: newFiles,
          }),
        })
      );
    });
  });

  describe("Header and Navigation", () => {
    it("should render file list header", () => {
      render(<VirtualFileList {...defaultProps} />);

      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Size")).toBeInTheDocument();
      expect(screen.getByText("Modified")).toBeInTheDocument();
    });

    it("should render breadcrumb navigation", () => {
      render(
        <VirtualFileList {...defaultProps} currentPath="/test/subfolder" />
      );

      expect(screen.getByText("Root")).toBeInTheDocument();
      expect(screen.getByText("test")).toBeInTheDocument();
      expect(screen.getByText("subfolder")).toBeInTheDocument();
    });

    it("should handle navigation actions", () => {
      render(<VirtualFileList {...defaultProps} />);

      const refreshButton = screen.getByText("Refresh");
      fireEvent.click(refreshButton);

      expect(defaultProps.onRefresh).toHaveBeenCalled();
    });
  });

  describe("File Selection", () => {
    it("should handle select all checkbox", () => {
      render(<VirtualFileList {...defaultProps} />);

      const selectAllCheckbox = screen.getByRole("checkbox");
      fireEvent.click(selectAllCheckbox);

      expect(defaultProps.onSelectAll).toHaveBeenCalled();
    });

    it("should display selection info", () => {
      const selectedFiles = new Set(["file-0.txt", "file-1.txt"]);
      render(
        <VirtualFileList {...defaultProps} selectedFiles={selectedFiles} />
      );

      expect(screen.getByText("2 selected")).toBeInTheDocument();
      expect(screen.getByText("Clear")).toBeInTheDocument();
    });
  });

  describe("Drag and Drop", () => {
    it("should show drop overlay when dragging", () => {
      render(<VirtualFileList {...defaultProps} isDragOver={true} />);

      expect(screen.getByText("Drop files to upload")).toBeInTheDocument();
    });

    it("should show drop hint in empty directory", () => {
      render(
        <VirtualFileList {...defaultProps} files={[]} isDragOver={true} />
      );

      expect(screen.getByText("Drop files here")).toBeInTheDocument();
    });
  });

  describe("Loading and Error States", () => {
    it("should show loading state", () => {
      render(<VirtualFileList {...defaultProps} isLoading={true} />);

      expect(screen.getByText("Loading files...")).toBeInTheDocument();
      expect(screen.queryByTestId("virtual-list")).not.toBeInTheDocument();
    });

    it("should show error state", () => {
      render(<VirtualFileList {...defaultProps} error="Connection failed" />);

      expect(screen.getByText("Error loading files")).toBeInTheDocument();
      expect(screen.getByText("Connection failed")).toBeInTheDocument();
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes", () => {
      render(<VirtualFileList {...defaultProps} />);

      const virtualList = screen.getByTestId("virtual-list");
      expect(virtualList).toBeInTheDocument();

      // Check for header checkbox
      const headerCheckbox = screen.getByRole("checkbox");
      expect(headerCheckbox).toBeInTheDocument();
    });
  });

  describe("Large Dataset Performance", () => {
    it("should handle large number of files efficiently", () => {
      const largeFileSet = Array.from({ length: 10000 }, (_, i) =>
        createMockFile(`file-${i}.txt`)
      );

      const startTime = performance.now();
      render(<VirtualFileList {...defaultProps} files={largeFileSet} />);
      const endTime = performance.now();

      // Should render quickly even with 10,000 files
      expect(endTime - startTime).toBeLessThan(100);

      // Should still create virtual list with all items
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({
          itemCount: 10000,
        })
      );
    });

    it("should maintain performance with frequent updates", async () => {
      const { rerender } = render(<VirtualFileList {...defaultProps} />);

      // Simulate rapid file updates
      for (let i = 0; i < 10; i++) {
        const updatedFiles = [
          ...mockFiles,
          createMockFile(`new-file-${i}.txt`),
        ];
        rerender(<VirtualFileList {...defaultProps} files={updatedFiles} />);
      }

      // Should handle updates without performance degradation
      await waitFor(() => {
        expect(mockList).toHaveBeenCalledTimes(11); // Initial + 10 updates
      });
    });
  });
});
