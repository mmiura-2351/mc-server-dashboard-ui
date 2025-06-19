import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { FileList } from "./FileList";
import type { FileSystemItem } from "@/types/files";

// Mock translation hook
const translations: Record<string, string> = {
  "files.root": "Root",
  "files.loadingFiles": "Loading files...",
  "files.errorLoadingFiles": "Error loading files",
  "files.retry": "Retry",
  "files.selected": "selected",
  "files.clear": "Clear",
  "files.up": "Up",
  "files.refresh": "Refresh",
  "files.columns.name": "Name",
  "files.columns.size": "Size",
  "files.columns.modified": "Modified",
  "files.emptyDirectory": "This directory is empty",
  "files.dropHint": "Drop files here",
};

const mockT = vi.fn((key: string) => translations[key] || key);

vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({ t: mockT, locale: "en" }),
}));

const mockFiles: FileSystemItem[] = [
  {
    name: "test-folder",
    type: "directory",
    is_directory: true,
    size: null,
    modified: "2023-01-01T00:00:00Z",
    permissions: { read: true, write: true, execute: true },
    path: "/test-folder",
  },
  {
    name: "test-file.txt",
    type: "text",
    is_directory: false,
    size: 1024,
    modified: "2023-01-01T00:00:00Z",
    permissions: { read: true, write: true, execute: false },
    path: "/test-file.txt",
  },
];

const defaultProps = {
  files: mockFiles,
  currentPath: "/",
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

describe("FileList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders file list correctly", () => {
    render(<FileList {...defaultProps} />);

    expect(screen.getByText("test-folder")).toBeInTheDocument();
    expect(screen.getByText("test-file.txt")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(<FileList {...defaultProps} isLoading={true} />);

    expect(screen.getByText("Loading files...")).toBeInTheDocument();
  });

  it("shows error state", () => {
    render(<FileList {...defaultProps} error="Test error" />);

    expect(screen.getByText("Error loading files")).toBeInTheDocument();
    expect(screen.getByText("Test error")).toBeInTheDocument();
  });

  it("handles file click", () => {
    render(<FileList {...defaultProps} />);

    fireEvent.click(screen.getByText("test-folder"));
    expect(defaultProps.onFileClick).toHaveBeenCalledWith(mockFiles[0]);
  });

  it("handles context menu", () => {
    render(<FileList {...defaultProps} />);

    fireEvent.contextMenu(screen.getByText("test-folder"));
    expect(defaultProps.onContextMenu).toHaveBeenCalled();
  });

  it("renders breadcrumb navigation", () => {
    render(<FileList {...defaultProps} />);

    expect(screen.getByText("Root")).toBeInTheDocument();
  });

  it("shows selection info when files are selected", () => {
    const selectedFiles = new Set(["test-file.txt"]);
    render(<FileList {...defaultProps} selectedFiles={selectedFiles} />);

    expect(screen.getByText("1 selected")).toBeInTheDocument();
    expect(screen.getByText("Clear")).toBeInTheDocument();
  });
});
