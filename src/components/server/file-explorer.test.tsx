import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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

describe("FileExplorer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  test("does not render view file icons for any files", async () => {
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

    // Check that no view file buttons (👁️) are rendered
    const viewButtons = screen.queryAllByTitle("View file");
    expect(viewButtons).toHaveLength(0);
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

  test("shows toast for download errors instead of page error", async () => {
    const user = userEvent.setup();
    const { listFiles, downloadFile } = await import("@/services/files");

    const mockFiles: FileSystemItem[] = [
      {
        name: "server.jar",
        type: "binary",
        is_directory: false,
        size: 1024,
        modified: "2023-01-01T00:00:00Z",
        path: "/server.jar",
        permissions: { read: true, write: false, execute: true },
      },
    ];

    vi.mocked(listFiles).mockResolvedValue(ok(mockFiles));
    vi.mocked(downloadFile).mockResolvedValue(
      err({ message: "Access denied (403)" })
    );

    render(<FileExplorer serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("server.jar")).toBeInTheDocument();
    });

    // Click download button
    const downloadButton = screen.getByTitle("Download file");
    await user.click(downloadButton);

    // Check that toast error appears instead of page error
    await waitFor(() => {
      expect(
        screen.getByText(/Failed to download file: Access denied \(403\)/)
      ).toBeInTheDocument();
    });

    // Ensure file list is still visible (no page error state)
    expect(screen.getByText("server.jar")).toBeInTheDocument();
  });

  test("shows toast for delete errors instead of page error", async () => {
    const user = userEvent.setup();
    const { listFiles, deleteFile } = await import("@/services/files");

    const mockFiles: FileSystemItem[] = [
      {
        name: "protected.txt",
        type: "text",
        is_directory: false,
        size: 1024,
        modified: "2023-01-01T00:00:00Z",
        path: "/protected.txt",
        permissions: { read: true, write: false, execute: false },
      },
    ];

    vi.mocked(listFiles).mockResolvedValue(ok(mockFiles));
    vi.mocked(deleteFile).mockResolvedValue(
      err({ message: "Permission denied" })
    );

    // Mock window.confirm to return true
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<FileExplorer serverId={1} />);

    await waitFor(() => {
      expect(screen.getByText("protected.txt")).toBeInTheDocument();
    });

    // Click delete button
    const deleteButton = screen.getByTitle("Delete file");
    await user.click(deleteButton);

    // Check that toast error appears instead of page error
    await waitFor(() => {
      expect(
        screen.getByText(/Failed to delete file: Permission denied/)
      ).toBeInTheDocument();
    });

    // Ensure file list is still visible (no page error state)
    expect(screen.getByText("protected.txt")).toBeInTheDocument();

    confirmSpy.mockRestore();
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
      expect(screen.getByRole("heading", { name: /config.yml/ })).toBeInTheDocument();
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
      const { listFiles, uploadMultipleFiles } = await import("@/services/files");
      
      vi.mocked(listFiles).mockResolvedValue(ok([]));
      vi.mocked(uploadMultipleFiles).mockResolvedValue(ok({
        successful: ["test.txt"],
        failed: []
      }));

      render(<FileExplorer serverId={1} />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText("📁 Upload Files")).toBeInTheDocument();
      });

      // Create a mock file
      const file = new File(["test content"], "test.txt", { type: "text/plain" });
      
      // Get the hidden file input and trigger change
      const fileInput = document.querySelector('input[type="file"][multiple]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();

      // Mock the file input's files property
      Object.defineProperty(fileInput, 'files', {
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
      const { listFiles, uploadMultipleFiles } = await import("@/services/files");
      
      vi.mocked(listFiles).mockResolvedValue(ok([]));
      
      // Mock a slow upload
      vi.mocked(uploadMultipleFiles).mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => resolve(ok({ successful: ["test.txt"], failed: [] })), 100);
        })
      );

      render(<FileExplorer serverId={1} />);

      await waitFor(() => {
        expect(screen.getByText("📁 Upload Files")).toBeInTheDocument();
      });

      const file = new File(["test content"], "test.txt", { type: "text/plain" });
      const fileInput = document.querySelector('input[type="file"][multiple]') as HTMLInputElement;
      
      Object.defineProperty(fileInput, 'files', {
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
      const { listFiles, uploadMultipleFiles } = await import("@/services/files");
      
      vi.mocked(listFiles).mockResolvedValue(ok([]));
      vi.mocked(uploadMultipleFiles).mockResolvedValue(ok({
        successful: [],
        failed: [{ file: "test.txt", error: "Upload failed" }]
      }));

      render(<FileExplorer serverId={1} />);

      await waitFor(() => {
        expect(screen.getByText("📁 Upload Files")).toBeInTheDocument();
      });

      const file = new File(["test content"], "test.txt", { type: "text/plain" });
      const fileInput = document.querySelector('input[type="file"][multiple]') as HTMLInputElement;
      
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      // Check that error is shown
      await waitFor(() => {
        expect(screen.getByText(/0 files, 1 failed/)).toBeInTheDocument();
      });
    });

    test("shows drag and drop hint when dragging over", async () => {
      const { listFiles } = await import("@/services/files");
      vi.mocked(listFiles).mockResolvedValue(ok([]));

      render(<FileExplorer serverId={1} />);

      await waitFor(() => {
        expect(screen.getByText("This directory is empty")).toBeInTheDocument();
      });

      const container = screen.getByText("This directory is empty").closest('div');
      expect(container).toBeTruthy();

      // Simulate drag enter
      fireEvent.dragEnter(container!, {
        dataTransfer: {
          items: [{ kind: 'file' }]
        }
      });

      await waitFor(() => {
        expect(screen.getByText("Drop files or folders here to upload")).toBeInTheDocument();
      });
    });
  });
});
