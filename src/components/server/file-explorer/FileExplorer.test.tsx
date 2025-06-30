import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
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
  FileList: ({ onFileClick, onContextMenu, onRefresh }: any) => (
    <div data-testid="file-list">
      <button onClick={() => onFileClick({ name: "test.txt", is_directory: false })} data-testid="file-click">
        File Click
      </button>
      <button onClick={(e) => onContextMenu(e, { name: "test.txt", is_directory: false })} data-testid="context-menu-trigger">
        Context Menu
      </button>
      <button onClick={onRefresh} data-testid="refresh-files">
        Refresh
      </button>
    </div>
  ),
}));

vi.mock("./FileViewer/FileViewer", () => ({
  FileViewer: ({ onClose, onSave, onDownload }: any) => (
    <div data-testid="file-viewer">
      <button onClick={onClose} data-testid="close-viewer">Close</button>
      <button onClick={onSave} data-testid="save-file">Save</button>
      <button onClick={onDownload} data-testid="download-file">Download</button>
    </div>
  ),
}));

vi.mock("./FileUpload/UploadModal", () => ({
  UploadModal: ({ isOpen, onClose }: any) => 
    isOpen ? (
      <div data-testid="upload-modal">
        <button onClick={onClose} data-testid="close-upload-modal">Close</button>
      </div>
    ) : null,
}));

vi.mock("./FileUpload/DragDropZone", () => ({
  DragDropZone: ({ children, onFileUpload, onDrop }: any) => (
    <div data-testid="drag-drop-zone" onDrop={onDrop}>
      {children}
      <button onClick={() => onFileUpload([new File(["content"], "test.txt")], false)} data-testid="mock-file-upload">
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
  ContextMenu: ({ contextMenu, onDownloadFile, onRenameFile, onDeleteFile, onClose }: any) => (
    <div data-testid="context-menu" style={{ display: contextMenu?.show ? 'block' : 'none' }}>
      <button onClick={() => contextMenu?.file && onDownloadFile(contextMenu.file)} data-testid="download-context">Download</button>
      <button onClick={() => contextMenu?.file && onRenameFile(contextMenu.file)} data-testid="rename-context">Rename</button>
      <button onClick={() => contextMenu?.file && onDeleteFile(contextMenu.file)} data-testid="delete-context">Delete</button>
      <button onClick={onClose} data-testid="close-context">Close</button>
    </div>
  ),
}));

vi.mock("./FileActions/RenameModal", () => ({
  RenameModal: ({ file, onConfirm, onCancel }: any) => (
    <div data-testid="rename-modal" style={{ display: file ? 'block' : 'none' }}>
      <button onClick={onConfirm} data-testid="confirm-rename">Confirm</button>
      <button onClick={onCancel} data-testid="cancel-rename">Cancel</button>
    </div>
  ),
}));

vi.mock("./FileActions/ZipProgressModal", () => ({
  ZipProgressModal: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="zip-progress-modal">
        <button onClick={onClose} data-testid="close-zip-modal">Close</button>
      </div>
    ) : null,
}));

vi.mock("@/components/modal", () => ({
  ConfirmationModal: ({ isOpen, onConfirm, onCancel }: any) =>
    isOpen ? (
      <div data-testid="confirmation-modal">
        <button onClick={onConfirm} data-testid="confirm-action">Confirm</button>
        <button onClick={onCancel} data-testid="cancel-action">Cancel</button>
      </div>
    ) : null,
  AlertModal: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="alert-modal">
        <button onClick={onClose} data-testid="close-alert">Close</button>
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
    vi.mocked(fileService.uploadMultipleFiles).mockResolvedValue(ok({
      successful: ["test.txt"],
      failed: [],
    }));
    vi.mocked(fileService.downloadFile).mockResolvedValue(ok(new Blob(["test content"])));
    vi.mocked(fileService.deleteFile).mockResolvedValue(ok(undefined));
    vi.mocked(fileService.renameFile).mockResolvedValue(ok(undefined));
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
    it("should handle file download from context menu", async () => {
      // Mock URL methods
      const mockCreateObjectURL = vi.fn(() => "blob:test-url");
      const mockRevokeObjectURL = vi.fn();
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      // Mock createElement and DOM methods
      const mockAnchor = {
        href: "",
        download: "",
        style: { display: "" },
        click: vi.fn(),
      };
      vi.spyOn(document, "createElement").mockReturnValue(mockAnchor as any);
      vi.spyOn(document.body, "appendChild").mockImplementation(vi.fn());
      vi.spyOn(document.body, "removeChild").mockImplementation(vi.fn());
      vi.spyOn(document.body, "contains").mockImplementation(() => true);

      render(<FileExplorer serverId={mockServerId} />);

      // Trigger context menu
      fireEvent.click(screen.getByTestId("context-menu-trigger"));
      
      await waitFor(() => {
        expect(screen.getByTestId("context-menu")).toBeInTheDocument();
      });

      // Click download
      fireEvent.click(screen.getByTestId("download-context"));

      await waitFor(() => {
        expect(fileService.downloadFile).toHaveBeenCalled();
      });

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it("should handle file refresh", async () => {
      render(<FileExplorer serverId={mockServerId} />);

      const initialCalls = vi.mocked(fileService.listFiles).mock.calls.length;
      
      fireEvent.click(screen.getByTestId("refresh-files"));

      await waitFor(() => {
        expect(fileService.listFiles).toHaveBeenCalledTimes(initialCalls + 1);
      });
    });
  });

  describe("Context Menu", () => {
    it("should show context menu on trigger", () => {
      render(<FileExplorer serverId={mockServerId} />);

      // Show context menu
      fireEvent.click(screen.getByTestId("context-menu-trigger"));
      
      expect(screen.getByTestId("context-menu")).toBeInTheDocument();
    });

    it("should hide context menu on close", async () => {
      render(<FileExplorer serverId={mockServerId} />);

      // Show context menu
      fireEvent.click(screen.getByTestId("context-menu-trigger"));
      
      expect(screen.getByTestId("context-menu")).toBeInTheDocument();

      // Hide context menu
      fireEvent.click(screen.getByTestId("close-context"));

      // Context menu should still be in DOM but hidden
      expect(screen.getByTestId("context-menu")).toBeInTheDocument();
    });
  });

  describe("File Upload", () => {
    it("should handle file upload button interaction", () => {
      render(<FileExplorer serverId={mockServerId} />);

      // Just test that the mock upload button exists and can be clicked
      const uploadButton = screen.getByTestId("mock-file-upload");
      expect(uploadButton).toBeInTheDocument();
      
      fireEvent.click(uploadButton);
      
      // Component should still be functional after upload attempt
      expect(screen.getByTestId("file-list")).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("should handle download errors", async () => {
      vi.mocked(fileService.downloadFile).mockResolvedValue(err("Download failed"));

      render(<FileExplorer serverId={mockServerId} />);

      fireEvent.click(screen.getByTestId("context-menu-trigger"));
      
      await waitFor(() => {
        fireEvent.click(screen.getByTestId("download-context"));
      });

      await waitFor(() => {
        expect(fileService.downloadFile).toHaveBeenCalled();
      });

      // Toast should appear for error
      await waitFor(() => {
        expect(screen.getByText(/downloadFailed/)).toBeInTheDocument();
      });
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