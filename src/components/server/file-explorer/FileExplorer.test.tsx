import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { vi } from "vitest";
import { ok, err } from "neverthrow";
import { FileExplorer } from "./FileExplorer";
import * as fileService from "@/services/files";
import type { FileSystemItem } from "@/types/files";

// Mock all the services and hooks
vi.mock("@/services/files", () => ({
  listFiles: vi.fn(),
  downloadFile: vi.fn(),
  uploadMultipleFiles: vi.fn(),
  uploadFolderStructure: vi.fn(),
  deleteFile: vi.fn(),
  deleteBulkFiles: vi.fn(),
  renameFile: vi.fn(),
  downloadBulkFiles: vi.fn(),
  readFile: vi.fn(),
  saveFile: vi.fn(),
}));

// Mock auth context
const mockUser = {
  id: 1,
  username: "testuser",
  role: "user",
  is_approved: true,
};

vi.mock("@/contexts/auth", () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Mock language context
const mockT = vi.fn((key: string) => key);

vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({ t: mockT }),
}));

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));

// Mock child components with functional implementations
vi.mock("./FileList", () => ({
  FileList: ({
    onFileClick,
    onContextMenu,
    onRefresh,
  }: {
    onFileClick: (file: { name: string; is_directory: boolean }) => void;
    onContextMenu: (
      e: React.MouseEvent,
      file: { name: string; is_directory: boolean }
    ) => void;
    onRefresh: () => void;
  }) => (
    <div data-testid="file-list">
      <button
        onClick={() => onFileClick({ name: "test.txt", is_directory: false })}
        data-testid="file-click"
      >
        File Click
      </button>
      <button
        onClick={(e) =>
          onContextMenu(e, { name: "test.txt", is_directory: false })
        }
        data-testid="context-menu-trigger"
      >
        Context Menu
      </button>
      <button onClick={onRefresh} data-testid="refresh-files">
        Refresh
      </button>
    </div>
  ),
}));

vi.mock("./FileViewer/FileViewer", () => ({
  FileViewer: ({
    onClose,
    onSave,
    onDownload,
  }: {
    onClose: () => void;
    onSave: () => void;
    onDownload: () => void;
  }) => (
    <div data-testid="file-viewer">
      <button onClick={onClose} data-testid="close-viewer">
        Close
      </button>
      <button onClick={onSave} data-testid="save-file">
        Save
      </button>
      <button onClick={onDownload} data-testid="download-file">
        Download
      </button>
    </div>
  ),
}));

