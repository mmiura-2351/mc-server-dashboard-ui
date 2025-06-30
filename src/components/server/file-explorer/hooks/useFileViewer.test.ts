import { renderHook, act } from "@testing-library/react";
import { vi } from "vitest";
import { useFileViewer } from "./useFileViewer";

// Mock file service
vi.mock("@/services/files", () => ({
  readFileContent: vi.fn(),
  uploadFile: vi.fn(),
  downloadFile: vi.fn(),
}));

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
});
