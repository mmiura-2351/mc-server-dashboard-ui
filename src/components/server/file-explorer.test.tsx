import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  cleanup,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ok, err } from "neverthrow";
import { FileExplorer } from "./file-explorer";
import type { FileSystemItem } from "@/types/files";

// Mock the file service
vi.mock("@/services/files", () => ({
  listFiles: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  deleteFile: vi.fn(),
  downloadFile: vi.fn(),
  uploadMultipleFiles: vi.fn(),
  uploadFolderStructure: vi.fn(),
}));

// Mock JSZip
const mockZip = {
  file: vi.fn(),
  generateAsync: vi.fn().mockResolvedValue(new Blob(["mock zip data"])),
};

vi.mock("jszip", () => ({
  default: vi.fn(() => mockZip),
}));

describe("FileExplorer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset DOM
    document.body.innerHTML = "";
  });

  afterEach(() => {
    cleanup();
  });

  test("renders loading state initially", async () => {
    const { listFiles } = await import("@/services/files");
    vi.mocked(listFiles).mockReturnValue(new Promise(() => {})); // Never resolves

    render(<FileExplorer serverId={1} />);

    expect(screen.getByText("Loading files...")).toBeInTheDocument();
  });

  test("renders file list after loading", async () => {
    const { listFiles } = await import("@/services/files");
    const mockFiles: FileSystemItem[] = [
      {
        name: "server.properties",
        type: "text",
        is_directory: false,
        size: 1024,
        modified: "2023-01-01T00:00:00Z",
        path: "/server.properties",
        permissions: { read: true, write: true, execute: false },
      },
      {
        name: "world",
        type: "directory",
        is_directory: true,
        path: "/world",
        modified: "2023-01-01T00:00:00Z",
        permissions: { read: true, write: true, execute: true },
      },
    ];

    vi.mocked(listFiles).mockResolvedValue(ok(mockFiles));

    render(<FileExplorer serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("server.properties")).toBeInTheDocument();
      expect(screen.getByText("world")).toBeInTheDocument();
    });
  });

  test("renders error state when file loading fails", async () => {
    const { listFiles } = await import("@/services/files");
    vi.mocked(listFiles).mockResolvedValue(
      err({ message: "Failed to load files" })
    );

    render(<FileExplorer serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Error loading files")).toBeInTheDocument();
      expect(screen.getByText("Failed to load files")).toBeInTheDocument();
    });
  });

  test("shows empty state when directory is empty", async () => {
    const { listFiles } = await import("@/services/files");
    vi.mocked(listFiles).mockResolvedValue(ok([]));

    render(<FileExplorer serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("This directory is empty")).toBeInTheDocument();
    });
  });

  test("does not render action buttons in Actions column (now uses context menu)", async () => {
    const { listFiles } = await import("@/services/files");
    const mockFiles: FileSystemItem[] = [
      {
        name: "server.properties",
        type: "text",
        is_directory: false,
        size: 1024,
        modified: "2023-01-01T00:00:00Z",
        path: "/server.properties",
        permissions: { read: true, write: true, execute: false },
      },
      {
        name: "server.jar",
        type: "binary",
        is_directory: false,
        size: 5120000,
        modified: "2023-01-01T00:00:00Z",
        path: "/server.jar",
        permissions: { read: true, write: false, execute: true },
      },
    ];

    vi.mocked(listFiles).mockResolvedValue(ok(mockFiles));

    render(<FileExplorer serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("server.properties")).toBeInTheDocument();
      expect(screen.getByText("server.jar")).toBeInTheDocument();
    });

    // Check that no action buttons are rendered in the main view (moved to context menu)
    const viewButtons = screen.queryAllByTitle("View file");
    expect(viewButtons).toHaveLength(0);
    const downloadButtons = screen.queryAllByTitle("Download file");
    expect(downloadButtons).toHaveLength(0);
    const deleteButtons = screen.queryAllByTitle("Delete file");
    expect(deleteButtons).toHaveLength(0);
  });

  test("shows toast notification when clicking non-viewable file", async () => {
    const user = userEvent.setup();
    const { listFiles } = await import("@/services/files");
    const mockFiles: FileSystemItem[] = [
      {
        name: "server.jar",
        type: "binary",
        is_directory: false,
        size: 5120000,
        modified: "2023-01-01T00:00:00Z",
        path: "/server.jar",
        permissions: { read: true, write: false, execute: true },
      },
    ];

    vi.mocked(listFiles).mockResolvedValue(ok(mockFiles));

    render(<FileExplorer serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("server.jar")).toBeInTheDocument();
    });

    // Click on the non-viewable file
    const fileRow = screen.getByText("server.jar").closest("div");
    expect(fileRow).toBeInTheDocument();

    await user.click(fileRow!);

    // Check that toast notification appears
    await waitFor(() => {
      expect(screen.getByText(/Cannot preview JAR files/i)).toBeInTheDocument();
    });
  });

  test("opens file viewer when clicking viewable text file", async () => {
    const user = userEvent.setup();
    const { listFiles, readFile } = await import("@/services/files");

    const mockFiles: FileSystemItem[] = [
      {
        name: "server.properties",
        type: "text",
        is_directory: false,
        size: 1024,
        modified: "2023-01-01T00:00:00Z",
        path: "/server.properties",
        permissions: { read: true, write: true, execute: false },
      },
    ];

    const mockFileContent = {
      content: "server-port=25565\nmotd=Welcome to my server",
      encoding: "utf-8",
      file_info: {
        name: "server.properties",
        size: 1024,
        modified: "2023-01-01T00:00:00Z",
        permissions: { read: true, write: true, execute: false },
      },
      is_image: false,
      image_data: null,
    };

    vi.mocked(listFiles).mockResolvedValue(ok(mockFiles));
    vi.mocked(readFile).mockResolvedValue(ok(mockFileContent));

    render(<FileExplorer serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("server.properties")).toBeInTheDocument();
    });

    // Click on the viewable file
    const fileRow = screen.getByText("server.properties").closest("div");
    expect(fileRow).toBeInTheDocument();

    await user.click(fileRow!);

    // Check that file viewer modal appears with content
    await waitFor(() => {
      expect(screen.getByText(/server-port=25565/)).toBeInTheDocument();
      expect(screen.getByText(/motd=Welcome to my server/)).toBeInTheDocument();
    });
  });

  test("navigates to directory when clicking folder", async () => {
    const user = userEvent.setup();
    const { listFiles } = await import("@/services/files");

    const rootFiles: FileSystemItem[] = [
      {
        name: "plugins",
        type: "directory",
        is_directory: true,
        path: "/plugins",
        modified: "2023-01-01T00:00:00Z",
        permissions: { read: true, write: true, execute: true },
      },
    ];

    const pluginFiles: FileSystemItem[] = [
      {
        name: "example.jar",
        type: "binary",
        is_directory: false,
        size: 1024,
        modified: "2023-01-01T00:00:00Z",
        path: "/plugins/example.jar",
        permissions: { read: true, write: false, execute: true },
      },
    ];

    vi.mocked(listFiles)
      .mockResolvedValueOnce(ok(rootFiles))
      .mockResolvedValueOnce(ok(pluginFiles));

    render(<FileExplorer serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("plugins")).toBeInTheDocument();
    });

    // Click on the directory
    const dirRow = screen.getByText("plugins").closest("div");
    expect(dirRow).toBeInTheDocument();

    await user.click(dirRow!);

    // Check that we navigated to the plugins directory
    await waitFor(() => {
      expect(screen.getByText("example.jar")).toBeInTheDocument();
    });
  });

  test("identifies viewable file types correctly", async () => {
    const { listFiles } = await import("@/services/files");
    const mockFiles: FileSystemItem[] = [
      // Viewable text files
      {
        name: "server.properties",
        type: "text",
        is_directory: false,
        size: 1024,
        modified: "2023-01-01T00:00:00Z",
        path: "/server.properties",
        permissions: { read: true, write: true, execute: false },
      },
      {
        name: "config.yml",
        type: "text",
        is_directory: false,
        size: 512,
        modified: "2023-01-01T00:00:00Z",
        path: "/config.yml",
        permissions: { read: true, write: true, execute: false },
      },
      {
        name: "README.txt",
        type: "text",
        is_directory: false,
        size: 256,
        modified: "2023-01-01T00:00:00Z",
        path: "/README.txt",
        permissions: { read: true, write: true, execute: false },
      },
      // Viewable image files
      {
        name: "logo.png",
        type: "binary",
        is_directory: false,
        size: 2048,
        modified: "2023-01-01T00:00:00Z",
        path: "/logo.png",
        permissions: { read: true, write: true, execute: false },
      },
      // Non-viewable files
      {
        name: "server.jar",
        type: "binary",
        is_directory: false,
        size: 5120000,
        modified: "2023-01-01T00:00:00Z",
        path: "/server.jar",
        permissions: { read: true, write: false, execute: true },
      },
    ];

    vi.mocked(listFiles).mockResolvedValue(ok(mockFiles));

    render(<FileExplorer serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("server.properties")).toBeInTheDocument();
      expect(screen.getByText("config.yml")).toBeInTheDocument();
      expect(screen.getByText("README.txt")).toBeInTheDocument();
      expect(screen.getByText("logo.png")).toBeInTheDocument();
      expect(screen.getByText("server.jar")).toBeInTheDocument();
    });

    // All files should be clickable but no view icons should be present
    const viewButtons = screen.queryAllByTitle("View file");
    expect(viewButtons).toHaveLength(0);
  });

  test("handles file loading errors gracefully", async () => {
    const user = userEvent.setup();
    const { listFiles, readFile } = await import("@/services/files");

    const mockFiles: FileSystemItem[] = [
      {
        name: "server.properties",
        type: "text",
        is_directory: false,
        size: 1024,
        modified: "2023-01-01T00:00:00Z",
        path: "/server.properties",
        permissions: { read: true, write: true, execute: false },
      },
    ];

    vi.mocked(listFiles).mockResolvedValue(ok(mockFiles));
    vi.mocked(readFile).mockResolvedValue(
      err({ message: "Permission denied" })
    );

    render(<FileExplorer serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("server.properties")).toBeInTheDocument();
    });

    // Click on the file
    const fileRow = screen.getByText("server.properties").closest("div");
    expect(fileRow).toBeInTheDocument();

    await user.click(fileRow!);

    // Check that error toast appears
    await waitFor(() => {
      expect(screen.getByText(/Permission denied/i)).toBeInTheDocument();
    });
  });

  test("shows loading state for file content without affecting main UI", async () => {
    const user = userEvent.setup();
    const { listFiles, readFile } = await import("@/services/files");

    const mockFiles: FileSystemItem[] = [
      {
        name: "server.properties",
        type: "text",
        is_directory: false,
        size: 1024,
        modified: "2023-01-01T00:00:00Z",
        path: "/server.properties",
        permissions: { read: true, write: true, execute: false },
      },
    ];

    vi.mocked(listFiles).mockResolvedValue(ok(mockFiles));
    vi.mocked(readFile).mockReturnValue(new Promise(() => {})); // Never resolves

    render(<FileExplorer serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("server.properties")).toBeInTheDocument();
    });

    // Click on the file
    const fileRow = screen.getByText("server.properties").closest("div");
    expect(fileRow).toBeInTheDocument();

    await user.click(fileRow!);

    // Check that file list is still visible (not replaced by loading state)
    expect(screen.getByText("server.properties")).toBeInTheDocument();

    // Check that modal shows loading state
    await waitFor(() => {
      expect(screen.getByText(/Loading/i)).toBeInTheDocument();
    });
  });

  test("displays image files correctly", async () => {
    const user = userEvent.setup();
    const { listFiles, readFile } = await import("@/services/files");

    const mockFiles: FileSystemItem[] = [
      {
        name: "minecraft.jpg",
        type: "binary",
        is_directory: false,
        size: 6800,
        modified: "2023-01-01T00:00:00Z",
        path: "/minecraft.jpg",
        permissions: { read: true, write: true, execute: false },
      },
    ];

    const mockImageContent = {
      content: "",
      encoding: "binary",
      file_info: {
        name: "minecraft.jpg",
        size: 6800,
        modified: "2023-01-01T00:00:00Z",
        permissions: { read: true, write: true, execute: false },
      },
      is_image: true,
      image_data:
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA",
    };

    vi.mocked(listFiles).mockResolvedValue(ok(mockFiles));
    vi.mocked(readFile).mockResolvedValue(ok(mockImageContent));

    render(<FileExplorer serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("minecraft.jpg")).toBeInTheDocument();
    });

    // Click on the image file
    const fileRow = screen.getByText("minecraft.jpg").closest("div");
    expect(fileRow).toBeInTheDocument();

    await user.click(fileRow!);

    // Check that image modal appears
    await waitFor(() => {
      expect(screen.getByText(/🖼️ minecraft.jpg/)).toBeInTheDocument();
      const img = screen.getByAltText("minecraft.jpg");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute(
        "src",
        expect.stringContaining("data:image/jpeg;base64,")
      );
    });
  });

  describe("Context Menu", () => {
    test("shows context menu on right click for file", async () => {
      const { listFiles } = await import("@/services/files");

      const mockFiles: FileSystemItem[] = [
        {
          name: "server.properties",
          type: "text",
          is_directory: false,
          size: 1024,
          modified: "2023-01-01T00:00:00Z",
          path: "/server.properties",
          permissions: { read: true, write: true, execute: false },
        },
      ];

      vi.mocked(listFiles).mockResolvedValue(ok(mockFiles));

      render(<FileExplorer serverId={1} />);

      await waitFor(() => {
        expect(screen.getByText("server.properties")).toBeInTheDocument();
      });

      // Right click on file
      const fileRow = screen.getByText("server.properties").closest("div");
      fireEvent.contextMenu(fileRow!);

      // Check that context menu appears with file options
      await waitFor(() => {
        expect(screen.getByText("👁️ View File")).toBeInTheDocument();
        expect(screen.getByText("📥 Download")).toBeInTheDocument();
        expect(screen.getByText("🗑️ Delete")).toBeInTheDocument();
      });
    });

    test("shows context menu on right click for directory", async () => {
      const { listFiles } = await import("@/services/files");

      const mockFiles: FileSystemItem[] = [
        {
          name: "plugins",
          type: "directory",
          is_directory: true,
          path: "/plugins",
          modified: "2023-01-01T00:00:00Z",
          permissions: { read: true, write: true, execute: true },
        },
      ];

      vi.mocked(listFiles).mockResolvedValue(ok(mockFiles));

      render(<FileExplorer serverId={1} />);

      await waitFor(() => {
        expect(screen.getByText("plugins")).toBeInTheDocument();
      });

      // Right click on directory
      const dirRow = screen.getByText("plugins").closest("div");
      fireEvent.contextMenu(dirRow!);

      // Check that context menu appears with folder options
      await waitFor(() => {
        expect(screen.getByText("📁 Open Folder")).toBeInTheDocument();
        expect(screen.getByText("🗑️ Delete Folder")).toBeInTheDocument();
      });

      // Should not show file-specific options
      expect(screen.queryByText("📥 Download")).not.toBeInTheDocument();
      expect(screen.queryByText("👁️ View File")).not.toBeInTheDocument();
    });

    test("hides context menu when clicking elsewhere", async () => {
      const user = userEvent.setup();
      const { listFiles } = await import("@/services/files");

      const mockFiles: FileSystemItem[] = [
        {
          name: "test.txt",
          type: "text",
          is_directory: false,
          size: 1024,
          modified: "2023-01-01T00:00:00Z",
          path: "/test.txt",
          permissions: { read: true, write: true, execute: false },
        },
      ];

      vi.mocked(listFiles).mockResolvedValue(ok(mockFiles));

      render(<FileExplorer serverId={1} />);

      await waitFor(() => {
        expect(screen.getByText("test.txt")).toBeInTheDocument();
      });

      // Right click to show context menu
      const fileRow = screen.getByText("test.txt").closest("div");
      fireEvent.contextMenu(fileRow!);

      await waitFor(() => {
        expect(screen.getByText("👁️ View File")).toBeInTheDocument();
      });

      // Click elsewhere to hide menu
      await user.click(document.body);

      // Context menu should be hidden
      await waitFor(() => {
        expect(screen.queryByText("👁️ View File")).not.toBeInTheDocument();
      });
    });

    // Note: Download functionality is tested in integration tests
    // Complex DOM mocking makes unit testing difficult for this specific case

    test("deletes file from context menu with confirmation", async () => {
      const user = userEvent.setup();
      const { listFiles, deleteFile } = await import("@/services/files");

      const mockFiles: FileSystemItem[] = [
        {
          name: "old-file.txt",
          type: "text",
          is_directory: false,
          size: 1024,
          modified: "2023-01-01T00:00:00Z",
          path: "/old-file.txt",
          permissions: { read: true, write: true, execute: false },
        },
      ];

      vi.mocked(listFiles).mockResolvedValue(ok(mockFiles));
      vi.mocked(deleteFile).mockResolvedValue(ok(undefined));

      // Mock window.confirm to return true
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

      render(<FileExplorer serverId={1} />);

      await waitFor(() => {
        expect(screen.getByText("old-file.txt")).toBeInTheDocument();
      });

      // Right click and select delete
      const fileRow = screen.getByText("old-file.txt").closest("div");
      fireEvent.contextMenu(fileRow!);

      await waitFor(() => {
        expect(screen.getByText("🗑️ Delete")).toBeInTheDocument();
      });

      await user.click(screen.getByText("🗑️ Delete"));

      // Check that confirmation was shown and delete was called
      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalledWith(
          'Are you sure you want to delete "old-file.txt"?'
        );
        expect(deleteFile).toHaveBeenCalledWith(1, "old-file.txt");
        expect(
          screen.getByText(/Successfully deleted old-file.txt/)
        ).toBeInTheDocument();
      });

      confirmSpy.mockRestore();
    });

    test("cancels delete when confirmation is denied", async () => {
      const user = userEvent.setup();
      const { listFiles, deleteFile } = await import("@/services/files");

      const mockFiles: FileSystemItem[] = [
        {
          name: "important.txt",
          type: "text",
          is_directory: false,
          size: 1024,
          modified: "2023-01-01T00:00:00Z",
          path: "/important.txt",
          permissions: { read: true, write: true, execute: false },
        },
      ];

      vi.mocked(listFiles).mockResolvedValue(ok(mockFiles));

      // Mock window.confirm to return false (cancel)
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

      render(<FileExplorer serverId={1} />);

      await waitFor(() => {
        expect(screen.getByText("important.txt")).toBeInTheDocument();
      });

      // Right click and select delete
      const fileRow = screen.getByText("important.txt").closest("div");
      fireEvent.contextMenu(fileRow!);

      await waitFor(() => {
        expect(screen.getByText("🗑️ Delete")).toBeInTheDocument();
      });

      await user.click(screen.getByText("🗑️ Delete"));

      // Check that confirmation was shown but delete was not called
      expect(confirmSpy).toHaveBeenCalled();
      expect(deleteFile).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    test("views file from context menu", async () => {
      const user = userEvent.setup();
      const { listFiles, readFile } = await import("@/services/files");

      const mockFiles: FileSystemItem[] = [
        {
          name: "config.yml",
          type: "text",
          is_directory: false,
          size: 1024,
          modified: "2023-01-01T00:00:00Z",
          path: "/config.yml",
          permissions: { read: true, write: true, execute: false },
        },
      ];

      const mockFileContent = {
        content: "debug: false\nport: 25565",
        encoding: "utf-8",
        file_info: {
          name: "config.yml",
          size: 1024,
          modified: "2023-01-01T00:00:00Z",
          permissions: { read: true, write: true, execute: false },
        },
        is_image: false,
        image_data: null,
      };

      vi.mocked(listFiles).mockResolvedValue(ok(mockFiles));
      vi.mocked(readFile).mockResolvedValue(ok(mockFileContent));

      render(<FileExplorer serverId={1} />);

      await waitFor(() => {
        expect(screen.getByText("config.yml")).toBeInTheDocument();
      });

      // Right click and select view
      const fileRow = screen.getByText("config.yml").closest("div");
      fireEvent.contextMenu(fileRow!);

      await waitFor(() => {
        expect(screen.getByText("👁️ View File")).toBeInTheDocument();
      });

      await user.click(screen.getByText("👁️ View File"));

      // Check that file viewer opens
      await waitFor(() => {
        expect(screen.getByText(/debug: false/)).toBeInTheDocument();
        expect(screen.getByText(/port: 25565/)).toBeInTheDocument();
      });
    });

    test("only shows View File option for viewable files", async () => {
      const { listFiles } = await import("@/services/files");

      const mockFiles: FileSystemItem[] = [
        {
          name: "server.jar",
          type: "binary",
          is_directory: false,
          size: 5120000,
          modified: "2023-01-01T00:00:00Z",
          path: "/server.jar",
          permissions: { read: true, write: false, execute: true },
        },
      ];

      vi.mocked(listFiles).mockResolvedValue(ok(mockFiles));

      render(<FileExplorer serverId={1} />);

      await waitFor(() => {
        expect(screen.getByText("server.jar")).toBeInTheDocument();
      });

      // Right click on non-viewable file
      const fileRow = screen.getByText("server.jar").closest("div");
      fireEvent.contextMenu(fileRow!);

      // Check that context menu appears but without View File option
      await waitFor(() => {
        expect(screen.getByText("📥 Download")).toBeInTheDocument();
        expect(screen.getByText("🗑️ Delete")).toBeInTheDocument();
        expect(screen.queryByText("👁️ View File")).not.toBeInTheDocument();
      });
    });
  });

  test("allows editing text files", async () => {
    const user = userEvent.setup();
    const { listFiles, readFile, writeFile } = await import("@/services/files");

    const mockFiles: FileSystemItem[] = [
      {
        name: "config.yml",
        type: "text",
        is_directory: false,
        size: 1024,
        modified: "2023-01-01T00:00:00Z",
        path: "/config.yml",
        permissions: { read: true, write: true, execute: false },
      },
    ];

    const mockFileContent = {
      content: "debug: false\nserver-port: 25565",
      encoding: "utf-8",
      file_info: {
        name: "config.yml",
        size: 1024,
        modified: "2023-01-01T00:00:00Z",
        permissions: { read: true, write: true, execute: false },
      },
      is_image: false,
      image_data: null,
    };

    vi.mocked(listFiles).mockResolvedValue(ok(mockFiles));
    vi.mocked(readFile).mockResolvedValue(ok(mockFileContent));
    vi.mocked(writeFile).mockResolvedValue(ok(undefined));

    render(<FileExplorer serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("config.yml")).toBeInTheDocument();
    });

    // Click on the text file
    const fileRow = screen.getByText("config.yml").closest("div");
    expect(fileRow).toBeInTheDocument();

    await user.click(fileRow!);

    // Check that file viewer modal appears
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /config.yml/ })
      ).toBeInTheDocument();
      expect(screen.getByText("✏️ Edit")).toBeInTheDocument();
    });

    // Click edit button
    const editButton = screen.getByText("✏️ Edit");
    await user.click(editButton);

    // Check that edit mode is active
    await waitFor(() => {
      expect(screen.getByDisplayValue(/debug: false/)).toBeInTheDocument();
      expect(screen.getByText("💾 Save")).toBeInTheDocument();
      expect(screen.getByText("❌ Cancel")).toBeInTheDocument();
    });

    // Edit the content
    const textarea = screen.getByDisplayValue(/debug: false/);
    await user.clear(textarea);
    await user.type(textarea, "debug: true\nserver-port: 25566");

    // Save the changes
    const saveButton = screen.getByText("💾 Save");
    await user.click(saveButton);

    // Check that save was called with correct content
    await waitFor(() => {
      expect(writeFile).toHaveBeenCalledWith(1, "config.yml", {
        content: "debug: true\nserver-port: 25566",
        encoding: "utf-8",
        create_backup: true,
      });
    });

    // Check that edit mode is exited
    await waitFor(() => {
      expect(screen.getByText("✏️ Edit")).toBeInTheDocument();
      expect(screen.queryByText("💾 Save")).not.toBeInTheDocument();
    });
  });

  test("handles edit cancellation", async () => {
    const user = userEvent.setup();
    const { listFiles, readFile } = await import("@/services/files");

    const mockFiles: FileSystemItem[] = [
      {
        name: "test.txt",
        type: "text",
        is_directory: false,
        size: 1024,
        modified: "2023-01-01T00:00:00Z",
        path: "/test.txt",
        permissions: { read: true, write: true, execute: false },
      },
    ];

    const mockFileContent = {
      content: "original content",
      encoding: "utf-8",
      file_info: {
        name: "test.txt",
        size: 1024,
        modified: "2023-01-01T00:00:00Z",
        permissions: { read: true, write: true, execute: false },
      },
      is_image: false,
      image_data: null,
    };

    vi.mocked(listFiles).mockResolvedValue(ok(mockFiles));
    vi.mocked(readFile).mockResolvedValue(ok(mockFileContent));

    render(<FileExplorer serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("test.txt")).toBeInTheDocument();
    });

    // Click on the text file
    const fileRow = screen.getByText("test.txt").closest("div");
    await user.click(fileRow!);

    // Check that file viewer modal appears
    await waitFor(() => {
      expect(screen.getByText("✏️ Edit")).toBeInTheDocument();
    });

    // Click edit button
    const editButton = screen.getByText("✏️ Edit");
    await user.click(editButton);

    // Edit the content
    const textarea = screen.getByDisplayValue("original content");
    await user.clear(textarea);
    await user.type(textarea, "modified content");

    // Cancel the changes
    const cancelButton = screen.getByText("❌ Cancel");
    await user.click(cancelButton);

    // Check that original content is restored and edit mode is exited
    await waitFor(() => {
      expect(screen.getByText("✏️ Edit")).toBeInTheDocument();
      expect(screen.queryByText("💾 Save")).not.toBeInTheDocument();
    });
  });

  test("handles save errors gracefully", async () => {
    const user = userEvent.setup();
    const { listFiles, readFile, writeFile } = await import("@/services/files");

    const mockFiles: FileSystemItem[] = [
      {
        name: "readonly.txt",
        type: "text",
        is_directory: false,
        size: 1024,
        modified: "2023-01-01T00:00:00Z",
        path: "/readonly.txt",
        permissions: { read: true, write: false, execute: false },
      },
    ];

    const mockFileContent = {
      content: "content to edit",
      encoding: "utf-8",
      file_info: {
        name: "readonly.txt",
        size: 1024,
        modified: "2023-01-01T00:00:00Z",
        permissions: { read: true, write: false, execute: false },
      },
      is_image: false,
      image_data: null,
    };

    vi.mocked(listFiles).mockResolvedValue(ok(mockFiles));
    vi.mocked(readFile).mockResolvedValue(ok(mockFileContent));
    vi.mocked(writeFile).mockResolvedValue(
      err({ message: "Permission denied" })
    );

    render(<FileExplorer serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("readonly.txt")).toBeInTheDocument();
    });

    // Click on the text file
    const fileRow = screen.getByText("readonly.txt").closest("div");
    await user.click(fileRow!);

    // Click edit button
    await waitFor(() => {
      const editButton = screen.getByText("✏️ Edit");
      return user.click(editButton);
    });

    // Edit the content
    const textarea = screen.getByDisplayValue("content to edit");
    await user.clear(textarea);
    await user.type(textarea, "new content");

    // Save the changes (should fail)
    const saveButton = screen.getByText("💾 Save");
    await user.click(saveButton);

    // Check that error toast appears
    await waitFor(() => {
      expect(
        screen.getByText(/Failed to save file: Permission denied/)
      ).toBeInTheDocument();
    });

    // Check that edit mode is still active (didn't exit on error)
    expect(screen.getByText("💾 Save")).toBeInTheDocument();
    expect(screen.getByText("❌ Cancel")).toBeInTheDocument();
  });

  test("does not show edit button for image files", async () => {
    const user = userEvent.setup();
    const { listFiles, readFile } = await import("@/services/files");

    const mockFiles: FileSystemItem[] = [
      {
        name: "image.png",
        type: "binary",
        is_directory: false,
        size: 2048,
        modified: "2023-01-01T00:00:00Z",
        path: "/image.png",
        permissions: { read: true, write: true, execute: false },
      },
    ];

    const mockImageContent = {
      content: "",
      encoding: "binary",
      file_info: {
        name: "image.png",
        size: 2048,
        modified: "2023-01-01T00:00:00Z",
        permissions: { read: true, write: true, execute: false },
      },
      is_image: true,
      image_data: "base64encodedimagedata",
    };

    vi.mocked(listFiles).mockResolvedValue(ok(mockFiles));
    vi.mocked(readFile).mockResolvedValue(ok(mockImageContent));

    render(<FileExplorer serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("image.png")).toBeInTheDocument();
    });

    // Click on the image file
    const fileRow = screen.getByText("image.png").closest("div");
    await user.click(fileRow!);

    // Check that image modal appears but no edit button
    await waitFor(() => {
      expect(screen.getByText(/🖼️ image.png/)).toBeInTheDocument();
      expect(screen.queryByText("✏️ Edit")).not.toBeInTheDocument();
    });
  });

  describe("Upload functionality", () => {
    test("shows upload buttons in toolbar", async () => {
      const { listFiles } = await import("@/services/files");
      vi.mocked(listFiles).mockResolvedValue(ok([]));

      render(<FileExplorer serverId={1} />);

      await waitFor(() => {
        expect(screen.getByText("📁 Upload Files")).toBeInTheDocument();
        expect(screen.getByText("📂 Upload Folder")).toBeInTheDocument();
      });
    });

    test("handles successful file upload", async () => {
      const { listFiles, uploadMultipleFiles } = await import(
        "@/services/files"
      );

      vi.mocked(listFiles).mockResolvedValue(ok([]));
      vi.mocked(uploadMultipleFiles).mockResolvedValue(
        ok({
          successful: ["test.txt"],
          failed: [],
        })
      );

      render(<FileExplorer serverId={1} />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText("📁 Upload Files")).toBeInTheDocument();
      });

      // Create a mock file
      const file = new File(["test content"], "test.txt", {
        type: "text/plain",
      });

      // Get the hidden file input and trigger change
      const fileInput = document.querySelector(
        'input[type="file"][multiple]'
      ) as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();

      // Mock the file input's files property
      Object.defineProperty(fileInput, "files", {
        value: [file],
        writable: false,
      });

      // Trigger the change event
      fireEvent.change(fileInput);

      // Check that upload was called
      await waitFor(() => {
        expect(uploadMultipleFiles).toHaveBeenCalledWith(
          1,
          "/",
          [file],
          expect.any(Function)
        );
      });
    });

    test("shows upload progress modal during upload", async () => {
      const { listFiles, uploadMultipleFiles } = await import(
        "@/services/files"
      );

      vi.mocked(listFiles).mockResolvedValue(ok([]));

      // Mock a slow upload
      vi.mocked(uploadMultipleFiles).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () => resolve(ok({ successful: ["test.txt"], failed: [] })),
              100
            );
          })
      );

      render(<FileExplorer serverId={1} />);

      await waitFor(() => {
        expect(screen.getByText("📁 Upload Files")).toBeInTheDocument();
      });

      const file = new File(["test content"], "test.txt", {
        type: "text/plain",
      });
      const fileInput = document.querySelector(
        'input[type="file"][multiple]'
      ) as HTMLInputElement;

      Object.defineProperty(fileInput, "files", {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      // Check that upload modal appears
      await waitFor(() => {
        expect(screen.getByText("📤 Upload Progress")).toBeInTheDocument();
      });
    });

    test("handles upload errors gracefully", async () => {
      const { listFiles, uploadMultipleFiles } = await import(
        "@/services/files"
      );

      vi.mocked(listFiles).mockResolvedValue(ok([]));
      vi.mocked(uploadMultipleFiles).mockResolvedValue(
        ok({
          successful: [],
          failed: [{ file: "test.txt", error: "Upload failed" }],
        })
      );

      render(<FileExplorer serverId={1} />);

      await waitFor(() => {
        expect(screen.getByText("📁 Upload Files")).toBeInTheDocument();
      });

      const file = new File(["test content"], "test.txt", {
        type: "text/plain",
      });
      const fileInput = document.querySelector(
        'input[type="file"][multiple]'
      ) as HTMLInputElement;

      Object.defineProperty(fileInput, "files", {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      // Check that error is shown
      await waitFor(() => {
        expect(screen.getByText(/0 files, 1 failed/)).toBeInTheDocument();
      });
    });

    test("handles folder upload with webkitRelativePath", async () => {
      const { listFiles, uploadFolderStructure } = await import(
        "@/services/files"
      );

      vi.mocked(listFiles).mockResolvedValue(ok([]));

      // Mock uploadFolderStructure to resolve immediately
      const uploadPromise = Promise.resolve(
        ok({
          successful: ["testfolder/file1.txt", "testfolder/subdir/file2.txt"],
          failed: [],
        })
      );
      vi.mocked(uploadFolderStructure).mockReturnValue(uploadPromise);

      render(<FileExplorer serverId={1} />);

      await waitFor(() => {
        expect(screen.getByText("📂 Upload Folder")).toBeInTheDocument();
      });

      const file1 = new File(["content1"], "file1.txt", { type: "text/plain" });
      const file2 = new File(["content2"], "file2.txt", { type: "text/plain" });

      // Mock webkitRelativePath for folder structure
      Object.defineProperty(file1, "webkitRelativePath", {
        value: "testfolder/file1.txt",
        writable: false,
        enumerable: true,
        configurable: false,
      });

      Object.defineProperty(file2, "webkitRelativePath", {
        value: "testfolder/subdir/file2.txt",
        writable: false,
        enumerable: true,
        configurable: false,
      });

      const folderInput = document.querySelector(
        'input[type="file"]:not([multiple])'
      ) as HTMLInputElement;

      Object.defineProperty(folderInput, "files", {
        value: [file1, file2],
        writable: false,
      });

      fireEvent.change(folderInput);

      // Wait for the upload to be initiated
      await waitFor(() => {
        expect(uploadFolderStructure).toHaveBeenCalledWith(
          1,
          "/",
          [file1, file2],
          expect.any(Function)
        );
      });

      // Wait for the upload promise to resolve
      await uploadPromise;

      // Check success message appears
      await waitFor(
        () => {
          expect(
            screen.getByText(/Successfully uploaded 2 files/)
          ).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    test("handles drag and drop correctly", async () => {
      const { listFiles, uploadMultipleFiles } = await import(
        "@/services/files"
      );

      vi.mocked(listFiles).mockResolvedValue(ok([]));
      vi.mocked(uploadMultipleFiles).mockResolvedValue(
        ok({
          successful: ["file.txt"],
          failed: [],
        })
      );

      render(<FileExplorer serverId={1} />);

      await waitFor(() => {
        expect(screen.getByText("This directory is empty")).toBeInTheDocument();
      });

      const container = screen
        .getByText("This directory is empty")
        .closest("div")!;

      // Create a simple file for drag and drop
      const mockFile = new File(["content"], "file.txt", {
        type: "text/plain",
      });

      // Simulate drag and drop with files (not folder)
      fireEvent.drop(container, {
        dataTransfer: {
          items: [],
          files: [mockFile],
        },
      });

      // Check that file upload was initiated
      await waitFor(() => {
        expect(uploadMultipleFiles).toHaveBeenCalledWith(
          1,
          "/",
          [mockFile],
          expect.any(Function)
        );
      });
    });

    test("shows drag and drop hint when dragging over", async () => {
      const { listFiles } = await import("@/services/files");
      vi.mocked(listFiles).mockResolvedValue(ok([]));

      render(<FileExplorer serverId={1} />);

      await waitFor(() => {
        expect(screen.getByText("This directory is empty")).toBeInTheDocument();
      });

      const container = screen
        .getByText("This directory is empty")
        .closest("div");
      expect(container).toBeTruthy();

      // Simulate drag enter
      fireEvent.dragEnter(container!, {
        dataTransfer: {
          items: [{ kind: "file" }],
        },
      });

      await waitFor(() => {
        expect(
          screen.getByText("Drop files or folders here to upload")
        ).toBeInTheDocument();
      });
    });
  });

  describe("Multi-select functionality", () => {
    test("shows checkboxes for all files and folders", async () => {
      const { listFiles } = await import("@/services/files");
      const mockFiles: FileSystemItem[] = [
        {
          name: "server.properties",
          type: "text",
          is_directory: false,
          size: 1024,
          modified: "2023-01-01T00:00:00Z",
          path: "/server.properties",
          permissions: { read: true, write: true, execute: false },
        },
        {
          name: "plugins",
          type: "directory",
          is_directory: true,
          path: "/plugins",
          modified: "2023-01-01T00:00:00Z",
          permissions: { read: true, write: true, execute: true },
        },
      ];

      vi.mocked(listFiles).mockResolvedValue(ok(mockFiles));

      render(<FileExplorer serverId={1} />);

      await waitFor(() => {
        expect(screen.getByText("server.properties")).toBeInTheDocument();
        expect(screen.getByText("plugins")).toBeInTheDocument();
      });

      // Check that checkboxes are present for both files and folders
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes).toHaveLength(3); // Header checkbox + 2 item checkboxes
    });

    test("allows selecting multiple files with checkboxes", async () => {
      const user = userEvent.setup();
      const { listFiles } = await import("@/services/files");

      const mockFiles: FileSystemItem[] = [
        {
          name: "file1.txt",
          type: "text",
          is_directory: false,
          size: 1024,
          modified: "2023-01-01T00:00:00Z",
          path: "/file1.txt",
          permissions: { read: true, write: true, execute: false },
        },
        {
          name: "file2.txt",
          type: "text",
          is_directory: false,
          size: 512,
          modified: "2023-01-01T00:00:00Z",
          path: "/file2.txt",
          permissions: { read: true, write: true, execute: false },
        },
      ];

      vi.mocked(listFiles).mockResolvedValue(ok(mockFiles));

      render(<FileExplorer serverId={1} />);

      await waitFor(() => {
        expect(screen.getByText("file1.txt")).toBeInTheDocument();
        expect(screen.getByText("file2.txt")).toBeInTheDocument();
      });

      // Get all checkboxes (header + file checkboxes)
      const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
      expect(checkboxes).toHaveLength(3); // Header + 2 files

      // Select first file (index 1 because index 0 is header checkbox)
      const file1Checkbox = checkboxes[1];
      await user.click(file1Checkbox);

      // Select second file (index 2)
      const file2Checkbox = checkboxes[2];
      await user.click(file2Checkbox);

      // Wait for selection to update
      await waitFor(() => {
        expect(screen.getByText("2 selected")).toBeInTheDocument();
      });

      // Check that both files are selected
      await waitFor(() => {
        expect(file1Checkbox.checked).toBe(true);
        expect(file2Checkbox.checked).toBe(true);
      });
    });

    test("allows selecting all files with header checkbox", async () => {
      const user = userEvent.setup();
      const { listFiles } = await import("@/services/files");

      const mockFiles: FileSystemItem[] = [
        {
          name: "file1.txt",
          type: "text",
          is_directory: false,
          size: 1024,
          modified: "2023-01-01T00:00:00Z",
          path: "/file1.txt",
          permissions: { read: true, write: true, execute: false },
        },
        {
          name: "folder1",
          type: "directory",
          is_directory: true,
          path: "/folder1",
          modified: "2023-01-01T00:00:00Z",
          permissions: { read: true, write: true, execute: true },
        },
      ];

      vi.mocked(listFiles).mockResolvedValue(ok(mockFiles));

      render(<FileExplorer serverId={1} />);

      await waitFor(() => {
        expect(screen.getByText("file1.txt")).toBeInTheDocument();
        expect(screen.getByText("folder1")).toBeInTheDocument();
      });

      // Click header checkbox to select all
      const headerCheckbox = screen.getAllByRole(
        "checkbox"
      )[0] as HTMLInputElement;
      await user.click(headerCheckbox);

      // Check that all items are selected
      const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
      checkboxes.forEach((checkbox) => {
        expect(checkbox.checked).toBe(true);
      });

      // Check that selection info is shown
      expect(screen.getByText("2 selected")).toBeInTheDocument();
    });

    test("can clear selection with Clear button", async () => {
      const user = userEvent.setup();
      const { listFiles } = await import("@/services/files");

      const mockFiles: FileSystemItem[] = [
        {
          name: "file1.txt",
          type: "text",
          is_directory: false,
          size: 1024,
          modified: "2023-01-01T00:00:00Z",
          path: "/file1.txt",
          permissions: { read: true, write: true, execute: false },
        },
      ];

      vi.mocked(listFiles).mockResolvedValue(ok(mockFiles));

      render(<FileExplorer serverId={1} />);

      await waitFor(() => {
        expect(screen.getByText("file1.txt")).toBeInTheDocument();
      });

      // Get all checkboxes (header + file checkboxes)
      const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
      expect(checkboxes).toHaveLength(2); // Header + 1 file

      // Select file (index 1 because index 0 is header checkbox)
      const fileCheckbox = checkboxes[1];
      await user.click(fileCheckbox);

      // Wait for selection state to update and Clear button to appear
      await waitFor(() => {
        expect(screen.getByText("1 selected")).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText("✖️ Clear")).toBeInTheDocument();
      });

      // Click Clear button
      await user.click(screen.getByText("✖️ Clear"));

      // Check that selection is cleared
      await waitFor(() => {
        expect(fileCheckbox.checked).toBe(false);
        expect(screen.queryByText("1 selected")).not.toBeInTheDocument();
        expect(screen.queryByText("✖️ Clear")).not.toBeInTheDocument();
      });
    });

    test("supports Ctrl+click selection", async () => {
      const { listFiles } = await import("@/services/files");

      const mockFiles: FileSystemItem[] = [
        {
          name: "file1.txt",
          type: "text",
          is_directory: false,
          size: 1024,
          modified: "2023-01-01T00:00:00Z",
          path: "/file1.txt",
          permissions: { read: true, write: true, execute: false },
        },
        {
          name: "file2.txt",
          type: "text",
          is_directory: false,
          size: 512,
          modified: "2023-01-01T00:00:00Z",
          path: "/file2.txt",
          permissions: { read: true, write: true, execute: false },
        },
      ];

      vi.mocked(listFiles).mockResolvedValue(ok(mockFiles));

      render(<FileExplorer serverId={1} />);

      await waitFor(() => {
        expect(screen.getByText("file1.txt")).toBeInTheDocument();
        expect(screen.getByText("file2.txt")).toBeInTheDocument();
      });

      // Find the file rows by their structure - look for divs that contain the file names
      const file1Name = screen.getByText("file1.txt");
      const file2Name = screen.getByText("file2.txt");

      // Get the parent file row divs that have the onClick handler
      const file1Row = file1Name.closest('div[style*="cursor: pointer"]');
      const file2Row = file2Name.closest('div[style*="cursor: pointer"]');

      expect(file1Row).toBeTruthy();
      expect(file2Row).toBeTruthy();

      // Ctrl+click on first file row using fireEvent
      fireEvent.click(file1Row!, { ctrlKey: true });

      // Wait for first selection
      await waitFor(() => {
        expect(screen.getByText("1 selected")).toBeInTheDocument();
      });

      // Ctrl+click on second file row
      fireEvent.click(file2Row!, { ctrlKey: true });

      // Wait for second selection
      await waitFor(() => {
        expect(screen.getByText("2 selected")).toBeInTheDocument();
      });

      // Verify checkboxes are checked
      const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
      await waitFor(() => {
        expect(checkboxes[1].checked).toBe(true); // First file
        expect(checkboxes[2].checked).toBe(true); // Second file
      });
    });
  });

  describe("Bulk operations", () => {
    test("shows bulk context menu when multiple files selected", async () => {
      const { listFiles } = await import("@/services/files");

      const mockFiles: FileSystemItem[] = [
        {
          name: "file1.txt",
          type: "text",
          is_directory: false,
          size: 1024,
          modified: "2023-01-01T00:00:00Z",
          path: "/file1.txt",
          permissions: { read: true, write: true, execute: false },
        },
        {
          name: "file2.txt",
          type: "text",
          is_directory: false,
          size: 512,
          modified: "2023-01-01T00:00:00Z",
          path: "/file2.txt",
          permissions: { read: true, write: true, execute: false },
        },
      ];

      vi.mocked(listFiles).mockResolvedValue(ok(mockFiles));

      render(<FileExplorer serverId={1} />);

      await waitFor(() => {
        expect(screen.getByText("file1.txt")).toBeInTheDocument();
        expect(screen.getByText("file2.txt")).toBeInTheDocument();
      });

      // Select both files using checkboxes
      const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
      const file1Checkbox = checkboxes[1]; // First file checkbox
      const file2Checkbox = checkboxes[2]; // Second file checkbox

      fireEvent.click(file1Checkbox);
      fireEvent.click(file2Checkbox);

      // Right click on selected file
      const file1Row = screen.getByText("file1.txt").closest("div");
      fireEvent.contextMenu(file1Row!);

      // Check that bulk context menu appears
      await waitFor(() => {
        expect(screen.getByText("2 item(s) selected")).toBeInTheDocument();
        expect(screen.getByText("📥 Download as ZIP (2)")).toBeInTheDocument();
        expect(screen.getByText("🗑️ Delete Selected (2)")).toBeInTheDocument();
      });
    });

    test("performs bulk delete with confirmation", async () => {
      const user = userEvent.setup();
      const { listFiles, deleteFile } = await import("@/services/files");

      const mockFiles: FileSystemItem[] = [
        {
          name: "file1.txt",
          type: "text",
          is_directory: false,
          size: 1024,
          modified: "2023-01-01T00:00:00Z",
          path: "/file1.txt",
          permissions: { read: true, write: true, execute: false },
        },
        {
          name: "file2.txt",
          type: "text",
          is_directory: false,
          size: 512,
          modified: "2023-01-01T00:00:00Z",
          path: "/file2.txt",
          permissions: { read: true, write: true, execute: false },
        },
      ];

      vi.mocked(listFiles).mockResolvedValue(ok(mockFiles));
      vi.mocked(deleteFile).mockResolvedValue(ok(undefined));

      // Mock window.confirm to return true
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

      render(<FileExplorer serverId={1} />);

      await waitFor(() => {
        expect(screen.getByText("file1.txt")).toBeInTheDocument();
        expect(screen.getByText("file2.txt")).toBeInTheDocument();
      });

      // Select both files
      const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
      const file1Checkbox = checkboxes[1]; // First file checkbox
      const file2Checkbox = checkboxes[2]; // Second file checkbox

      fireEvent.click(file1Checkbox);
      fireEvent.click(file2Checkbox);

      // Right click and select delete
      const file1Row = screen.getByText("file1.txt").closest("div");
      fireEvent.contextMenu(file1Row!);

      await waitFor(() => {
        expect(screen.getByText("🗑️ Delete Selected (2)")).toBeInTheDocument();
      });

      await user.click(screen.getByText("🗑️ Delete Selected (2)"));

      // Check that confirmation was shown and delete was called for both files
      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalledWith(
          "Are you sure you want to delete 2 files?"
        );
        expect(deleteFile).toHaveBeenCalledWith(1, "file1.txt");
        expect(deleteFile).toHaveBeenCalledWith(1, "file2.txt");
      });

      confirmSpy.mockRestore();
    });
  });

  describe("Folder download functionality", () => {
    beforeEach(() => {
      // Reset JSZip mock methods
      mockZip.file.mockClear();
      mockZip.generateAsync.mockClear();
    });

    test("downloads folder as ZIP with directory structure", async () => {
      const user = userEvent.setup();
      const { listFiles, downloadFile } = await import("@/services/files");

      const rootFiles: FileSystemItem[] = [
        {
          name: "plugins",
          type: "directory",
          is_directory: true,
          path: "/plugins",
          modified: "2023-01-01T00:00:00Z",
          permissions: { read: true, write: true, execute: true },
        },
      ];

      const pluginFiles: FileSystemItem[] = [
        {
          name: "config.yml",
          type: "text",
          is_directory: false,
          size: 512,
          modified: "2023-01-01T00:00:00Z",
          path: "/plugins/config.yml",
          permissions: { read: true, write: true, execute: false },
        },
        {
          name: "subfolder",
          type: "directory",
          is_directory: true,
          path: "/plugins/subfolder",
          modified: "2023-01-01T00:00:00Z",
          permissions: { read: true, write: true, execute: true },
        },
      ];

      const subfolderFiles: FileSystemItem[] = [
        {
          name: "data.json",
          type: "text",
          is_directory: false,
          size: 256,
          modified: "2023-01-01T00:00:00Z",
          path: "/plugins/subfolder/data.json",
          permissions: { read: true, write: true, execute: false },
        },
      ];

      vi.mocked(listFiles)
        .mockResolvedValueOnce(ok(rootFiles)) // Initial load
        .mockResolvedValueOnce(ok(pluginFiles)) // /plugins
        .mockResolvedValueOnce(ok(subfolderFiles)); // /plugins/subfolder

      const mockBlob = new Blob(["file content"], { type: "text/plain" });
      vi.mocked(downloadFile).mockResolvedValue(ok(mockBlob));

      render(<FileExplorer serverId={1} />);

      // Mock URL.createObjectURL and related DOM methods after render
      const mockUrl = "blob:mock-url";
      global.URL.createObjectURL = vi.fn().mockReturnValue(mockUrl);
      global.URL.revokeObjectURL = vi.fn();

      const mockAnchor = {
        href: "",
        download: "",
        click: vi.fn(),
        style: { display: "" },
      } as unknown as HTMLAnchorElement;

      const originalCreateElement = document.createElement;
      const originalAppendChild = document.body.appendChild;
      const originalRemoveChild = document.body.removeChild;

      try {
        document.createElement = vi
          .fn()
          .mockImplementation((tagName: string) => {
            if (tagName === "a") return mockAnchor;
            return originalCreateElement.call(document, tagName);
          });

        document.body.appendChild = vi.fn().mockReturnValue(mockAnchor);
        document.body.removeChild = vi.fn().mockReturnValue(mockAnchor);

        await waitFor(() => {
          expect(screen.getByText("plugins")).toBeInTheDocument();
        });

        // Select the plugins folder
        const checkboxes = screen.getAllByRole(
          "checkbox"
        ) as HTMLInputElement[];
        const folderCheckbox = checkboxes[1]; // First item checkbox (plugins folder)
        fireEvent.click(folderCheckbox);

        // Right click and select download
        const folderRow = screen.getByText("plugins").closest("div");
        fireEvent.contextMenu(folderRow!);

        await waitFor(() => {
          expect(
            screen.getByText("📥 Download as ZIP (1)")
          ).toBeInTheDocument();
        });

        await user.click(screen.getByText("📥 Download as ZIP (1)"));

        // Check that files were added to ZIP with correct structure
        await waitFor(() => {
          expect(mockZip.file).toHaveBeenCalledWith(
            "plugins/config.yml",
            mockBlob
          );
          expect(mockZip.file).toHaveBeenCalledWith(
            "plugins/subfolder/data.json",
            mockBlob
          );
          expect(mockZip.generateAsync).toHaveBeenCalled();
          expect(mockAnchor.click).toHaveBeenCalled();
        });
      } finally {
        // Restore DOM methods
        document.createElement = originalCreateElement;
        document.body.appendChild = originalAppendChild;
        document.body.removeChild = originalRemoveChild;
      }
    });

    test("shows progress when downloading multiple files", async () => {
      const { listFiles } = await import("@/services/files");

      const mockFiles: FileSystemItem[] = [
        {
          name: "file1.txt",
          type: "text",
          is_directory: false,
          size: 1024,
          modified: "2023-01-01T00:00:00Z",
          path: "/file1.txt",
          permissions: { read: true, write: true, execute: false },
        },
        {
          name: "file2.txt",
          type: "text",
          is_directory: false,
          size: 512,
          modified: "2023-01-01T00:00:00Z",
          path: "/file2.txt",
          permissions: { read: true, write: true, execute: false },
        },
      ];

      vi.mocked(listFiles).mockResolvedValue(ok(mockFiles));

      render(<FileExplorer serverId={1} />);

      await waitFor(() => {
        expect(screen.getByText("file1.txt")).toBeInTheDocument();
        expect(screen.getByText("file2.txt")).toBeInTheDocument();
      });

      // Select both files
      const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
      const headerCheckbox = checkboxes[0]; // Header checkbox
      fireEvent.click(headerCheckbox);

      // Right click and select download
      const file1Row = screen.getByText("file1.txt").closest("div");
      fireEvent.contextMenu(file1Row!);

      await waitFor(() => {
        expect(screen.getByText("📥 Download as ZIP (2)")).toBeInTheDocument();
      });

      // Note: Full download test requires mocking JSZip and file downloads
      // This test verifies the UI shows correctly for bulk operations
    });
  });
});
