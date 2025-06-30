import { renderHook, act } from "@testing-library/react";
import { vi } from "vitest";
import { useFileOperations } from "./useFileOperations";
import type { FileSystemItem } from "@/types/files";

// Mock file service
vi.mock("@/services/files", () => ({
  renameFile: vi.fn(),
  deleteFile: vi.fn(),
  downloadFile: vi.fn(),
  downloadAsZip: vi.fn(),
}));

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
});
