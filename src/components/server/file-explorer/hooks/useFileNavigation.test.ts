import { renderHook, act } from "@testing-library/react";
import { useFileNavigation } from "./useFileNavigation";
import type { FileSystemItem } from "@/types/files";

describe("useFileNavigation", () => {
  describe("Initialization", () => {
    it("should initialize with default path", () => {
      const { result } = renderHook(() => useFileNavigation());

      expect(result.current.currentPath).toBe("/");
      expect(result.current.files).toEqual([]);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBe(null);
    });

    it("should initialize with custom path", () => {
      const initialPath = "/custom/path";
      const { result } = renderHook(() => useFileNavigation(initialPath));

      expect(result.current.currentPath).toBe(initialPath);
    });
  });

  describe("Navigation Functions", () => {
    it("should update current path with navigateToPath", () => {
      const { result } = renderHook(() => useFileNavigation());
      const newPath = "/new/path";

      act(() => {
        result.current.navigateToPath(newPath);
      });

      expect(result.current.currentPath).toBe(newPath);
    });

    it("should navigate up from nested path", () => {
      const { result } = renderHook(() =>
        useFileNavigation("/folder/subfolder")
      );

      act(() => {
        result.current.navigateUp();
      });

      expect(result.current.currentPath).toBe("/folder");
    });

    it("should not navigate up from root path", () => {
      const { result } = renderHook(() => useFileNavigation("/"));

      act(() => {
        result.current.navigateUp();
      });

      expect(result.current.currentPath).toBe("/");
    });

    it("should navigate to directory", () => {
      const { result } = renderHook(() => useFileNavigation("/"));
      const directory: FileSystemItem = {
        name: "test-folder",
        type: "directory",
        is_directory: true,
        size: null,
        modified: "2023-01-01T00:00:00Z",
        permissions: {},
        path: "/test-folder",
      };

      act(() => {
        result.current.navigateToFile(directory);
      });

      expect(result.current.currentPath).toBe("/test-folder");
    });

    it("should not navigate to regular file", () => {
      const { result } = renderHook(() => useFileNavigation("/"));
      const file: FileSystemItem = {
        name: "test.txt",
        type: "text",
        is_directory: false,
        size: 100,
        modified: "2023-01-01T00:00:00Z",
        permissions: {},
        path: "/test.txt",
      };

      act(() => {
        result.current.navigateToFile(file);
      });

      expect(result.current.currentPath).toBe("/"); // Should not change
    });
  });

  describe("State Management", () => {
    it("should allow setting files", () => {
      const { result } = renderHook(() => useFileNavigation());
      const files: FileSystemItem[] = [
        {
          name: "file1.txt",
          type: "text",
          is_directory: false,
          size: 100,
          modified: "2023-01-01T00:00:00Z",
          permissions: {},
          path: "/file1.txt",
        },
      ];

      act(() => {
        result.current.setFiles(files);
      });

      expect(result.current.files).toEqual(files);
    });

    it("should allow setting loading state", () => {
      const { result } = renderHook(() => useFileNavigation());

      act(() => {
        result.current.setIsLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("should allow setting error state", () => {
      const { result } = renderHook(() => useFileNavigation());
      const error = "Failed to load files";

      act(() => {
        result.current.setError(error);
      });

      expect(result.current.error).toBe(error);
    });
  });
});
