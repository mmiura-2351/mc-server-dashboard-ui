import { renderHook, act } from "@testing-library/react";
import { vi } from "vitest";
import { ok, err } from "neverthrow";
import { useFileUpload } from "./useFileUpload";
import * as fileService from "@/services/files";
import { FileUploadSecurity } from "@/utils/file-upload-security";

// Mock dependencies
vi.mock("@/services/files", () => ({
  uploadMultipleFiles: vi.fn(),
  uploadFolderStructure: vi.fn(),
}));

vi.mock("@/utils/file-upload-security", () => ({
  FileUploadSecurity: {
    securityFilter: vi.fn(),
  },
  DEFAULT_UPLOAD_CONFIG: {
    maxFileSize: 10 * 1024 * 1024,
    maxTotalSize: 100 * 1024 * 1024,
    maxFiles: 10,
    blockDangerousExtensions: true,
  },
}));

// Helper function to create mock File objects
const createMockFile = (
  name: string,
  size: number = 1000,
  type: string = "text/plain"
): File => {
  const file = new File(["content"], name, { type });
  // Override the size property to match our test expectations
  Object.defineProperty(file, "size", { value: size, writable: false });
  return file;
};

// Helper function to create mock drag event
const createMockDragEvent = (files: File[] = []) => {
  const items = files.map((file) => ({
    webkitGetAsEntry: vi.fn(() => ({
      isFile: true,
      isDirectory: false,
      file: vi.fn((callback: (file: File) => void) => {
        // Preserve webkitRelativePath when processing files
        const processedFile = file;
        callback(processedFile);
      }),
    })),
  }));

  return {
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    currentTarget: {
      getBoundingClientRect: vi.fn(() => ({
        left: 0,
        right: 100,
        top: 0,
        bottom: 100,
      })),
    },
    clientX: 50,
    clientY: 50,
    dataTransfer: {
      items,
    },
  } as unknown as React.DragEvent;
};

