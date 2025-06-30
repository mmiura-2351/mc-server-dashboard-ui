import { renderHook } from "@testing-library/react";
import { vi } from "vitest";
import { useStableTranslation } from "./useStableTranslation";

// Mock language context
const mockT = vi.fn((key: string, params?: Record<string, string>) => {
  const translations: Record<string, string> = {
    "files.successfullyDownloaded": "Successfully downloaded {name}",
    "files.downloadFailed": "Failed to download {name}",
    "files.successfullyRenamed": "Successfully renamed",
    "files.renameFailed": "Failed to rename",
    "files.successfullyDeleted": "Successfully deleted {name}",
    "files.deleteFailed": "Failed to delete {name}",
    "files.deleteFile": "Delete File",
    "files.deleteFileConfirmation": "Are you sure you want to delete {name}?",
    "files.deleteFiles": "Delete Files",
    "files.deleteBulkConfirmation":
      "Are you sure you want to delete {count} files?",
    "files.successfullyDeletedMultiple": "Successfully deleted {count} files",
    "files.deletedPartialSuccess":
      "Deleted {successCount} files, failed to delete {failCount}",
    "files.bulkDownloadNotImplemented": "Bulk download not implemented",
    "files.securityWarning": "Security warning",
    "files.blockedFilesMessage": "Some files were blocked",
    "files.uploadError": "Upload error",
    "files.noFilesAllowed": "No files allowed",
  };

  let translation = translations[key] || key;
  if (params) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      translation = translation.replace(`{${paramKey}}`, paramValue);
    });
  }
  return translation;
});

vi.mock("@/contexts/language", () => ({
  useTranslation: () => ({ t: mockT }),
}));

describe("useStableTranslation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Translation Functions", () => {
    it("should provide downloadSuccess translation", () => {
      const { result } = renderHook(() => useStableTranslation());
      const fileName = "test.txt";

      const translation = result.current.downloadSuccess(fileName);

      expect(translation).toBe(`Successfully downloaded ${fileName}`);
      expect(mockT).toHaveBeenCalledWith("files.successfullyDownloaded", {
        name: fileName,
      });
    });

    it("should provide downloadFailed translation", () => {
      const { result } = renderHook(() => useStableTranslation());
      const fileName = "test.txt";

      const translation = result.current.downloadFailed(fileName);

      expect(translation).toBe(`Failed to download ${fileName}`);
      expect(mockT).toHaveBeenCalledWith("files.downloadFailed", {
        name: fileName,
      });
    });

    it("should provide renameSuccess translation", () => {
      const { result } = renderHook(() => useStableTranslation());

      const translation = result.current.renameSuccess();

      expect(translation).toBe("Successfully renamed");
      expect(mockT).toHaveBeenCalledWith("files.successfullyRenamed");
    });

    it("should provide renameFailed translation", () => {
      const { result } = renderHook(() => useStableTranslation());

      const translation = result.current.renameFailed();

      expect(translation).toBe("Failed to rename");
      expect(mockT).toHaveBeenCalledWith("files.renameFailed");
    });

    it("should provide deleteSuccess translation", () => {
      const { result } = renderHook(() => useStableTranslation());
      const fileName = "test.txt";

      const translation = result.current.deleteSuccess(fileName);

      expect(translation).toBe(`Successfully deleted ${fileName}`);
      expect(mockT).toHaveBeenCalledWith("files.successfullyDeleted", {
        name: fileName,
      });
    });
  });

  describe("Memoization", () => {
    it("should maintain stable function references across re-renders", () => {
      const { result, rerender } = renderHook(() => useStableTranslation());

      const firstRender = {
        downloadSuccess: result.current.downloadSuccess,
        downloadFailed: result.current.downloadFailed,
        renameSuccess: result.current.renameSuccess,
      };

      rerender();

      expect(result.current.downloadSuccess).toBe(firstRender.downloadSuccess);
      expect(result.current.downloadFailed).toBe(firstRender.downloadFailed);
      expect(result.current.renameSuccess).toBe(firstRender.renameSuccess);
    });

    it("should only recreate functions when t function changes", () => {
      const { result, rerender } = renderHook(() => useStableTranslation());

      const firstTranslations = result.current;

      rerender();

      expect(result.current).toBe(firstTranslations);
    });
  });

  describe("Parameter Handling", () => {
    it("should handle multiple parameters", () => {
      const { result } = renderHook(() => useStableTranslation());
      const successCount = "3";
      const failCount = "2";

      const translation = result.current.deletePartialSuccess(
        successCount,
        failCount
      );

      expect(translation).toBe(
        `Deleted ${successCount} files, failed to delete ${failCount}`
      );
      expect(mockT).toHaveBeenCalledWith("files.deletedPartialSuccess", {
        successCount,
        failCount,
      });
    });

    it("should handle empty string parameters", () => {
      const { result } = renderHook(() => useStableTranslation());

      const translation = result.current.downloadSuccess("");

      expect(translation).toBe("Successfully downloaded ");
      expect(mockT).toHaveBeenCalledWith("files.successfullyDownloaded", {
        name: "",
      });
    });
  });
});
