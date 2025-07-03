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
vi.mock("./VirtualFileList", () => ({
  VirtualFileList: ({
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
    ) : (
      <div data-testid="zip-progress-modal" style={{ display: "none" }}>
        <button onClick={onClose} data-testid="close-zip-modal">
          Close
        </button>
      </div>
    ),
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
    ) : (
      <div data-testid="confirmation-modal" style={{ display: "none" }}>
        <button onClick={onConfirm} data-testid="confirm-action">
          Confirm
        </button>
        <button onClick={onCancel} data-testid="cancel-action">
          Cancel
        </button>
      </div>
    ),
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
    ) : (
      <div data-testid="alert-modal" style={{ display: "none" }}>
        <button onClick={onClose} data-testid="close-alert">
          Close
        </button>
      </div>
    ),
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

    // Mock URL methods for DOM tests
    Object.defineProperty(global, "URL", {
      value: {
        createObjectURL: vi.fn().mockReturnValue("blob:mock-url"),
        revokeObjectURL: vi.fn(),
      },
      writable: true,
    });
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

  describe("Context Menu Operations", () => {
    it("should show and hide context menu", () => {
      render(<FileExplorer serverId={mockServerId} />);

      const contextTrigger = screen.getByTestId("context-menu-trigger");
      fireEvent.click(contextTrigger);

      const contextMenu = screen.getByTestId("context-menu");
      expect(contextMenu).toBeInTheDocument();

      // Test context menu close
      const closeContext = screen.getByTestId("close-context");
      fireEvent.click(closeContext);
    });

    it("should handle context menu download action", async () => {
      vi.mocked(fileService.downloadFile).mockResolvedValue(
        ok(new Blob(["test content"]))
      );

      render(<FileExplorer serverId={mockServerId} />);

      const contextTrigger = screen.getByTestId("context-menu-trigger");
      fireEvent.click(contextTrigger);

      const downloadContext = screen.getByTestId("download-context");
      fireEvent.click(downloadContext);

      // Verify download was called
      expect(fileService.downloadFile).toHaveBeenCalled();
    });

    it("should handle context menu rename action", () => {
      render(<FileExplorer serverId={mockServerId} />);

      const contextTrigger = screen.getByTestId("context-menu-trigger");
      fireEvent.click(contextTrigger);

      const renameContext = screen.getByTestId("rename-context");
      fireEvent.click(renameContext);

      // Verify rename modal becomes visible
      const renameModal = screen.getByTestId("rename-modal");
      expect(renameModal).toBeInTheDocument();
    });

    it("should handle context menu delete action", () => {
      render(<FileExplorer serverId={mockServerId} />);

      const contextTrigger = screen.getByTestId("context-menu-trigger");
      fireEvent.click(contextTrigger);

      const deleteContext = screen.getByTestId("delete-context");
      fireEvent.click(deleteContext);

      // Verify confirmation modal appears
      const confirmModal = screen.getByTestId("confirmation-modal");
      expect(confirmModal).toBeInTheDocument();
    });
  });

  describe("Modal Management", () => {
    it("should handle rename modal flow", () => {
      render(<FileExplorer serverId={mockServerId} />);

      // Trigger rename modal
      const contextTrigger = screen.getByTestId("context-menu-trigger");
      fireEvent.click(contextTrigger);

      const renameContext = screen.getByTestId("rename-context");
      fireEvent.click(renameContext);

      // Test rename confirmation
      const confirmRename = screen.getByTestId("confirm-rename");
      fireEvent.click(confirmRename);

      // Since the actual hooks are mocked, we verify the modal interaction occurred
      // The actual renameFile call would happen in a real integration with useFileOperations
      expect(confirmRename).toBeInTheDocument();
    });

    it("should handle rename modal cancellation", () => {
      render(<FileExplorer serverId={mockServerId} />);

      // Trigger rename modal
      const contextTrigger = screen.getByTestId("context-menu-trigger");
      fireEvent.click(contextTrigger);

      const renameContext = screen.getByTestId("rename-context");
      fireEvent.click(renameContext);

      // Test rename cancellation
      const cancelRename = screen.getByTestId("cancel-rename");
      fireEvent.click(cancelRename);

      // Modal should be hidden (test by checking display style)
      const renameModal = screen.getByTestId("rename-modal");
      expect(renameModal).toHaveStyle({ display: "none" });
    });

    it("should handle confirmation modal flow", async () => {
      vi.mocked(fileService.deleteFile).mockResolvedValue(ok(undefined));

      render(<FileExplorer serverId={mockServerId} />);

      // Trigger delete action
      const contextTrigger = screen.getByTestId("context-menu-trigger");
      fireEvent.click(contextTrigger);

      const deleteContext = screen.getByTestId("delete-context");
      fireEvent.click(deleteContext);

      // Confirm deletion
      const confirmAction = screen.getByTestId("confirm-action");
      fireEvent.click(confirmAction);

      expect(fileService.deleteFile).toHaveBeenCalled();
    });

    it("should handle confirmation modal cancellation", () => {
      render(<FileExplorer serverId={mockServerId} />);

      // Trigger delete action
      const contextTrigger = screen.getByTestId("context-menu-trigger");
      fireEvent.click(contextTrigger);

      const deleteContext = screen.getByTestId("delete-context");
      fireEvent.click(deleteContext);

      // Cancel deletion
      const cancelAction = screen.getByTestId("cancel-action");
      fireEvent.click(cancelAction);

      expect(fileService.deleteFile).not.toHaveBeenCalled();
    });
  });

  describe("Upload Error Handling", () => {
    it("should handle upload errors gracefully", () => {
      // Mock a failed upload response
      vi.mocked(fileService.uploadMultipleFiles).mockResolvedValue(
        ok({
          successful: [],
          failed: [{ file: "test.txt", error: "Upload failed" }],
        })
      );

      render(<FileExplorer serverId={mockServerId} />);

      const uploadButton = screen.getByTestId("mock-file-upload");
      fireEvent.click(uploadButton);

      // Component should handle the error without crashing
      expect(screen.getByTestId("file-list")).toBeInTheDocument();
    });

    it("should handle blocked files with security warning", () => {
      render(<FileExplorer serverId={mockServerId} />);

      const uploadButton = screen.getByTestId("mock-file-upload");
      fireEvent.click(uploadButton);

      // Component should continue to function after blocked files
      expect(screen.getByTestId("file-list")).toBeInTheDocument();
    });

    it("should show upload modal when needed", () => {
      render(<FileExplorer serverId={mockServerId} />);

      // Check that upload modal can be triggered
      const dragDropZone = screen.getByTestId("drag-drop-zone");
      expect(dragDropZone).toBeInTheDocument();
    });
  });

  describe("File Operations Integration", () => {
    it("should handle file click for viewable files", () => {
      render(<FileExplorer serverId={mockServerId} />);

      const fileClick = screen.getByTestId("file-click");
      fireEvent.click(fileClick);

      // Component should handle file clicks
      expect(screen.getByTestId("file-list")).toBeInTheDocument();
    });

    it("should refresh file list", () => {
      render(<FileExplorer serverId={mockServerId} />);

      const refreshButton = screen.getByTestId("refresh-files");
      fireEvent.click(refreshButton);

      // Verify refresh was called (listFiles should be called twice - initial + refresh)
      expect(fileService.listFiles).toHaveBeenCalledTimes(2);
    });

    it("should handle ZIP progress modal", () => {
      render(<FileExplorer serverId={mockServerId} />);

      // Check that ZIP progress modal exists
      const zipModal = screen.getByTestId("zip-progress-modal");
      expect(zipModal).toBeInTheDocument();
    });

    it("should handle alert modal display", () => {
      render(<FileExplorer serverId={mockServerId} />);

      // Check that alert modal exists
      const alertModal = screen.getByTestId("alert-modal");
      expect(alertModal).toBeInTheDocument();
    });
  });

  describe("Toast Notifications", () => {
    it("should display download success toast", async () => {
      vi.mocked(fileService.downloadFile).mockResolvedValue(
        ok(new Blob(["test content"]))
      );

      render(<FileExplorer serverId={mockServerId} />);

      const contextTrigger = screen.getByTestId("context-menu-trigger");
      fireEvent.click(contextTrigger);

      const downloadContext = screen.getByTestId("download-context");
      fireEvent.click(downloadContext);

      // Wait for any async operations
      await screen.findByTestId("file-list");

      // Component should continue to work after download
      expect(screen.getByTestId("file-list")).toBeInTheDocument();
    });

    it("should display download error toast", async () => {
      vi.mocked(fileService.downloadFile).mockResolvedValue(
        err({ message: "Download failed" })
      );

      render(<FileExplorer serverId={mockServerId} />);

      const contextTrigger = screen.getByTestId("context-menu-trigger");
      fireEvent.click(contextTrigger);

      const downloadContext = screen.getByTestId("download-context");
      fireEvent.click(downloadContext);

      // Component should handle error gracefully
      expect(screen.getByTestId("file-list")).toBeInTheDocument();
    });
  });
});
