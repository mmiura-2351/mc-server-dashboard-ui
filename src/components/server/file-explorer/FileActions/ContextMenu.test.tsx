import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { ContextMenu, type ContextMenuState } from "./ContextMenu";
import type { FileSystemItem } from "@/types/files";
import styles from "../../file-explorer.module.css";

// Mock language context
const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    "files.itemsSelected": "items selected",
    "files.downloadAsZip": "Download as ZIP",
    "files.deleteSelected": "Delete selected",
    "files.openFolder": "Open folder",
    "files.renameFolder": "Rename folder",
    "files.deleteFolder": "Delete folder",
    "files.viewFile": "View file",
    "files.download": "Download",
    "files.renameFile": "Rename file",
    "common.delete": "Delete",
  };
  return translations[key] || key;
});

vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({ t: mockT }),
}));

describe("ContextMenu", () => {
  const mockFile: FileSystemItem = {
    name: "test.txt",
    type: "text",
    is_directory: false,
    size: 100,
    modified: "2023-01-01T00:00:00Z",
    permissions: {},
    path: "/test.txt",
  };

  const mockFolder: FileSystemItem = {
    name: "testfolder",
    type: "directory", 
    is_directory: true,
    size: null,
    modified: "2023-01-01T00:00:00Z",
    permissions: {},
    path: "/testfolder",
  };

  const defaultContextMenu: ContextMenuState = {
    show: true,
    position: { x: 100, y: 100 },
    file: mockFile,
  };

  const mockHandlers = {
    onClose: vi.fn(),
    onOpenFolder: vi.fn(),
    onViewFile: vi.fn(),
    onDownloadFile: vi.fn(),
    onDownloadFolderAsZip: vi.fn(),
    onRenameFile: vi.fn(),
    onDeleteFile: vi.fn(),
    onBulkDownload: vi.fn(),
    onBulkDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Visibility Control", () => {
    it("should not render when show is false", () => {
      const { container } = render(
        <ContextMenu
          contextMenu={{ ...defaultContextMenu, show: false }}
          selectedFiles={new Set()}
          {...mockHandlers}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it("should not render when file is null", () => {
      const { container } = render(
        <ContextMenu
          contextMenu={{ ...defaultContextMenu, file: null }}
          selectedFiles={new Set()}
          {...mockHandlers}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it("should render when show is true and file exists", () => {
      render(
        <ContextMenu
          contextMenu={defaultContextMenu}
          selectedFiles={new Set()}
          {...mockHandlers}
        />
      );

      expect(screen.getByText("View file")).toBeInTheDocument();
      expect(screen.getByText("Download")).toBeInTheDocument();
    });
  });

  describe("Position and Styling", () => {
    it("should apply correct position styles", () => {
      const { container } = render(
        <ContextMenu
          contextMenu={defaultContextMenu}
          selectedFiles={new Set()}
          {...mockHandlers}
        />
      );

      const contextMenu = container.firstChild as HTMLElement;
      expect(contextMenu).toHaveStyle({
        position: "fixed",
        top: "100px",
        left: "100px",
        zIndex: "1000",
      });
    });

    it("should render with different position values", () => {
      const customPosition = { x: 250, y: 350 };
      const { container } = render(
        <ContextMenu
          contextMenu={{ ...defaultContextMenu, position: customPosition }}
          selectedFiles={new Set()}
          {...mockHandlers}
        />
      );

      const contextMenu = container.firstChild as HTMLElement;
      expect(contextMenu).toHaveStyle({
        top: "350px",
        left: "250px",
      });
    });
  });

  describe("Single File Operations", () => {
    it("should render file operations for regular file", () => {
      render(
        <ContextMenu
          contextMenu={defaultContextMenu}
          selectedFiles={new Set()}
          {...mockHandlers}
        />
      );

      expect(screen.getByText("View file")).toBeInTheDocument();
      expect(screen.getByText("Download")).toBeInTheDocument();
      expect(screen.getByText("Rename file")).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    it("should call onViewFile when view file is clicked", () => {
      render(
        <ContextMenu
          contextMenu={defaultContextMenu}
          selectedFiles={new Set()}
          {...mockHandlers}
        />
      );

      fireEvent.click(screen.getByText("View file"));
      expect(mockHandlers.onViewFile).toHaveBeenCalledWith(mockFile);
    });

    it("should call onDownloadFile when download is clicked", () => {
      render(
        <ContextMenu
          contextMenu={defaultContextMenu}
          selectedFiles={new Set()}
          {...mockHandlers}
        />
      );

      fireEvent.click(screen.getByText("Download"));
      expect(mockHandlers.onDownloadFile).toHaveBeenCalledWith(mockFile);
    });

    it("should call onRenameFile when rename is clicked", () => {
      render(
        <ContextMenu
          contextMenu={defaultContextMenu}
          selectedFiles={new Set()}
          {...mockHandlers}
        />
      );

      fireEvent.click(screen.getByText("Rename file"));
      expect(mockHandlers.onRenameFile).toHaveBeenCalledWith(mockFile);
    });

    it("should call onDeleteFile when delete is clicked", () => {
      render(
        <ContextMenu
          contextMenu={defaultContextMenu}
          selectedFiles={new Set()}
          {...mockHandlers}
        />
      );

      fireEvent.click(screen.getByText("Delete"));
      expect(mockHandlers.onDeleteFile).toHaveBeenCalledWith(mockFile);
    });
  });

  describe("Single Folder Operations", () => {
    it("should render folder operations for directory", () => {
      render(
        <ContextMenu
          contextMenu={{ ...defaultContextMenu, file: mockFolder }}
          selectedFiles={new Set()}
          {...mockHandlers}
        />
      );

      expect(screen.getByText("Open folder")).toBeInTheDocument();
      expect(screen.getByText("Download as ZIP")).toBeInTheDocument();
      expect(screen.getByText("Rename folder")).toBeInTheDocument();
      expect(screen.getByText("Delete folder")).toBeInTheDocument();
      expect(screen.queryByText("View file")).not.toBeInTheDocument();
    });

    it("should call onOpenFolder when open folder is clicked", () => {
      render(
        <ContextMenu
          contextMenu={{ ...defaultContextMenu, file: mockFolder }}
          selectedFiles={new Set()}
          {...mockHandlers}
        />
      );

      fireEvent.click(screen.getByText("Open folder"));
      expect(mockHandlers.onOpenFolder).toHaveBeenCalledWith(mockFolder);
    });

    it("should call onDownloadFolderAsZip when download ZIP is clicked", () => {
      render(
        <ContextMenu
          contextMenu={{ ...defaultContextMenu, file: mockFolder }}
          selectedFiles={new Set()}
          {...mockHandlers}
        />
      );

      fireEvent.click(screen.getByText("Download as ZIP"));
      expect(mockHandlers.onDownloadFolderAsZip).toHaveBeenCalledWith(mockFolder);
    });

    it("should call onRenameFile when rename folder is clicked", () => {
      render(
        <ContextMenu
          contextMenu={{ ...defaultContextMenu, file: mockFolder }}
          selectedFiles={new Set()}
          {...mockHandlers}
        />
      );

      fireEvent.click(screen.getByText("Rename folder"));
      expect(mockHandlers.onRenameFile).toHaveBeenCalledWith(mockFolder);
    });

    it("should call onDeleteFile when delete folder is clicked", () => {
      render(
        <ContextMenu
          contextMenu={{ ...defaultContextMenu, file: mockFolder }}
          selectedFiles={new Set()}
          {...mockHandlers}
        />
      );

      fireEvent.click(screen.getByText("Delete folder"));
      expect(mockHandlers.onDeleteFile).toHaveBeenCalledWith(mockFolder);
    });
  });

  describe("Bulk Operations", () => {
    it("should show bulk operations when multiple files are selected", () => {
      const selectedFiles = new Set(["file1.txt", "file2.txt", "file3.txt"]);
      
      render(
        <ContextMenu
          contextMenu={defaultContextMenu}
          selectedFiles={selectedFiles}
          {...mockHandlers}
        />
      );

      expect(screen.getByText("3 items selected")).toBeInTheDocument();
      expect(screen.getByText("Download as ZIP (3)")).toBeInTheDocument();
      expect(screen.getByText("Delete selected (3)")).toBeInTheDocument();
      expect(screen.queryByText("View file")).not.toBeInTheDocument();
    });

    it("should show bulk operations when current file is in selection", () => {
      const selectedFiles = new Set(["test.txt"]);
      
      render(
        <ContextMenu
          contextMenu={defaultContextMenu}
          selectedFiles={selectedFiles}
          {...mockHandlers}
        />
      );

      expect(screen.getByText("1 items selected")).toBeInTheDocument();
      expect(screen.getByText("Download as ZIP (1)")).toBeInTheDocument();
      expect(screen.getByText("Delete selected (1)")).toBeInTheDocument();
    });

    it("should call onBulkDownload and onClose when bulk download is clicked", () => {
      const selectedFiles = new Set(["file1.txt", "file2.txt"]);
      
      render(
        <ContextMenu
          contextMenu={defaultContextMenu}
          selectedFiles={selectedFiles}
          {...mockHandlers}
        />
      );

      fireEvent.click(screen.getByText("Download as ZIP (2)"));
      expect(mockHandlers.onClose).toHaveBeenCalled();
      expect(mockHandlers.onBulkDownload).toHaveBeenCalled();
    });

    it("should call onBulkDelete and onClose when bulk delete is clicked", () => {
      const selectedFiles = new Set(["file1.txt", "file2.txt"]);
      
      render(
        <ContextMenu
          contextMenu={defaultContextMenu}
          selectedFiles={selectedFiles}
          {...mockHandlers}
        />
      );

      fireEvent.click(screen.getByText("Delete selected (2)"));
      expect(mockHandlers.onClose).toHaveBeenCalled();
      expect(mockHandlers.onBulkDelete).toHaveBeenCalled();
    });
  });

  describe("File Viewability Detection", () => {
    it("should show view option for viewable text files", () => {
      const viewableFiles = [
        { ...mockFile, name: "config.txt" },
        { ...mockFile, name: "server.properties" },
        { ...mockFile, name: "config.yml" },
        { ...mockFile, name: "data.json" },
        { ...mockFile, name: "script.sh" },
        { ...mockFile, name: "image.png" },
      ];

      viewableFiles.forEach((file) => {
        const { unmount } = render(
          <ContextMenu
            contextMenu={{ ...defaultContextMenu, file }}
            selectedFiles={new Set()}
            {...mockHandlers}
          />
        );

        expect(screen.getByText("View file")).toBeInTheDocument();
        unmount();
      });
    });

    it("should not show view option for non-viewable files", () => {
      const nonViewableFiles = [
        { ...mockFile, name: "archive.zip" },
        { ...mockFile, name: "binary.exe" },
        { ...mockFile, name: "data.bin" },
        { ...mockFile, name: "document.pdf" },
      ];

      nonViewableFiles.forEach((file) => {
        const { unmount } = render(
          <ContextMenu
            contextMenu={{ ...defaultContextMenu, file }}
            selectedFiles={new Set()}
            {...mockHandlers}
          />
        );

        expect(screen.queryByText("View file")).not.toBeInTheDocument();
        expect(screen.getByText("Download")).toBeInTheDocument(); // Should still show download
        unmount();
      });
    });

    it("should handle files without extension", () => {
      const fileWithoutExtension = { ...mockFile, name: "README" };
      
      render(
        <ContextMenu
          contextMenu={{ ...defaultContextMenu, file: fileWithoutExtension }}
          selectedFiles={new Set()}
          {...mockHandlers}
        />
      );

      expect(screen.queryByText("View file")).not.toBeInTheDocument();
      expect(screen.getByText("Download")).toBeInTheDocument();
    });

    it("should handle case-insensitive file extensions", () => {
      const upperCaseFile = { ...mockFile, name: "config.TXT" };
      
      render(
        <ContextMenu
          contextMenu={{ ...defaultContextMenu, file: upperCaseFile }}
          selectedFiles={new Set()}
          {...mockHandlers}
        />
      );

      expect(screen.getByText("View file")).toBeInTheDocument();
    });
  });

  describe("Menu Item States", () => {
    it("should apply danger class to delete buttons", () => {
      const { container } = render(
        <ContextMenu
          contextMenu={defaultContextMenu}
          selectedFiles={new Set()}
          {...mockHandlers}
        />
      );

      const deleteButton = screen.getByText("Delete");
      expect(deleteButton).toHaveClass(styles.danger || "danger");
    });

    it("should render separators correctly", () => {
      const { container } = render(
        <ContextMenu
          contextMenu={defaultContextMenu}
          selectedFiles={new Set()}
          {...mockHandlers}
        />
      );

      const separators = container.querySelectorAll("hr");
      expect(separators).toHaveLength(1);
    });
  });
});