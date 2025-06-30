import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { ok } from "neverthrow";
import { FileExplorer } from "./FileExplorer";
import * as fileService from "@/services/files";
import type { FileSystemItem } from "@/types/files";

// Mock all the services and hooks
vi.mock("@/services/files", () => ({
  listFiles: vi.fn(),
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

// Mock child components with simple implementations
vi.mock("./FileList", () => ({
  FileList: () => <div data-testid="file-list">File List</div>,
}));

vi.mock("./FileViewer/FileViewer", () => ({
  FileViewer: () => <div data-testid="file-viewer">File Viewer</div>,
}));

vi.mock("./FileUpload/UploadModal", () => ({
  UploadModal: () => <div data-testid="upload-modal">Upload Modal</div>,
}));

vi.mock("./FileUpload/DragDropZone", () => ({
  DragDropZone: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="drag-drop-zone">{children}</div>
  ),
  useDragDropZone: () => ({
    fileInputRef: { current: null },
    folderInputRef: { current: null },
    triggerFileUpload: vi.fn(),
    triggerFolderUpload: vi.fn(),
  }),
}));

vi.mock("./FileActions/ContextMenu", () => ({
  ContextMenu: () => <div data-testid="context-menu">Context Menu</div>,
}));

vi.mock("./FileActions/RenameModal", () => ({
  RenameModal: () => <div data-testid="rename-modal">Rename Modal</div>,
}));

vi.mock("./FileActions/ZipProgressModal", () => ({
  ZipProgressModal: () => (
    <div data-testid="zip-progress-modal">ZIP Progress Modal</div>
  ),
}));

vi.mock("@/components/modal", () => ({
  ConfirmationModal: () => (
    <div data-testid="confirmation-modal">Confirmation Modal</div>
  ),
  AlertModal: () => <div data-testid="alert-modal">Alert Modal</div>,
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
  });

  describe("Basic Rendering", () => {
    it("should render file explorer components", async () => {
      render(<FileExplorer serverId={mockServerId} />);

      expect(screen.getByTestId("drag-drop-zone")).toBeInTheDocument();
      expect(screen.getByTestId("file-list")).toBeInTheDocument();
      expect(screen.getByText("files.uploadFiles")).toBeInTheDocument();
      expect(screen.getByText("files.uploadFolder")).toBeInTheDocument();
    });

    it("should load files on mount", async () => {
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

    it("should handle file loading errors gracefully", async () => {
      vi.mocked(fileService.listFiles).mockRejectedValue(
        new Error("Network error")
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
});
