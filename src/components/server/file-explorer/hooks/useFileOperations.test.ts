import { renderHook, act } from "@testing-library/react";
import { vi, beforeEach } from "vitest";
import { ok, err } from "neverthrow";
import { useFileOperations } from "./useFileOperations";
import type { FileSystemItem } from "@/types/files";
import * as fileService from "@/services/files";

// Mock file service
vi.mock("@/services/files", () => ({
  renameFile: vi.fn(),
  deleteFile: vi.fn(),
  downloadFile: vi.fn(),
  downloadAsZip: vi.fn(),
}));

const mockRenameFile = vi.mocked(fileService.renameFile);
const mockDeleteFile = vi.mocked(fileService.deleteFile);
const mockDownloadFile = vi.mocked(fileService.downloadFile);
const mockDownloadAsZip = vi.mocked(fileService.downloadAsZip);

describe("useFileOperations", () => {
  const mockServerId = 1;
  const mockFiles: FileSystemItem[] = [
    {
      name: "file1.txt",
      type: "text",
      is_directory: false,
      size: 100,
      modified: "2023-01-01T00:00:00Z",
      permissions: {},
      path: "/file1.txt",
    },
    {
      name: "file2.txt",
      type: "text",
      is_directory: false,
      size: 200,
      modified: "2023-01-01T01:00:00Z",
      permissions: {},
      path: "/file2.txt",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock URL methods for DOM tests
    Object.defineProperty(global, "URL", {
      value: {
        createObjectURL: vi.fn().mockReturnValue("blob:mock-url"),
        revokeObjectURL: vi.fn(),
      },
      writable: true,
    });
  });

  describe("Initialization", () => {
    it("should initialize with correct default values", () => {
      const { result } = renderHook(() => useFileOperations(mockServerId));

      expect(result.current.selectedFiles).toEqual(new Set());
      expect(result.current.renamingFile).toBe(null);
      expect(result.current.newName).toBe("");
      expect(result.current.isRenaming).toBe(false);
    });
  });

  describe("File Selection", () => {
    it("should toggle file selection", () => {
      const { result } = renderHook(() => useFileOperations(mockServerId));

      act(() => {
        result.current.toggleFileSelection("file1.txt");
      });

      expect(result.current.selectedFiles.has("file1.txt")).toBe(true);

      act(() => {
        result.current.toggleFileSelection("file1.txt");
      });

      expect(result.current.selectedFiles.has("file1.txt")).toBe(false);
    });

    it("should select all files", () => {
      const { result } = renderHook(() => useFileOperations(mockServerId));

      act(() => {
        result.current.selectAllFiles(mockFiles);
      });

      expect(result.current.selectedFiles.size).toBe(mockFiles.length);
      mockFiles.forEach((file) => {
        expect(result.current.selectedFiles.has(file.name)).toBe(true);
      });
    });

    it("should clear all selections", () => {
      const { result } = renderHook(() => useFileOperations(mockServerId));

      act(() => {
        result.current.selectAllFiles(mockFiles);
      });

      expect(result.current.selectedFiles.size).toBe(mockFiles.length);

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedFiles.size).toBe(0);
    });
  });

  describe("Rename Operations", () => {
    it("should start rename operation", () => {
      const { result } = renderHook(() => useFileOperations(mockServerId));
      const file = mockFiles[0]!; // Assert not undefined

      act(() => {
        result.current.startRename(file);
      });

      expect(result.current.renamingFile).toBe(file);
      expect(result.current.newName).toBe(file.name);
    });

    it("should cancel rename operation", () => {
      const { result } = renderHook(() => useFileOperations(mockServerId));
      const file = mockFiles[0]!; // Assert not undefined

      act(() => {
        result.current.startRename(file);
      });

      act(() => {
        result.current.cancelRename();
      });

      expect(result.current.renamingFile).toBe(null);
      expect(result.current.newName).toBe("");
      expect(result.current.isRenaming).toBe(false);
    });
  });

  describe("State Management", () => {
    it("should allow setting new name during rename", () => {
      const { result } = renderHook(() => useFileOperations(mockServerId));
      const newName = "renamed-file.txt";

      act(() => {
        result.current.setNewName(newName);
      });

      expect(result.current.newName).toBe(newName);
    });
  });

  describe("Confirm Rename Operations", () => {
    it("should successfully confirm rename operation", async () => {
      mockRenameFile.mockResolvedValue(
        ok({ success: true, message: "File renamed successfully" })
      );

      const { result } = renderHook(() => useFileOperations(mockServerId));
      const file = mockFiles[0]!;

      act(() => {
        result.current.startRename(file);
        result.current.setNewName("new-name.txt");
      });

      let renameResult: unknown;
      await act(async () => {
        renameResult = await result.current.confirmRename("/test");
      });

      expect(renameResult.isOk()).toBe(true);
      expect(mockRenameFile).toHaveBeenCalledWith(
        mockServerId,
        "/test/file1.txt",
        "/test/new-name.txt"
      );
      expect(result.current.renamingFile).toBe(null);
      expect(result.current.newName).toBe("");
      expect(result.current.isRenaming).toBe(false);
    });

    it("should handle rename operation in root directory", async () => {
      mockRenameFile.mockResolvedValue(
        ok({ success: true, message: "File renamed successfully" })
      );

      const { result } = renderHook(() => useFileOperations(mockServerId));
      const file = mockFiles[0]!;

      act(() => {
        result.current.startRename(file);
        result.current.setNewName("new-name.txt");
      });

      await act(async () => {
        await result.current.confirmRename("/");
      });

      expect(mockRenameFile).toHaveBeenCalledWith(
        mockServerId,
        "file1.txt",
        "new-name.txt"
      );
    });

    it("should handle rename failure", async () => {
      const errorMessage = "Rename failed";
      mockRenameFile.mockResolvedValue(
        err({ status: 500, message: errorMessage, details: "Server error" })
      );

      const { result } = renderHook(() => useFileOperations(mockServerId));
      const file = mockFiles[0]!;

      act(() => {
        result.current.startRename(file);
        result.current.setNewName("new-name.txt");
      });

      let renameResult: unknown;
      await act(async () => {
        renameResult = await result.current.confirmRename("/test");
      });

      expect(renameResult.isErr()).toBe(true);
      if (renameResult.isErr()) {
        expect(renameResult.error).toBe(errorMessage);
      }
      expect(result.current.isRenaming).toBe(false);
    });

    it("should reject rename with invalid parameters", async () => {
      const { result } = renderHook(() => useFileOperations(mockServerId));

      let renameResult: unknown;
      await act(async () => {
        renameResult = await result.current.confirmRename("/test");
      });

      expect(renameResult.isErr()).toBe(true);
      if (renameResult.isErr()) {
        expect(renameResult.error).toBe("Invalid rename parameters");
      }
    });

    it("should reject rename with empty name", async () => {
      const { result } = renderHook(() => useFileOperations(mockServerId));
      const file = mockFiles[0]!;

      act(() => {
        result.current.startRename(file);
        result.current.setNewName("   ");
      });

      let renameResult: unknown;
      await act(async () => {
        renameResult = await result.current.confirmRename("/test");
      });

      expect(renameResult.isErr()).toBe(true);
      if (renameResult.isErr()) {
        expect(renameResult.error).toBe("Invalid rename parameters");
      }
    });

    it("should reject rename with same name", async () => {
      const { result } = renderHook(() => useFileOperations(mockServerId));
      const file = mockFiles[0]!;

      act(() => {
        result.current.startRename(file);
        // Don't change the name - keep it same as original
      });

      let renameResult: unknown;
      await act(async () => {
        renameResult = await result.current.confirmRename("/test");
      });

      expect(renameResult.isErr()).toBe(true);
      if (renameResult.isErr()) {
        expect(renameResult.error).toBe("Invalid rename parameters");
      }
    });
  });

  describe("Delete Operations", () => {
    it("should delete single file successfully", async () => {
      mockDeleteFile.mockResolvedValue(
        ok({ success: true, message: "File deleted" })
      );

      const { result } = renderHook(() => useFileOperations(mockServerId));
      const file = mockFiles[0]!;

      let deleteResult: unknown;
      await act(async () => {
        deleteResult = await result.current.deleteFile(file, "/test");
      });

      expect(deleteResult.isOk()).toBe(true);
      expect(mockDeleteFile).toHaveBeenCalledWith(
        mockServerId,
        "/test/file1.txt"
      );
    });

    it("should delete single file in root directory", async () => {
      mockDeleteFile.mockResolvedValue(
        ok({ success: true, message: "File deleted" })
      );

      const { result } = renderHook(() => useFileOperations(mockServerId));
      const file = mockFiles[0]!;

      await act(async () => {
        await result.current.deleteFile(file, "/");
      });

      expect(mockDeleteFile).toHaveBeenCalledWith(mockServerId, "file1.txt");
    });

    it("should handle single file delete failure", async () => {
      const errorMessage = "Delete failed";
      mockDeleteFile.mockResolvedValue(
        err({ status: 500, message: errorMessage, details: "Server error" })
      );

      const { result } = renderHook(() => useFileOperations(mockServerId));
      const file = mockFiles[0]!;

      let deleteResult: unknown;
      await act(async () => {
        deleteResult = await result.current.deleteFile(file, "/test");
      });

      expect(deleteResult.isErr()).toBe(true);
      if (deleteResult.isErr()) {
        expect(deleteResult.error.message).toBe(errorMessage);
      }
    });

    it("should delete multiple files successfully", async () => {
      mockDeleteFile.mockResolvedValue(
        ok({ success: true, message: "File deleted" })
      );

      const { result } = renderHook(() => useFileOperations(mockServerId));

      // Select both files
      act(() => {
        result.current.toggleFileSelection("file1.txt");
        result.current.toggleFileSelection("file2.txt");
      });

      let deleteResult: unknown;
      await act(async () => {
        deleteResult = await result.current.deleteBulkFiles(mockFiles, "/test");
      });

      expect(deleteResult.isOk()).toBe(true);
      if (deleteResult.isOk()) {
        expect(deleteResult.value.successCount).toBe(2);
        expect(deleteResult.value.failCount).toBe(0);
        expect(deleteResult.value.deletedFileNames).toEqual([
          "file1.txt",
          "file2.txt",
        ]);
      }

      // Files should be deselected after successful deletion
      expect(result.current.selectedFiles.size).toBe(0);
    });

    it("should handle partial failure in bulk delete", async () => {
      mockDeleteFile
        .mockResolvedValueOnce(ok({ success: true, message: "File deleted" }))
        .mockResolvedValueOnce(
          err({
            status: 500,
            message: "Delete failed",
            details: "Server error",
          })
        );

      const { result } = renderHook(() => useFileOperations(mockServerId));

      // Select both files
      act(() => {
        result.current.toggleFileSelection("file1.txt");
        result.current.toggleFileSelection("file2.txt");
      });

      let deleteResult: unknown;
      await act(async () => {
        deleteResult = await result.current.deleteBulkFiles(mockFiles, "/test");
      });

      expect(deleteResult.isOk()).toBe(true);
      if (deleteResult.isOk()) {
        expect(deleteResult.value.successCount).toBe(1);
        expect(deleteResult.value.failCount).toBe(1);
        expect(deleteResult.value.deletedFileNames).toEqual(["file1.txt"]);
      }

      // Only successfully deleted file should be deselected
      expect(result.current.selectedFiles.has("file1.txt")).toBe(false);
      expect(result.current.selectedFiles.has("file2.txt")).toBe(true);
    });
  });

  describe("Download Operations", () => {
    it("should download single file successfully", async () => {
      const mockBlob = new Blob(["file content"], { type: "text/plain" });
      mockDownloadFile.mockResolvedValue(ok(mockBlob));

      const { result } = renderHook(() => useFileOperations(mockServerId));
      const file = mockFiles[0]!;

      let downloadResult: unknown;
      await act(async () => {
        downloadResult = await result.current.downloadFile(file, "/test");
      });

      expect(downloadResult.isOk()).toBe(true);
      expect(mockDownloadFile).toHaveBeenCalledWith(
        mockServerId,
        "/test/file1.txt"
      );
    });

    it("should download single file in root directory", async () => {
      const mockBlob = new Blob(["file content"], { type: "text/plain" });
      mockDownloadFile.mockResolvedValue(ok(mockBlob));

      const { result } = renderHook(() => useFileOperations(mockServerId));
      const file = mockFiles[0]!;

      await act(async () => {
        await result.current.downloadFile(file, "/");
      });

      expect(mockDownloadFile).toHaveBeenCalledWith(mockServerId, "file1.txt");
    });

    it("should reject download for directory", async () => {
      const { result } = renderHook(() => useFileOperations(mockServerId));
      const directoryFile: FileSystemItem = {
        name: "test-dir",
        type: "directory",
        is_directory: true,
        size: 0,
        modified: "2023-01-01T00:00:00Z",
        permissions: {},
        path: "/test-dir",
      };

      let downloadResult: unknown;
      await act(async () => {
        downloadResult = await result.current.downloadFile(
          directoryFile,
          "/test"
        );
      });

      expect(downloadResult.isErr()).toBe(true);
      if (downloadResult.isErr()) {
        expect(downloadResult.error.message).toBe("Cannot download directory");
      }
    });

    it("should handle single file download failure", async () => {
      const errorMessage = "Download failed";
      mockDownloadFile.mockResolvedValue(
        err({ status: 500, message: errorMessage, details: "Server error" })
      );

      const { result } = renderHook(() => useFileOperations(mockServerId));
      const file = mockFiles[0]!;

      let downloadResult: unknown;
      await act(async () => {
        downloadResult = await result.current.downloadFile(file, "/test");
      });

      expect(downloadResult.isErr()).toBe(true);
      if (downloadResult.isErr()) {
        expect(downloadResult.error.message).toBe(errorMessage);
      }
    });

    it("should download multiple files as ZIP successfully", async () => {
      const mockBlob = new Blob(["zip content"], { type: "application/zip" });
      mockDownloadAsZip.mockResolvedValue(
        ok({ blob: mockBlob, filename: "files.zip" })
      );

      const { result } = renderHook(() => useFileOperations(mockServerId));

      // Select files
      act(() => {
        result.current.toggleFileSelection("file1.txt");
        result.current.toggleFileSelection("file2.txt");
      });

      let downloadResult: unknown;
      await act(async () => {
        downloadResult = await result.current.downloadBulkFiles(
          mockFiles,
          "/test"
        );
      });

      expect(downloadResult.isOk()).toBe(true);
      if (downloadResult.isOk()) {
        expect(downloadResult.value.filename).toBe("files.zip");
        expect(downloadResult.value.fileCount).toBe(2);
      }

      expect(mockDownloadAsZip).toHaveBeenCalledWith(
        mockServerId,
        mockFiles,
        "/test",
        undefined
      );
    });

    it("should handle bulk download with no files selected", async () => {
      const { result } = renderHook(() => useFileOperations(mockServerId));

      let downloadResult: unknown;
      await act(async () => {
        downloadResult = await result.current.downloadBulkFiles(
          mockFiles,
          "/test"
        );
      });

      expect(downloadResult.isErr()).toBe(true);
      if (downloadResult.isErr()) {
        expect(downloadResult.error).toBe("No files selected for download");
      }
    });

    it("should handle bulk download failure", async () => {
      const errorMessage = "ZIP creation failed";
      mockDownloadAsZip.mockResolvedValue(
        err({ status: 500, message: errorMessage, details: "Server error" })
      );

      const { result } = renderHook(() => useFileOperations(mockServerId));

      // Select files
      act(() => {
        result.current.toggleFileSelection("file1.txt");
      });

      let downloadResult: unknown;
      await act(async () => {
        downloadResult = await result.current.downloadBulkFiles(
          mockFiles,
          "/test"
        );
      });

      expect(downloadResult.isErr()).toBe(true);
      if (downloadResult.isErr()) {
        expect(downloadResult.error).toBe(errorMessage);
      }
    });

    it("should call progress callback during bulk download", async () => {
      const mockBlob = new Blob(["zip content"], { type: "application/zip" });
      mockDownloadAsZip.mockResolvedValue(
        ok({ blob: mockBlob, filename: "files.zip" })
      );

      const { result } = renderHook(() => useFileOperations(mockServerId));
      const mockProgressCallback = vi.fn();

      // Select files
      act(() => {
        result.current.toggleFileSelection("file1.txt");
      });

      await act(async () => {
        await result.current.downloadBulkFiles(
          mockFiles,
          "/test",
          mockProgressCallback
        );
      });

      expect(mockDownloadAsZip).toHaveBeenCalledWith(
        mockServerId,
        [mockFiles[0]],
        "/test",
        mockProgressCallback
      );
    });
  });
});