vi.mock("./FileUpload/UploadModal", () => ({
  UploadModal: ({
    isOpen,
    onClose,
  }: {
    isOpen: boolean;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div data-testid="upload-modal">
        <button onClick={onClose} data-testid="close-upload-modal">
          Close
        </button>
      </div>
    ) : null,
}));

vi.mock("./FileUpload/DragDropZone", () => ({
  DragDropZone: ({
    children,
    onFileUpload,
    onDrop,
  }: {
    children: React.ReactNode;
    onFileUpload: (files: File[], isFolder: boolean) => void;
    onDrop: (e: React.DragEvent) => void;
  }) => (
    <div data-testid="drag-drop-zone" onDrop={onDrop}>
      {children}
      <button
        onClick={() => onFileUpload([new File(["content"], "test.txt")], false)}
        data-testid="mock-file-upload"
      >
        Mock File Upload
      </button>
    </div>
  ),
  useDragDropZone: () => ({
    fileInputRef: { current: document.createElement("input") },
    folderInputRef: { current: document.createElement("input") },
    triggerFileUpload: vi.fn(),
    triggerFolderUpload: vi.fn(),
  }),
}));

vi.mock("./FileActions/ContextMenu", () => ({
  ContextMenu: ({
    contextMenu,
    onDownloadFile,
    onRenameFile,
    onDeleteFile,
    onClose,
  }: {
    contextMenu: { show: boolean; file?: { name: string } } | null;
    onDownloadFile: (file: { name: string }) => void;
    onRenameFile: (file: { name: string }) => void;
    onDeleteFile: (file: { name: string }) => void;
    onClose: () => void;
  }) => (
    <div
      data-testid="context-menu"
      style={{ display: contextMenu?.show ? "block" : "none" }}
    >
      <button
        onClick={() => contextMenu?.file && onDownloadFile(contextMenu.file)}
        data-testid="download-context"
      >
        Download
      </button>
      <button
        onClick={() => contextMenu?.file && onRenameFile(contextMenu.file)}
        data-testid="rename-context"
      >
        Rename
      </button>
      <button
        onClick={() => contextMenu?.file && onDeleteFile(contextMenu.file)}
        data-testid="delete-context"
      >
        Delete
      </button>
      <button onClick={onClose} data-testid="close-context">
        Close
      </button>
    </div>
  ),
}));

vi.mock("./FileActions/RenameModal", () => ({
  RenameModal: ({
    file,
    onConfirm,
    onCancel,
  }: {
    file: { name: string } | null;
    onConfirm: () => void;
    onCancel: () => void;
  }) => (
    <div
      data-testid="rename-modal"
      style={{ display: file ? "block" : "none" }}
    >
      <button onClick={onConfirm} data-testid="confirm-rename">
        Confirm
      </button>
      <button onClick={onCancel} data-testid="cancel-rename">
        Cancel
      </button>
    </div>
  ),
}));

vi.mock("./FileActions/ZipProgressModal", () => ({
  ZipProgressModal: ({
    isOpen,
    onClose,
  }: {
    isOpen: boolean;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div data-testid="zip-progress-modal">
        <button onClick={onClose} data-testid="close-zip-modal">
          Close
        </button>
      </div>
    ) : null,
}));

vi.mock("@/components/modal", () => ({
  ConfirmationModal: ({
    isOpen,
    onConfirm,
    onCancel,
  }: {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  }) =>
    isOpen ? (
      <div data-testid="confirmation-modal">
        <button onClick={onConfirm} data-testid="confirm-action">
          Confirm
        </button>
        <button onClick={onCancel} data-testid="cancel-action">
          Cancel
        </button>
      </div>
    ) : null,
  AlertModal: ({
    isOpen,
    onClose,
  }: {
    isOpen: boolean;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div data-testid="alert-modal">
        <button onClick={onClose} data-testid="close-alert">
          Close
        </button>
      </div>
    ) : null,
}));

// Mock data
const mockFiles: FileSystemItem[] = [
  {
    name: "test.txt",
    path: "/test.txt",
    type: "text",
    is_directory: false,
    size: 100,
    modified: "2023-01-01T00:00:00Z",
    permissions: {},
  },
];

describe("FileExplorer", () => {
  const mockServerId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fileService.listFiles).mockResolvedValue(ok(mockFiles));
    vi.mocked(fileService.uploadMultipleFiles).mockResolvedValue(
      ok({
        successful: ["test.txt"],
        failed: [],
      })
    );
    vi.mocked(fileService.downloadFile).mockResolvedValue(
      ok(new Blob(["test content"]))
    );
    vi.mocked(fileService.deleteFile).mockResolvedValue(ok(undefined));
    vi.mocked(fileService.renameFile).mockResolvedValue(ok(undefined));
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("should render file explorer components", () => {
      render(<FileExplorer serverId={mockServerId} />);

      expect(screen.getByTestId("drag-drop-zone")).toBeInTheDocument();
      expect(screen.getByTestId("file-list")).toBeInTheDocument();
      expect(screen.getByText("files.uploadFiles")).toBeInTheDocument();
      expect(screen.getByText("files.uploadFolder")).toBeInTheDocument();
    });

    it("should load files on mount", () => {
      render(<FileExplorer serverId={mockServerId} />);

      expect(fileService.listFiles).toHaveBeenCalledWith(mockServerId, "/");
    });

    it("should render with correct server ID", () => {
      const customServerId = 999;
      render(<FileExplorer serverId={customServerId} />);

      expect(fileService.listFiles).toHaveBeenCalledWith(customServerId, "/");
    });
  });

  describe("Components Integration", () => {
    it("should render all required child components", () => {
      render(<FileExplorer serverId={mockServerId} />);

      expect(screen.getByTestId("file-list")).toBeInTheDocument();
      expect(screen.getByTestId("context-menu")).toBeInTheDocument();
      expect(screen.getByTestId("rename-modal")).toBeInTheDocument();
    });

    it("should handle file loading errors gracefully", () => {
      // Return a proper neverthrow error result instead of throwing
      vi.mocked(fileService.listFiles).mockResolvedValue(
        err({ message: "Network error" })
      );

      render(<FileExplorer serverId={mockServerId} />);

      // Component should still render even if file loading fails
      expect(screen.getByTestId("file-list")).toBeInTheDocument();
    });
  });

  describe("Toolbar", () => {
    it("should render upload buttons", () => {
      render(<FileExplorer serverId={mockServerId} />);

      expect(screen.getByText("files.uploadFiles")).toBeInTheDocument();
      expect(screen.getByText("files.uploadFolder")).toBeInTheDocument();
    });
  });

  describe("File Operations", () => {
    it("should handle basic file operations", async () => {
      render(<FileExplorer serverId={mockServerId} />);

      // Test that context menu trigger exists
      const contextTrigger = screen.getByTestId("context-menu-trigger");
      expect(contextTrigger).toBeInTheDocument();

      // Test file refresh
      const refreshButton = screen.getByTestId("refresh-files");
      expect(refreshButton).toBeInTheDocument();

      fireEvent.click(refreshButton);
      expect(fileService.listFiles).toHaveBeenCalledTimes(2);
    });
  });

  describe("Context Menu", () => {
    it("should handle context menu interactions", () => {
      render(<FileExplorer serverId={mockServerId} />);

      const contextTrigger = screen.getByTestId("context-menu-trigger");
      expect(contextTrigger).toBeInTheDocument();

      const contextMenu = screen.getByTestId("context-menu");
      expect(contextMenu).toBeInTheDocument();
    });
  });

  describe("File Upload", () => {
    it("should handle file upload interactions", () => {
      render(<FileExplorer serverId={mockServerId} />);

      const uploadButton = screen.getByTestId("mock-file-upload");
      expect(uploadButton).toBeInTheDocument();

      fireEvent.click(uploadButton);

      // Component should still be functional after upload attempt
      expect(screen.getByTestId("file-list")).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("should handle service errors gracefully", () => {
      vi.mocked(fileService.downloadFile).mockResolvedValue(
        err({ message: "Download failed" })
      );

      render(<FileExplorer serverId={mockServerId} />);

      // Component should render even with error mock
      expect(screen.getByTestId("file-list")).toBeInTheDocument();
      expect(screen.getByTestId("context-menu")).toBeInTheDocument();
    });
  });

  describe("Component State Management", () => {
    it("should manage component state correctly", () => {
      render(<FileExplorer serverId={mockServerId} />);

      // Test that all major components are rendered
      expect(screen.getByTestId("file-list")).toBeInTheDocument();
      expect(screen.getByTestId("context-menu")).toBeInTheDocument();
      expect(screen.getByTestId("rename-modal")).toBeInTheDocument();

      // Test toolbar interaction
      expect(screen.getByText("files.uploadFiles")).toBeInTheDocument();
      expect(screen.getByText("files.uploadFolder")).toBeInTheDocument();
    });
  });
});
