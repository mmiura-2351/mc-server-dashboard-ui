import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { FileViewer } from "./FileViewer";
import type { FileSystemItem } from "@/types/files";

// Mock translation hook
const translations: Record<string, string> = {
  "files.loadingFileContent": "Loading file content...",
  "files.saving": "Saving...",
  "files.save": "Save",
  "files.cancel": "Cancel",
  "files.edit": "Edit",
  "files.download": "Download",
  "files.close": "Close",
};

const mockT = vi.fn((key: string) => translations[key] || key);

vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({ t: mockT, locale: "en" }),
}));

const mockFile: FileSystemItem = {
  name: "test-file.txt",
  type: "text",
  is_directory: false,
  size: 1024,
  modified: "2023-01-01T00:00:00Z",
  permissions: { read: true, write: true, execute: false },
  path: "/test-file.txt",
};

const defaultProps = {
  file: mockFile,
  fileContent: "Test file content",
  imageUrl: "",
  isLoading: false,
  isEditing: false,
  isSaving: false,
  editedContent: "",
  serverId: 1,
  currentPath: "/",
  onClose: vi.fn(),
  onEdit: vi.fn(),
  onSave: vi.fn(),
  onCancelEdit: vi.fn(),
  onDownload: vi.fn(),
  onContentChange: vi.fn(),
  onReloadFile: vi.fn(),
  isAdmin: false,
};

describe("FileViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders file viewer correctly", () => {
    render(<FileViewer {...defaultProps} />);

    expect(screen.getByText("📄 test-file.txt")).toBeInTheDocument();
    expect(screen.getByText("Test file content")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(<FileViewer {...defaultProps} isLoading={true} />);

    expect(screen.getByText("Loading file content...")).toBeInTheDocument();
  });

  it("handles close button click", () => {
    render(<FileViewer {...defaultProps} />);

    fireEvent.click(screen.getByText("×"));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("shows edit button for text files", () => {
    render(<FileViewer {...defaultProps} />);

    expect(screen.getByText("Edit")).toBeInTheDocument();
  });

  it("shows save and cancel buttons when editing", () => {
    render(
      <FileViewer
        {...defaultProps}
        isEditing={true}
        editedContent="Edited content"
      />
    );

    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("handles edit button click", () => {
    render(<FileViewer {...defaultProps} />);

    fireEvent.click(screen.getByText("Edit"));
    expect(defaultProps.onEdit).toHaveBeenCalled();
  });

  it("handles download button click", () => {
    render(<FileViewer {...defaultProps} />);

    fireEvent.click(screen.getByText("Download"));
    expect(defaultProps.onDownload).toHaveBeenCalled();
  });

  it("renders null when no file is provided", () => {
    const { container } = render(<FileViewer {...defaultProps} file={null} />);

    expect(container.firstChild).toBeNull();
  });
});