describe("useFileUpload", () => {
  const mockServerId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(FileUploadSecurity.securityFilter).mockResolvedValue({
      allowed: [],
      blocked: [],
      warnings: [],
    });
    vi.mocked(fileService.uploadMultipleFiles).mockResolvedValue(
      ok({
        successful: [],
        failed: [],
      })
    );
    vi.mocked(fileService.uploadFolderStructure).mockResolvedValue(
      ok({
        successful: [],
        failed: [],
      })
    );
  });

  describe("Initial State", () => {
    it("should initialize with correct default state", () => {
      const { result } = renderHook(() => useFileUpload(mockServerId));

      expect(result.current.uploadState).toEqual({
        isUploading: false,
        progress: [],
        completed: [],
        failed: [],
      });
      expect(result.current.showUploadModal).toBe(false);
      expect(result.current.isDragOver).toBe(false);
    });
  });

  describe("Upload State Management", () => {
    it("should reset upload state", () => {
      const { result } = renderHook(() => useFileUpload(mockServerId));

      // First set some state
      act(() => {
        result.current.setShowUploadModal(true);
      });

      expect(result.current.showUploadModal).toBe(true);

      // Reset state
      act(() => {
        result.current.resetUploadState();
      });

      expect(result.current.uploadState).toEqual({
        isUploading: false,
        progress: [],
        completed: [],
        failed: [],
      });
    });

    it("should toggle upload modal visibility", () => {
      const { result } = renderHook(() => useFileUpload(mockServerId));

      act(() => {
        result.current.setShowUploadModal(true);
      });

      expect(result.current.showUploadModal).toBe(true);

      act(() => {
        result.current.setShowUploadModal(false);
      });

      expect(result.current.showUploadModal).toBe(false);
    });
  });

  describe("File Upload - Security Filtering", () => {
    it("should handle empty file array", async () => {
      const { result } = renderHook(() => useFileUpload(mockServerId));

      const uploadResult = await act(async () => {
        return result.current.handleFileUpload([], false, "/");
      });

      expect(uploadResult).toEqual({
        success: false,
        warnings: [],
        blocked: [],
      });
    });

    it("should filter out blocked files", async () => {
      const { result } = renderHook(() => useFileUpload(mockServerId));
      const testFiles = [createMockFile("malicious.exe")];

      vi.mocked(FileUploadSecurity.securityFilter).mockResolvedValue({
        allowed: [],
        blocked: [{ file: testFiles[0]!, reason: "Dangerous file type" }],
        warnings: [],
      });

      const uploadResult = await act(async () => {
        return result.current.handleFileUpload(testFiles, false, "/");
      });

      expect(uploadResult).toEqual({
        success: false,
        error: "No files allowed",
        warnings: [],
        blocked: [{ file: testFiles[0]!, reason: "Dangerous file type" }],
      });
    });

    it("should process allowed files", async () => {
      const { result } = renderHook(() => useFileUpload(mockServerId));
      const testFiles = [createMockFile("test.txt")];

      vi.mocked(FileUploadSecurity.securityFilter).mockResolvedValue({
        allowed: testFiles,
        blocked: [],
        warnings: [],
      });

      vi.mocked(fileService.uploadMultipleFiles).mockResolvedValue(
        ok({
          successful: ["test.txt"],
          failed: [],
        })
      );

      const uploadResult = await act(async () => {
        return result.current.handleFileUpload(testFiles, false, "/");
      });

      expect(FileUploadSecurity.securityFilter).toHaveBeenCalledWith(
        testFiles,
        expect.objectContaining({
          maxFileSize: 100 * 1024 * 1024,
          maxTotalSize: 500 * 1024 * 1024,
          maxFiles: 50,
          blockDangerousExtensions: false,
        })
      );

      expect(uploadResult.success).toBe(true);
      expect(uploadResult.successful).toEqual(["test.txt"]);
    });
  });

  describe("File Upload - Single Files", () => {
    beforeEach(() => {
      const testFiles = [createMockFile("test.txt")];
      vi.mocked(FileUploadSecurity.securityFilter).mockResolvedValue({
        allowed: testFiles,
        blocked: [],
        warnings: [],
      });
    });

    it("should upload single files successfully", async () => {
      const { result } = renderHook(() => useFileUpload(mockServerId));
      const testFiles = [createMockFile("test.txt")];

      vi.mocked(fileService.uploadMultipleFiles).mockResolvedValue(
        ok({
          successful: ["test.txt"],
          failed: [],
        })
      );

      const uploadResult = await act(async () => {
        return result.current.handleFileUpload(testFiles, false, "/path");
      });

      expect(fileService.uploadMultipleFiles).toHaveBeenCalledWith(
        mockServerId,
        "/path",
        testFiles,
        expect.any(Function)
      );

      expect(uploadResult).toEqual({
        success: true,
        successful: ["test.txt"],
        failed: [],
        warnings: [],
        blocked: [],
      });

      expect(result.current.uploadState.isUploading).toBe(false);
      expect(result.current.uploadState.completed).toEqual(["test.txt"]);
      expect(result.current.showUploadModal).toBe(true);
    });

    it("should handle upload service errors", async () => {
      const { result } = renderHook(() => useFileUpload(mockServerId));
      const testFiles = [createMockFile("test.txt")];

      vi.mocked(fileService.uploadMultipleFiles).mockResolvedValue(
        err({ message: "Upload failed" })
      );

      const uploadResult = await act(async () => {
        return result.current.handleFileUpload(testFiles, false, "/");
      });

      expect(uploadResult).toEqual({
        success: false,
        error: "Upload failed",
        warnings: [],
        blocked: [],
      });

      expect(result.current.uploadState.isUploading).toBe(false);
      expect(result.current.uploadState.failed).toEqual([
        { file: "Upload process", error: "Upload failed" },
      ]);
    });

    it("should handle unexpected errors", async () => {
      const { result } = renderHook(() => useFileUpload(mockServerId));
      const testFiles = [createMockFile("test.txt")];

      vi.mocked(fileService.uploadMultipleFiles).mockRejectedValue(
        new Error("Network error")
      );

      const uploadResult = await act(async () => {
        return result.current.handleFileUpload(testFiles, false, "/");
      });

      expect(uploadResult).toEqual({
        success: false,
        error: "Network error",
        warnings: [],
        blocked: [],
      });

      expect(result.current.uploadState.failed).toEqual([
        { file: "Upload process", error: "Network error" },
      ]);
    });
  });

  describe("File Upload - Folder Structure", () => {
    beforeEach(() => {
      const testFiles = [createMockFile("folder/test.txt")];
      vi.mocked(FileUploadSecurity.securityFilter).mockResolvedValue({
        allowed: testFiles,
        blocked: [],
        warnings: [],
      });
    });

    it("should upload folder structure successfully", async () => {
      const { result } = renderHook(() => useFileUpload(mockServerId));
      const testFiles = [createMockFile("folder/test.txt")];

      vi.mocked(fileService.uploadFolderStructure).mockResolvedValue(
        ok({
          successful: ["folder/test.txt"],
          failed: [],
        })
      );

      const uploadResult = await act(async () => {
        return result.current.handleFileUpload(testFiles, true, "/");
      });

      expect(fileService.uploadFolderStructure).toHaveBeenCalledWith(
        mockServerId,
        "/",
        testFiles,
        expect.any(Function)
      );

      expect(uploadResult.success).toBe(true);
      expect(uploadResult.successful).toEqual(["folder/test.txt"]);
    });

    it("should handle folder upload errors", async () => {
      const { result } = renderHook(() => useFileUpload(mockServerId));
      const testFiles = [createMockFile("folder/test.txt")];

      vi.mocked(fileService.uploadFolderStructure).mockResolvedValue(
        err({ message: "Folder upload failed" })
      );

      const uploadResult = await act(async () => {
        return result.current.handleFileUpload(testFiles, true, "/");
      });

      expect(uploadResult).toEqual({
        success: false,
        error: "Folder upload failed",
        warnings: [],
        blocked: [],
      });
    });
  });

  describe("Upload Progress", () => {
    it("should initialize progress state for files", async () => {
      const { result } = renderHook(() => useFileUpload(mockServerId));
      const testFiles = [
        createMockFile("file1.txt", 1000),
        createMockFile("file2.txt", 2000),
      ];

      vi.mocked(FileUploadSecurity.securityFilter).mockResolvedValue({
        allowed: testFiles,
        blocked: [],
        warnings: [],
      });

      vi.mocked(fileService.uploadMultipleFiles).mockResolvedValue(
        ok({
          successful: ["file1.txt", "file2.txt"],
          failed: [],
        })
      );

      await act(async () => {
        result.current.handleFileUpload(testFiles, false, "/");
      });

      expect(result.current.uploadState.progress).toHaveLength(2);
      expect(result.current.uploadState.progress[0]).toEqual({
        filename: "file1.txt",
        percentage: 0,
        loaded: 0,
        total: 1000,
      });
      expect(result.current.uploadState.progress[1]).toEqual({
        filename: "file2.txt",
        percentage: 0,
        loaded: 0,
        total: 2000,
      });
    });

    it("should handle progress updates during upload", async () => {
      const { result } = renderHook(() => useFileUpload(mockServerId));
      const testFiles = [createMockFile("test.txt", 1000)];

      vi.mocked(FileUploadSecurity.securityFilter).mockResolvedValue({
        allowed: testFiles,
        blocked: [],
        warnings: [],
      });

      // Mock upload with progress callback
      vi.mocked(fileService.uploadMultipleFiles).mockImplementation(
        async (serverId, path, files, progressCallback) => {
          // Simulate progress updates
          if (progressCallback) {
            progressCallback({
              filename: "test.txt",
              percentage: 50,
              loaded: 500,
              total: 1000,
            });
          }
          return ok({ successful: ["test.txt"], failed: [] });
        }
      );

      await act(async () => {
        result.current.handleFileUpload(testFiles, false, "/");
      });

      // Progress should be updated
      expect(result.current.uploadState.progress[0]).toEqual({
        filename: "test.txt",
        percentage: 50,
        loaded: 500,
        total: 1000,
      });
    });
  });

  describe("Drag and Drop", () => {
    it("should set drag over state on drag enter", () => {
      const { result } = renderHook(() => useFileUpload(mockServerId));
      const mockEvent = createMockDragEvent();

      act(() => {
        result.current.handleDragEnter(mockEvent);
      });

      expect(result.current.isDragOver).toBe(true);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it("should clear drag over state on drag leave (when leaving container)", () => {
      const { result } = renderHook(() => useFileUpload(mockServerId));

      // First set drag over
      act(() => {
        result.current.handleDragEnter(createMockDragEvent());
      });
      expect(result.current.isDragOver).toBe(true);

      // Create drag leave event outside container bounds
      const mockEvent = createMockDragEvent();
      mockEvent.clientX = 150; // Outside container (right: 100)
      mockEvent.clientY = 150; // Outside container (bottom: 100)

      act(() => {
        result.current.handleDragLeave(mockEvent);
      });

      expect(result.current.isDragOver).toBe(false);
    });

    it("should not clear drag over state when drag leave is within container", () => {
      const { result } = renderHook(() => useFileUpload(mockServerId));

      // First set drag over
      act(() => {
        result.current.handleDragEnter(createMockDragEvent());
      });
      expect(result.current.isDragOver).toBe(true);

      // Create drag leave event inside container bounds
      const mockEvent = createMockDragEvent();
      mockEvent.clientX = 50; // Inside container
      mockEvent.clientY = 50; // Inside container

      act(() => {
        result.current.handleDragLeave(mockEvent);
      });

      expect(result.current.isDragOver).toBe(true);
    });

    it("should handle drag over events", () => {
      const { result } = renderHook(() => useFileUpload(mockServerId));
      const mockEvent = createMockDragEvent();

      act(() => {
        result.current.handleDragOver(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it("should process dropped files", async () => {
      const { result } = renderHook(() => useFileUpload(mockServerId));
      const testFiles = [createMockFile("dropped.txt")];
      const mockEvent = createMockDragEvent(testFiles);

      const mockOnFileUpload = vi.fn();

      await act(async () => {
        await result.current.handleDrop(mockEvent, "/", mockOnFileUpload);
      });

      expect(result.current.isDragOver).toBe(false);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(mockOnFileUpload).toHaveBeenCalledWith(testFiles, false);
    });

    it("should handle drag drop without errors", async () => {
      const { result } = renderHook(() => useFileUpload(mockServerId));

      // Simplified test to ensure drag over state is cleared
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        currentTarget: {
          getBoundingClientRect: vi.fn(() => ({
            left: 0,
            right: 100,
            top: 0,
            bottom: 100,
          })),
        },
        clientX: 50,
        clientY: 50,
        dataTransfer: {
          items: [],
        },
      } as unknown as React.DragEvent;

      // Set drag over state first
      act(() => {
        result.current.handleDragEnter(mockEvent);
      });
      expect(result.current.isDragOver).toBe(true);

      // Drop should clear drag over state
      await act(async () => {
        await result.current.handleDrop(mockEvent, "/");
      });

      expect(result.current.isDragOver).toBe(false);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it("should handle drop without callback", async () => {
      const { result } = renderHook(() => useFileUpload(mockServerId));
      const testFiles = [createMockFile("test.txt")];
      const mockEvent = createMockDragEvent(testFiles);

      vi.mocked(FileUploadSecurity.securityFilter).mockResolvedValue({
        allowed: testFiles,
        blocked: [],
        warnings: [],
      });

      vi.mocked(fileService.uploadMultipleFiles).mockResolvedValue(
        ok({
          successful: ["test.txt"],
          failed: [],
        })
      );

      await act(async () => {
        await result.current.handleDrop(mockEvent, "/");
      });

      expect(fileService.uploadMultipleFiles).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle files with webkitRelativePath for folder uploads", async () => {
      const { result } = renderHook(() => useFileUpload(mockServerId));

      const folderFile = createMockFile("test.txt");
      Object.defineProperty(folderFile, "webkitRelativePath", {
        value: "folder/subfolder/test.txt",
        writable: false,
      });

      vi.mocked(FileUploadSecurity.securityFilter).mockResolvedValue({
        allowed: [folderFile],
        blocked: [],
        warnings: [],
      });

      vi.mocked(fileService.uploadFolderStructure).mockResolvedValue(
        ok({
          successful: ["folder/subfolder/test.txt"],
          failed: [],
        })
      );

      await act(async () => {
        result.current.handleFileUpload([folderFile], true, "/");
      });

      expect(result.current.uploadState.progress[0]?.filename).toBe(
        "folder/subfolder/test.txt"
      );
    });

    it("should handle non-Error exceptions", async () => {
      const { result } = renderHook(() => useFileUpload(mockServerId));
      const testFiles = [createMockFile("test.txt")];

      vi.mocked(FileUploadSecurity.securityFilter).mockResolvedValue({
        allowed: testFiles,
        blocked: [],
        warnings: [],
      });

      vi.mocked(fileService.uploadMultipleFiles).mockRejectedValue(
        "String error"
      );

      const uploadResult = await act(async () => {
        return result.current.handleFileUpload(testFiles, false, "/");
      });

      expect(uploadResult.error).toBe("Unknown error");
    });

    it("should handle partial upload success", async () => {
      const { result } = renderHook(() => useFileUpload(mockServerId));
      const testFiles = [
        createMockFile("test1.txt"),
        createMockFile("test2.txt"),
      ];

      vi.mocked(FileUploadSecurity.securityFilter).mockResolvedValue({
        allowed: testFiles,
        blocked: [],
        warnings: [],
      });

      vi.mocked(fileService.uploadMultipleFiles).mockResolvedValue(
        ok({
          successful: ["test1.txt"],
          failed: [{ file: "test2.txt", error: "Upload failed" }],
        })
      );

      const uploadResult = await act(async () => {
        return result.current.handleFileUpload(testFiles, false, "/");
      });

      expect(uploadResult.success).toBe(true);
      expect(uploadResult.successful).toEqual(["test1.txt"]);
      expect(uploadResult.failed).toEqual([
        { file: "test2.txt", error: "Upload failed" },
      ]);
      expect(result.current.uploadState.completed).toEqual(["test1.txt"]);
      expect(result.current.uploadState.failed).toEqual([
        { file: "test2.txt", error: "Upload failed" },
      ]);
    });
  });
});
