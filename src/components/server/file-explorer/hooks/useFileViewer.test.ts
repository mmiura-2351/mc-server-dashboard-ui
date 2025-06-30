import { renderHook, act } from "@testing-library/react";
import { vi, beforeEach } from "vitest";
import { ok, err } from "neverthrow";
import { useFileViewer } from "./useFileViewer";
import * as fileService from "@/services/files";
import type { FileSystemItem } from "@/types/files";

// Mock file service
vi.mock("@/services/files", () => ({
  readTextFile: vi.fn(),
  writeFile: vi.fn(),
  downloadFile: vi.fn(),
}));

const mockReadTextFile = vi.mocked(fileService.readTextFile);
const mockWriteFile = vi.mocked(fileService.writeFile);
const mockDownloadFile = vi.mocked(fileService.downloadFile);

describe("useFileViewer", () => {
  const mockServerId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize with correct default values", () => {
      const { result } = renderHook(() => useFileViewer(mockServerId));

      expect(result.current.selectedFile).toBe(null);
      expect(result.current.showFileViewer).toBe(false);
      expect(result.current.fileContent).toBe("");
      expect(result.current.imageUrl).toBe("");
      expect(result.current.isLoadingFile).toBe(false);
      expect(result.current.isEditing).toBe(false);
      expect(result.current.editedContent).toBe("");
      expect(result.current.isSaving).toBe(false);
    });
  });

  describe("File Type Detection", () => {
    it("should detect image files correctly", () => {
      const { result } = renderHook(() => useFileViewer(mockServerId));

      expect(result.current.isImageFile("image.png")).toBe(true);
      expect(result.current.isImageFile("photo.jpg")).toBe(true);
      expect(result.current.isImageFile("icon.svg")).toBe(true);
      expect(result.current.isImageFile("doc.pdf")).toBe(false);
    });

    it("should detect text files correctly", () => {
      const { result } = renderHook(() => useFileViewer(mockServerId));

      expect(result.current.isTextFile("config.txt")).toBe(true);
      expect(result.current.isTextFile("settings.json")).toBe(true);
      expect(result.current.isTextFile("readme.md")).toBe(true);
      expect(result.current.isTextFile("image.png")).toBe(false);
    });

    it("should detect viewable files correctly", () => {
      const { result } = renderHook(() => useFileViewer(mockServerId));

      expect(result.current.isFileViewable("test.txt")).toBe(true);
      expect(result.current.isFileViewable("image.png")).toBe(true);
      expect(result.current.isFileViewable("data.zip")).toBe(false);
    });

    it("should handle case insensitive extensions", () => {
      const { result } = renderHook(() => useFileViewer(mockServerId));

      expect(result.current.isImageFile("IMAGE.PNG")).toBe(true);
      expect(result.current.isTextFile("CONFIG.TXT")).toBe(true);
    });
  });

  describe("File Editing", () => {
    it("should start editing mode", () => {
      const { result } = renderHook(() => useFileViewer(mockServerId));

      act(() => {
        result.current.startEdit();
      });

      expect(result.current.isEditing).toBe(true);
    });

    it("should cancel editing mode", () => {
      const { result } = renderHook(() => useFileViewer(mockServerId));

      act(() => {
        result.current.startEdit();
        result.current.setEditedContent("modified content");
      });

      act(() => {
        result.current.cancelEdit();
      });

      expect(result.current.isEditing).toBe(false);
      expect(result.current.editedContent).toBe("");
    });

    it("should update edited content", () => {
      const { result } = renderHook(() => useFileViewer(mockServerId));

      act(() => {
        result.current.setEditedContent("new content");
      });

      expect(result.current.editedContent).toBe("new content");
    });
  });

  describe("Utility Functions", () => {
    it("should provide access to utility functions", () => {
      const { result } = renderHook(() => useFileViewer(mockServerId));

      expect(typeof result.current.openFileViewer).toBe("function");
      expect(typeof result.current.closeFileViewer).toBe("function");
      expect(typeof result.current.startEdit).toBe("function");
      expect(typeof result.current.cancelEdit).toBe("function");
      expect(typeof result.current.saveFile).toBe("function");
      expect(typeof result.current.downloadCurrentFile).toBe("function");
    });
  });

  describe("File Operations", () => {
    const mockTextFile: FileSystemItem = {
      name: "config.txt",
      type: "text",
      is_directory: false,
      size: 100,
      modified: "2023-01-01T00:00:00Z",
      permissions: {},
      path: "/config.txt",
    };

    const mockImageFile: FileSystemItem = {
      name: "image.png",
      type: "binary" as any,
      is_directory: false,
      size: 500,
      modified: "2023-01-01T00:00:00Z",
      permissions: {},
      path: "/image.png",
    };

    beforeEach(() => {
      // Mock URL methods for DOM tests
      Object.defineProperty(global, "URL", {
        value: {
          createObjectURL: vi.fn().mockReturnValue("blob:mock-url"),
          revokeObjectURL: vi.fn(),
        },
        writable: true,
      });
    });

    describe("openFileViewer", () => {
      it("should not open viewer for non-viewable files", async () => {
        const { result } = renderHook(() => useFileViewer(mockServerId));
        const nonViewableFile: FileSystemItem = {
          name: "data.zip",
          type: "binary" as any,
          is_directory: false,
          size: 1000,
          modified: "2023-01-01T00:00:00Z",
          permissions: {},
          path: "/data.zip",
        };

        await act(async () => {
          await result.current.openFileViewer(nonViewableFile, "/");
        });

        expect(result.current.showFileViewer).toBe(false);
        expect(result.current.selectedFile).toBe(null);
      });

      it("should open text file successfully", async () => {
        const mockContent = "This is file content";
        mockReadTextFile.mockResolvedValue(ok({ content: mockContent } as any));

        const { result } = renderHook(() => useFileViewer(mockServerId));

        await act(async () => {
          await result.current.openFileViewer(mockTextFile, "/test");
        });

        expect(result.current.showFileViewer).toBe(true);
        expect(result.current.selectedFile).toEqual(mockTextFile);
        expect(result.current.fileContent).toBe(mockContent);
        expect(result.current.isLoadingFile).toBe(false);
        expect(mockReadTextFile).toHaveBeenCalledWith(
          mockServerId,
          "/test/config.txt"
        );
      });

      it("should open text file in root directory", async () => {
        const mockContent = "Root file content";
        mockReadTextFile.mockResolvedValue(ok({ content: mockContent } as any));

        const { result } = renderHook(() => useFileViewer(mockServerId));

        await act(async () => {
          await result.current.openFileViewer(mockTextFile, "/");
        });

        expect(mockReadTextFile).toHaveBeenCalledWith(
          mockServerId,
          "config.txt"
        );
      });

      it("should handle text file read error gracefully", async () => {
        mockReadTextFile.mockResolvedValue(
          err({
            status: 404,
            message: "File not found",
            details: "File does not exist",
          })
        );

        const { result } = renderHook(() => useFileViewer(mockServerId));

        await act(async () => {
          await result.current.openFileViewer(mockTextFile, "/test");
        });

        expect(result.current.showFileViewer).toBe(true);
        expect(result.current.selectedFile).toEqual(mockTextFile);
        expect(result.current.fileContent).toBe("");
        expect(result.current.isLoadingFile).toBe(false);
      });

      it("should open image file successfully", async () => {
        const mockBlob = new Blob(["image data"], { type: "image/png" });
        mockDownloadFile.mockResolvedValue(ok(mockBlob));

        const { result } = renderHook(() => useFileViewer(mockServerId));

        await act(async () => {
          await result.current.openFileViewer(mockImageFile, "/images");
        });

        expect(result.current.showFileViewer).toBe(true);
        expect(result.current.selectedFile).toEqual(mockImageFile);
        expect(result.current.imageUrl).toBe("blob:mock-url");
        expect(result.current.isLoadingFile).toBe(false);
        expect(mockDownloadFile).toHaveBeenCalledWith(
          mockServerId,
          "/images/image.png"
        );
      });

      it("should handle image file download error gracefully", async () => {
        mockDownloadFile.mockResolvedValue(
          err({
            status: 404,
            message: "Image not found",
            details: "Image does not exist",
          })
        );

        const { result } = renderHook(() => useFileViewer(mockServerId));

        await act(async () => {
          await result.current.openFileViewer(mockImageFile, "/images");
        });

        expect(result.current.showFileViewer).toBe(true);
        expect(result.current.selectedFile).toEqual(mockImageFile);
        expect(result.current.imageUrl).toBe("");
        expect(result.current.isLoadingFile).toBe(false);
      });

      it("should handle unexpected errors gracefully", async () => {
        mockReadTextFile.mockImplementation(() => {
          throw new Error("Unexpected error");
        });

        const { result } = renderHook(() => useFileViewer(mockServerId));

        await act(async () => {
          await result.current.openFileViewer(mockTextFile, "/test");
        });

        expect(result.current.showFileViewer).toBe(true);
        expect(result.current.isLoadingFile).toBe(false);
      });
    });

    describe("closeFileViewer", () => {
      it("should close viewer and reset state", async () => {
        const mockContent = "Test content";
        mockReadTextFile.mockResolvedValue(ok({ content: mockContent } as any));

        const { result } = renderHook(() => useFileViewer(mockServerId));

        // First open a file
        await act(async () => {
          await result.current.openFileViewer(mockTextFile, "/");
        });

        // Start editing
        act(() => {
          result.current.startEdit();
          result.current.setEditedContent("Modified content");
        });

        // Close viewer
        act(() => {
          result.current.closeFileViewer();
        });

        expect(result.current.showFileViewer).toBe(false);
        expect(result.current.selectedFile).toBe(null);
        expect(result.current.fileContent).toBe("");
        expect(result.current.editedContent).toBe("");
        expect(result.current.isEditing).toBe(false);
        expect(result.current.isSaving).toBe(false);
      });

      it("should revoke image URL when closing", async () => {
        const mockBlob = new Blob(["image data"], { type: "image/png" });
        mockDownloadFile.mockResolvedValue(ok(mockBlob));

        const { result } = renderHook(() => useFileViewer(mockServerId));

        // Open image file
        await act(async () => {
          await result.current.openFileViewer(mockImageFile, "/");
        });

        expect(result.current.imageUrl).toBe("blob:mock-url");

        // Close viewer
        act(() => {
          result.current.closeFileViewer();
        });

        expect(result.current.imageUrl).toBe("");
      });
    });

    describe("saveFile", () => {
      it("should save file successfully", async () => {
        const mockContent = "Original content";
        mockReadTextFile.mockResolvedValue(ok({ content: mockContent } as any));
        mockWriteFile.mockResolvedValue(
          ok(undefined as any)
        );

        const { result } = renderHook(() => useFileViewer(mockServerId));

        // Open file and start editing
        await act(async () => {
          await result.current.openFileViewer(mockTextFile, "/config");
        });

        act(() => {
          result.current.startEdit();
          result.current.setEditedContent("Modified content");
        });

        // Save file
        let saveResult: any;
        await act(async () => {
          saveResult = await result.current.saveFile("/config");
        });

        expect(saveResult.isOk()).toBe(true);
        expect(result.current.fileContent).toBe("Modified content");
        expect(result.current.isEditing).toBe(false);
        expect(result.current.editedContent).toBe("");
        expect(result.current.isSaving).toBe(false);

        expect(mockWriteFile).toHaveBeenCalledWith(
          mockServerId,
          "/config/config.txt",
          {
            content: "Modified content",
            encoding: "utf-8",
            create_backup: true,
          }
        );
      });

      it("should save file in root directory", async () => {
        const mockContent = "Original content";
        mockReadTextFile.mockResolvedValue(ok({ content: mockContent } as any));
        mockWriteFile.mockResolvedValue(
          ok(undefined as any)
        );

        const { result } = renderHook(() => useFileViewer(mockServerId));

        // Open file and start editing
        await act(async () => {
          await result.current.openFileViewer(mockTextFile, "/");
        });

        act(() => {
          result.current.startEdit();
          result.current.setEditedContent("Modified content");
        });

        // Save file
        await act(async () => {
          await result.current.saveFile("/");
        });

        expect(mockWriteFile).toHaveBeenCalledWith(
          mockServerId,
          "config.txt",
          expect.objectContaining({
            content: "Modified content",
          })
        );
      });

      it("should handle save error", async () => {
        const mockContent = "Original content";
        mockReadTextFile.mockResolvedValue(ok({ content: mockContent } as any));
        const errorMessage = "Permission denied";
        mockWriteFile.mockResolvedValue(
          err({ status: 403, message: errorMessage, details: "Access denied" })
        );

        const { result } = renderHook(() => useFileViewer(mockServerId));

        // Open file and start editing
        await act(async () => {
          await result.current.openFileViewer(mockTextFile, "/config");
        });

        act(() => {
          result.current.startEdit();
          result.current.setEditedContent("Modified content");
        });

        // Save file
        let saveResult: any;
        await act(async () => {
          saveResult = await result.current.saveFile("/config");
        });

        expect(saveResult.isErr()).toBe(true);
        if (saveResult.isErr()) {
          expect(saveResult.error).toBe(errorMessage);
        }
        expect(result.current.isSaving).toBe(false);
      });

      it("should handle unexpected save error", async () => {
        const mockContent = "Original content";
        mockReadTextFile.mockResolvedValue(ok({ content: mockContent } as any));
        mockWriteFile.mockImplementation(() => {
          throw new Error("Network error");
        });

        const { result } = renderHook(() => useFileViewer(mockServerId));

        // Open file and start editing
        await act(async () => {
          await result.current.openFileViewer(mockTextFile, "/config");
        });

        act(() => {
          result.current.startEdit();
          result.current.setEditedContent("Modified content");
        });

        // Save file
        let saveResult: any;
        await act(async () => {
          saveResult = await result.current.saveFile("/config");
        });

        expect(saveResult.isErr()).toBe(true);
        if (saveResult.isErr()) {
          expect(saveResult.error).toBe("Network error");
        }
      });

      it("should reject save when no file is selected", async () => {
        const { result } = renderHook(() => useFileViewer(mockServerId));

        let saveResult: any;
        await act(async () => {
          saveResult = await result.current.saveFile("/config");
        });

        expect(saveResult.isErr()).toBe(true);
        if (saveResult.isErr()) {
          expect(saveResult.error).toBe(
            "No file selected or not in editing mode"
          );
        }
      });

      it("should reject save when not in editing mode", async () => {
        const mockContent = "Original content";
        mockReadTextFile.mockResolvedValue(ok({ content: mockContent } as any));

        const { result } = renderHook(() => useFileViewer(mockServerId));

        // Open file but don't start editing
        await act(async () => {
          await result.current.openFileViewer(mockTextFile, "/config");
        });

        let saveResult: any;
        await act(async () => {
          saveResult = await result.current.saveFile("/config");
        });

        expect(saveResult.isErr()).toBe(true);
        if (saveResult.isErr()) {
          expect(saveResult.error).toBe(
            "No file selected or not in editing mode"
          );
        }
      });
    });

    describe("downloadCurrentFile", () => {
      it("should download file successfully", async () => {
        const mockBlob = new Blob(["file content"], { type: "text/plain" });
        mockDownloadFile.mockResolvedValue(ok(mockBlob));
        mockReadTextFile.mockResolvedValue(ok({ content: "File content" } as any));

        const { result } = renderHook(() => useFileViewer(mockServerId));

        // Open file first
        await act(async () => {
          await result.current.openFileViewer(mockTextFile, "/downloads");
        });

        // Download file
        let downloadResult: any;
        await act(async () => {
          downloadResult =
            await result.current.downloadCurrentFile("/downloads");
        });

        expect(downloadResult.isOk()).toBe(true);
        expect(mockDownloadFile).toHaveBeenCalledWith(
          mockServerId,
          "/downloads/config.txt"
        );
      });

      it("should download file from root directory", async () => {
        const mockBlob = new Blob(["file content"], { type: "text/plain" });
        mockDownloadFile.mockResolvedValue(ok(mockBlob));
        mockReadTextFile.mockResolvedValue(ok({ content: "File content" } as any));

        const { result } = renderHook(() => useFileViewer(mockServerId));

        // Open file first
        await act(async () => {
          await result.current.openFileViewer(mockTextFile, "/");
        });

        // Download file
        await act(async () => {
          await result.current.downloadCurrentFile("/");
        });

        expect(mockDownloadFile).toHaveBeenCalledWith(
          mockServerId,
          "config.txt"
        );
      });

      it("should handle download error", async () => {
        const errorMessage = "Download failed";
        mockDownloadFile.mockResolvedValue(
          err({ status: 500, message: errorMessage, details: "Server error" })
        );
        mockReadTextFile.mockResolvedValue(ok({ content: "File content" } as any));

        const { result } = renderHook(() => useFileViewer(mockServerId));

        // Open file first
        await act(async () => {
          await result.current.openFileViewer(mockTextFile, "/downloads");
        });

        // Download file
        let downloadResult: any;
        await act(async () => {
          downloadResult =
            await result.current.downloadCurrentFile("/downloads");
        });

        expect(downloadResult.isErr()).toBe(true);
        if (downloadResult.isErr()) {
          expect(downloadResult.error).toBe(errorMessage);
        }
      });

      it("should reject download when no file is selected", async () => {
        const { result } = renderHook(() => useFileViewer(mockServerId));

        let downloadResult: any;
        await act(async () => {
          downloadResult =
            await result.current.downloadCurrentFile("/downloads");
        });

        expect(downloadResult.isErr()).toBe(true);
        if (downloadResult.isErr()) {
          expect(downloadResult.error).toBe("No file selected");
        }
      });
    });

    describe("Integration Tests", () => {
      it("should handle complete workflow: open -> edit -> save -> close", async () => {
        const mockContent = "Original content";
        mockReadTextFile.mockResolvedValue(ok({ content: mockContent } as any));
        mockWriteFile.mockResolvedValue(
          ok(undefined as any)
        );

        const { result } = renderHook(() => useFileViewer(mockServerId));

        // Open file
        await act(async () => {
          await result.current.openFileViewer(mockTextFile, "/config");
        });

        expect(result.current.showFileViewer).toBe(true);
        expect(result.current.fileContent).toBe(mockContent);

        // Start editing
        act(() => {
          result.current.startEdit();
        });

        expect(result.current.isEditing).toBe(true);
        expect(result.current.editedContent).toBe(mockContent);

        // Modify content
        act(() => {
          result.current.setEditedContent("Modified content");
        });

        expect(result.current.editedContent).toBe("Modified content");

        // Save file
        let saveResult: any;
        await act(async () => {
          saveResult = await result.current.saveFile("/config");
        });

        expect(saveResult.isOk()).toBe(true);
        expect(result.current.fileContent).toBe("Modified content");
        expect(result.current.isEditing).toBe(false);

        // Close viewer
        act(() => {
          result.current.closeFileViewer();
        });

        expect(result.current.showFileViewer).toBe(false);
        expect(result.current.selectedFile).toBe(null);
      });
    });
  });
});
